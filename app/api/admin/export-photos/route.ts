import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import {
  isAdminRole,
  canManageSpecialPassApplications,
  canManageSpeakers,
} from "@/lib/permissions";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ── CRC-32 ─────────────────────────────────────────────────────────────────
const CRC32_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? (0xedb88320 ^ (c >>> 1)) : c >>> 1;
    }
    t[i] = c >>> 0;
  }
  return t;
})();

function crc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = (CRC32_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)) >>> 0;
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ── ZIP builder (STORE, no compression — images are already compressed) ────
function buildZip(entries: Array<{ name: string; data: Buffer }>): Buffer {
  const now = new Date();
  const dosTime =
    ((now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2)) & 0xffff;
  const dosDate =
    ((((now.getFullYear() - 1980) & 0x7f) << 9) |
      ((now.getMonth() + 1) << 5) |
      now.getDate()) &
    0xffff;

  const localParts: Buffer[] = [];
  const cdParts: Buffer[] = [];
  const offsets: number[] = [];
  const crcs: number[] = [];
  let pos = 0;

  for (const entry of entries) {
    const nameBytes = Buffer.from(entry.name, "utf-8");
    const dataCrc = crc32(entry.data);
    const size = entry.data.length;
    crcs.push(dataCrc);
    offsets.push(pos);

    const lh = Buffer.alloc(30 + nameBytes.length);
    lh.writeUInt32LE(0x04034b50, 0); // local file header sig
    lh.writeUInt16LE(20, 4);          // version needed
    lh.writeUInt16LE(0x0800, 6);      // flag: UTF-8 filename
    lh.writeUInt16LE(0, 8);           // compression: STORE
    lh.writeUInt16LE(dosTime, 10);
    lh.writeUInt16LE(dosDate, 12);
    lh.writeUInt32LE(dataCrc, 14);
    lh.writeUInt32LE(size, 18);
    lh.writeUInt32LE(size, 22);
    lh.writeUInt16LE(nameBytes.length, 26);
    lh.writeUInt16LE(0, 28);
    nameBytes.copy(lh, 30);

    localParts.push(lh, entry.data);
    pos += lh.length + size;
  }

  const cdStart = pos;

  for (let i = 0; i < entries.length; i++) {
    const nameBytes = Buffer.from(entries[i].name, "utf-8");
    const size = entries[i].data.length;
    const cd = Buffer.alloc(46 + nameBytes.length);
    cd.writeUInt32LE(0x02014b50, 0);
    cd.writeUInt16LE(20, 4);
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(dosTime, 12);
    cd.writeUInt16LE(dosDate, 14);
    cd.writeUInt32LE(crcs[i], 16);
    cd.writeUInt32LE(size, 20);
    cd.writeUInt32LE(size, 24);
    cd.writeUInt16LE(nameBytes.length, 28);
    cd.writeUInt16LE(0, 30);
    cd.writeUInt16LE(0, 32);
    cd.writeUInt16LE(0, 34);
    cd.writeUInt16LE(0, 36);
    cd.writeUInt32LE(0, 38);
    cd.writeUInt32LE(offsets[i], 42);
    nameBytes.copy(cd, 46);
    cdParts.push(cd);
  }

  const centralDir = Buffer.concat(cdParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(centralDir.length, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDir, eocd]);
}

