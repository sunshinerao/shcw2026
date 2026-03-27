// Standalone script to seed speakers from data-speakers.json
// Run against local:  npx tsx prisma/seed-speakers.ts
// Run against cloud:  DATABASE_URL="postgresql://..." npx tsx prisma/seed-speakers.ts
import { PrismaClient } from "@prisma/client";
import speakers from "./data-speakers.json";

type SpeakerSeedRecord = {
  name: string;
  nameEn?: string;
  title: string;
  titleEn?: string;
  organization: string;
  organizationEn?: string;
  organizationLogo?: string;
  bio?: string;
  bioEn?: string;
  email?: string;
  linkedin?: string;
  twitter?: string;
  website?: string;
  avatar?: string;
  isKeynote?: boolean;
  order?: number;
};

const prisma = new PrismaClient();
const speakerSeedData = speakers as SpeakerSeedRecord[];

async function main() {
  let created = 0;
  let skipped = 0;

  for (const s of speakerSeedData) {
    const existing = await prisma.speaker.findFirst({
      where: { name: s.name },
    });

    if (existing) {
      console.log(`⏭️  已存在: ${s.name}`);
      skipped++;
      continue;
    }

    await prisma.speaker.create({
      data: {
        name: s.name,
        nameEn: s.nameEn || null,
        title: s.title,
        titleEn: s.titleEn || null,
        organization: s.organization,
        organizationEn: s.organizationEn || null,
        organizationLogo: s.organizationLogo || null,
        bio: s.bio || null,
        bioEn: s.bioEn || null,
        email: s.email || null,
        linkedin: s.linkedin || null,
        twitter: s.twitter || null,
        website: s.website || null,
        avatar: s.avatar || null,
        isKeynote: Boolean(s.isKeynote),
        order: typeof s.order === "number" ? s.order : 0,
      },
    });

    console.log(`✅ ${s.name}`);
    created++;
  }

  console.log(`\n完成：新建 ${created} 位嘉宾，跳过 ${skipped} 位已存在`);
}

main()
  .catch((err) => {
    console.error("❌ 导入失败:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
