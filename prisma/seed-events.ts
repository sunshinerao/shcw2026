// Standalone script to seed events from data-events.json
// Run against local:  npx tsx prisma/seed-events.ts
// Run against cloud:  DATABASE_URL="postgresql://..." npx tsx prisma/seed-events.ts
import { PrismaClient } from "@prisma/client";
import events from "./data-events.json";

const prisma = new PrismaClient();

async function main() {
  let created = 0;
  let skipped = 0;

  for (const e of events) {
    const existing = await prisma.event.findFirst({
      where: { title: e.title },
    });

    if (existing) {
      console.log(`⏭️  已存在: ${e.title}`);
      skipped++;
      continue;
    }

    await prisma.event.create({
      data: {
        title: e.title,
        titleEn: e.titleEn || null,
        description: e.description,
        descriptionEn: e.descriptionEn || null,
        shortDesc: e.shortDesc || null,
        shortDescEn: e.shortDescEn || null,
        startDate: new Date(e.startDate),
        endDate: e.endDate ? new Date(e.endDate) : new Date(e.startDate),
        startTime: e.startTime,
        endTime: e.endTime,
        venue: e.venue,
        venueEn: e.venueEn || null,
        address: e.address || null,
        city: e.city || "Shanghai",
        cityEn: e.cityEn || "Shanghai",
        type: e.type,
        eventLayer: (e.eventLayer as any) || null,
        hostType: (e.hostType as any) || null,
        maxAttendees: e.maxAttendees || null,
        isPublished: e.isPublished ?? false,
        isFeatured: e.isFeatured ?? false,
        partners: e.partners || [],
        partnersEn: e.partnersEn || [],
      },
    });
    console.log(`✅ ${e.title}`);
    created++;
  }

  console.log(`\n完成：新建 ${created} 个活动，跳过 ${skipped} 个已存在`);
}

main()
  .catch((err) => {
    console.error("❌ 导入失败:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