// ── Helpers ────────────────────────────────────────────────────────────────
function sanitize(s: string): string {
  return s.replace(/[/\\:*?"<>|\x00-\x1f]/g, "_").replace(/\s+/g, "_").trim() || "unknown";
}

function getExt(dataUrl: string): string {
  const m = /^data:image\/(\w+);base64,/.exec(dataUrl);
  if (!m) return "jpg";
  const raw = m[1].toLowerCase();
  return raw === "jpeg" ? "jpg" : raw;
}

function dataUrlToBuffer(dataUrl: string): Buffer | null {
  const idx = dataUrl.indexOf(",");
  if (idx < 0) return null;
  const b64 = dataUrl.slice(idx + 1).replace(/\s+/g, "");
  if (!b64) return null;
  try {
    return Buffer.from(b64, "base64");
  } catch {
    return null;
  }
}

function makeUniqueNameFn(): (name: string) => string {
  const seen = new Map<string, number>();
  return (name: string) => {
    const count = seen.get(name) ?? 0;
    seen.set(name, count + 1);
    if (count === 0) return name;
    const dot = name.lastIndexOf(".");
    return dot >= 0
      ? `${name.slice(0, dot)}_${count + 1}${name.slice(dot)}`
      : `${name}_${count + 1}`;
  };
}

// ── GET /api/admin/export-photos?type=special-pass|speakers|partners ───────
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") ?? "special-pass";
  const statusParam = searchParams.get("status") ?? "";

  const entries: Array<{ name: string; data: Buffer }> = [];
  const uniqueName = makeUniqueNameFn();
  let zipBaseName = "photos";

  // ── special-pass ──────────────────────────────────────────────────────────
  if (type === "special-pass") {
    if (!canManageSpecialPassApplications(user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const validStatuses = ["PENDING", "APPROVED", "REJECTED"] as const;
    type ValidStatus = (typeof validStatuses)[number];
    const where =
      validStatuses.includes(statusParam as ValidStatus)
        ? { status: statusParam as ValidStatus }
        : undefined;

    const passes = await prisma.specialPass.findMany({
      where,
      select: {
        name: true,
        entryType: true,
        docType: true,
        docPhoto: true,
        docPhotoBack: true,
        photo: true,
      },
      orderBy: { createdAt: "asc" },
    });

    for (const pass of passes) {
      const safeName = sanitize(pass.name);
      const docLabel = sanitize(
        pass.entryType === "DOMESTIC" ? "居民身份证" : (pass.docType ?? "护照")
      );

      if (pass.docPhoto) {
        const buf = dataUrlToBuffer(pass.docPhoto);
        if (buf) {
          entries.push({
            name: uniqueName(`${safeName}-${docLabel}-正面.${getExt(pass.docPhoto)}`),
            data: buf,
          });
        }
      }
      if (pass.docPhotoBack) {
        const buf = dataUrlToBuffer(pass.docPhotoBack);
        if (buf) {
          entries.push({
            name: uniqueName(`${safeName}-${docLabel}-反面.${getExt(pass.docPhotoBack)}`),
            data: buf,
          });
        }
      }
      if (pass.photo) {
        const buf = dataUrlToBuffer(pass.photo);
        if (buf) {
          entries.push({
            name: uniqueName(`${safeName}-近期免冠照.${getExt(pass.photo)}`),
            data: buf,
          });
        }
      }
    }

    zipBaseName = statusParam
      ? `special-pass-photos-${statusParam.toLowerCase()}`
      : "special-pass-photos";

  // ── speakers ──────────────────────────────────────────────────────────────
  } else if (type === "speakers") {
    if (!canManageSpeakers(user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const speakers = await prisma.speaker.findMany({
      where: { avatar: { not: null } },
      select: { name: true, nameEn: true, avatar: true },
      orderBy: { order: "asc" },
    });

    for (const s of speakers) {
      if (!s.avatar) continue;
      const buf = dataUrlToBuffer(s.avatar);
      if (!buf) continue;
      const dispName = sanitize(s.nameEn || s.name);
      entries.push({
        name: uniqueName(`${dispName}-头像.${getExt(s.avatar)}`),
        data: buf,
      });
    }

    zipBaseName = "speaker-avatars";

  // ── partners ──────────────────────────────────────────────────────────────
  } else if (type === "partners") {
    if (!isAdminRole(user.role)) {
      return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
    }

    const sponsors = await prisma.sponsor.findMany({
      select: { name: true, nameEn: true, logo: true, tier: true },
      orderBy: [{ tier: "asc" }, { order: "asc" }],
    });

    for (const s of sponsors) {
      if (!s.logo) continue;
      const buf = dataUrlToBuffer(s.logo);
      if (!buf) continue;
      const dispName = sanitize(s.name || s.nameEn || "partner");
      const tier = sanitize(s.tier);
      entries.push({
        name: uniqueName(`${tier}-${dispName}-logo.${getExt(s.logo)}`),
        data: buf,
      });
    }

    zipBaseName = "partner-logos";
  } else {
    return NextResponse.json(
      { success: false, error: "Invalid type. Use: special-pass | speakers | partners" },
      { status: 400 }
    );
  }

  if (entries.length === 0) {
    return NextResponse.json({ success: false, error: "No photos found" }, { status: 404 });
  }

  const zip = buildZip(entries);
  const filename = `${zipBaseName}-${new Date().toISOString().slice(0, 10)}.zip`;

  return new NextResponse(new Uint8Array(zip), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(zip.length),
    },
  });
}
