import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { put } from "@vercel/blob";

type SavePosterFileInput = {
  jobId: string;
  preset: string;
  format: "png" | "pdf" | "svg";
  contentType: string;
  data: Uint8Array | Buffer | string;
};

function extByFormat(format: "png" | "pdf" | "svg") {
  if (format === "png") return "png";
  if (format === "pdf") return "pdf";
  return "svg";
}

export async function savePosterFile(input: SavePosterFileInput) {
  const ext = extByFormat(input.format);
  const fileName = `poster-${input.jobId}-${input.preset}.${ext}`;
  const blobPath = `posters/${fileName}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const blob = await put(blobPath, input.data, {
      access: "public",
      contentType: input.contentType,
      token: process.env.BLOB_READ_WRITE_TOKEN,
      addRandomSuffix: false,
    });
    return { url: blob.url, storage: "blob" as const };
  }

  const publicDir = path.join(process.cwd(), "public", "generated", "posters");
  await mkdir(publicDir, { recursive: true });
  const localPath = path.join(publicDir, fileName);
  if (typeof input.data === "string") {
    await writeFile(localPath, input.data, "utf-8");
  } else {
    await writeFile(localPath, Buffer.from(input.data));
  }

  return { url: `/generated/posters/${fileName}`, storage: "local" as const };
}
