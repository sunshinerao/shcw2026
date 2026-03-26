import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { featuredEvents, eventPartnersEn, eventSummariesEn, eventVenuesEn } from "../lib/data/events";
import { tracks as trackSeedData } from "../lib/data/tracks";

const prisma = new PrismaClient();

const eventTrackCodeMap: Record<string, string> = {
  "1": "05",
  "2": "13",
  "3": "09",
  "4": "05",
  "5": "04",
  "6": "12",
  "7": "08",
  "8": "06",
  "9": "06",
  "10": "09",
  "11": "12",
  "12": "01",
  "13": "06",
  "14": "01",
  "15": "06",
  "16": "13",
  "17": "04",
  "18": "04",
  "19": "06",
  "20": "05",
  "21": "13",
  "22": "09",
  "23": "06",
};

// 生成气候护照ID
function generateClimatePassportId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "SCW2026-";
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// 生成通行证代码
function generatePassCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "SCW";
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  console.log("开始填充种子数据...");

  // 创建管理员用户
  const adminPassword = await bcrypt.hash("admin123", 12);
  const adminPassportId = generateClimatePassportId();
  const adminPassCode = generatePassCode();
  const admin = await prisma.user.upsert({
    where: { email: "admin@shcw2026.org" },
    update: {
      password: adminPassword,
      name: "管理员",
      role: "ADMIN",
      status: "ACTIVE",
      climatePassportId: adminPassportId,
      passCode: adminPassCode,
    },
    create: {
      email: "admin@shcw2026.org",
      password: adminPassword,
      name: "管理员",
      role: "ADMIN",
      status: "ACTIVE",
      climatePassportId: adminPassportId,
      passCode: adminPassCode,
    },
  });
  console.log("✅ 管理员用户已创建:", admin.email, "护照ID:", admin.climatePassportId);

  // 创建测试用户
  const userPassword = await bcrypt.hash("user12345", 12);
  const userPassportId = generateClimatePassportId();
  const userPassCode = generatePassCode();
  const user = await prisma.user.upsert({
    where: { email: "user@example.com" },
    update: {
      password: userPassword,
      name: "测试用户",
      role: "ATTENDEE",
      status: "ACTIVE",
      climatePassportId: userPassportId,
      passCode: userPassCode,
    },
    create: {
      email: "user@example.com",
      password: userPassword,
      name: "测试用户",
      role: "ATTENDEE",
      status: "ACTIVE",
      climatePassportId: userPassportId,
      passCode: userPassCode,
    },
  });
  console.log("✅ 测试用户已创建:", user.email, "护照ID:", user.climatePassportId);

  // 创建验证人员测试账号
  const verifierPassword = await bcrypt.hash("verifier123", 12);
  const verifierPassportId = generateClimatePassportId();
  const verifierPassCode = generatePassCode();
  const verifier = await prisma.user.upsert({
    where: { email: "verifier@shcw2026.org" },
    update: {
      password: verifierPassword,
      name: "现场验证员",
      role: "VERIFIER",
      status: "ACTIVE",
      climatePassportId: verifierPassportId,
      passCode: verifierPassCode,
    },
    create: {
      email: "verifier@shcw2026.org",
      password: verifierPassword,
      name: "现场验证员",
      role: "VERIFIER",
      status: "ACTIVE",
      climatePassportId: verifierPassportId,
      passCode: verifierPassCode,
    },
  });
  console.log("✅ 验证人员已创建:", verifier.email, "护照ID:", verifier.climatePassportId);

  // 创建赛道
  const trackIdByCode = new Map<string, string>();

  for (const track of trackSeedData) {
    const existingTrack = await prisma.track.findFirst({
      where: { code: track.code },
      select: { id: true },
    });

    const payload = {
      code: track.code,
      name: track.name,
      nameEn: track.nameEn,
      description: track.description,
      descriptionEn: track.descriptionEn,
      category: track.category,
      color: track.color,
      icon: track.icon,
      partners: track.partners,
      partnersEn: track.partnersEn,
      order: track.id,
    };

    const savedTrack = existingTrack
      ? await prisma.track.update({ where: { id: existingTrack.id }, data: payload })
      : await prisma.track.create({ data: payload });

    trackIdByCode.set(track.code, savedTrack.id);
  }
  console.log("✅ 赛道数据已创建/更新:", trackSeedData.length, "个");

  // 创建活动
  for (const event of featuredEvents) {
    const existingEvent = await prisma.event.findFirst({
      where: { title: event.title },
      select: { id: true },
    });

    const partnersEn = (event.partners || []).map((partner) => eventPartnersEn[partner] ?? partner);
    const payload = {
      title: event.title,
      titleEn: event.titleEn || null,
      description: event.description,
      descriptionEn: eventSummariesEn[event.id] || event.titleEn || null,
      shortDesc: event.shortDesc || null,
      shortDescEn: eventSummariesEn[event.id] || null,
      startDate: new Date(event.startDate),
      endDate: new Date(event.endDate),
      startTime: event.startTime,
      endTime: event.endTime,
      venue: event.venue,
      venueEn: eventVenuesEn[event.id] || event.venue,
      address: event.address || null,
      city: "Shanghai",
      cityEn: "Shanghai",
      image: event.image || null,
      type: event.type,
      trackId: eventTrackCodeMap[event.id] ? trackIdByCode.get(eventTrackCodeMap[event.id]) || null : null,
      partners: event.partners || [],
      partnersEn,
      maxAttendees: event.maxAttendees || null,
      isPublished: event.isPublished,
      isFeatured: event.isFeatured,
    };

    if (existingEvent) {
      await prisma.event.update({ where: { id: existingEvent.id }, data: payload });
    } else {
      await prisma.event.create({ data: payload });
    }
  }
  console.log("✅ 活动数据已创建/更新:", featuredEvents.length, "个");

  // 创建嘉宾
  const speakers = [
    {
      name: "吴昌华",
      nameEn: "Changhua Wu",
      title: "院长",
      titleEn: "Dean",
      organization: "全球气候学院",
      organizationEn: "Global Climate Academy",
      bio: "著名气候政策专家，长期致力于推动中国气候治理与国际合作",
      bioEn: "A renowned climate policy expert focused on advancing climate governance and international cooperation in China.",
      isKeynote: true,
    },
    {
      name: "张庆丰",
      nameEn: "Qingfeng Zhang",
      title: "农业、粮食分局局长",
      titleEn: "Director General, Agriculture, Food, Nature and Rural Development",
      organization: "亚洲开发银行",
      organizationEn: "Asian Development Bank",
      bio: "专注于亚太地区可持续农业与粮食安全研究",
      bioEn: "Focused on sustainable agriculture and food security across the Asia-Pacific region.",
      isKeynote: true,
    },
    {
      name: "Nick Mabey",
      title: "首席执行官",
      titleEn: "Chief Executive Officer",
      organization: "London Climate Action Week",
      organizationEn: "London Climate Action Week",
      bio: "国际气候行动领域的资深专家",
      bioEn: "A veteran expert in international climate action.",
      isKeynote: false,
    },
  ];

  for (const speaker of speakers) {
    await prisma.speaker.create({ data: speaker });
  }
  console.log("✅ 嘉宾数据已创建:", speakers.length, "位");

  // 创建赞助商
  const sponsors = [
    {
      name: "联合国开发计划署",
      nameEn: "United Nations Development Programme",
      logo: "/images/sponsors/undp.png",
      tier: "platinum",
      website: "https://www.undp.org",
      descriptionEn: "Global development organization supporting climate and sustainability initiatives.",
      isActive: true,
    },
    {
      name: "亚洲开发银行",
      nameEn: "Asian Development Bank",
      logo: "/images/sponsors/adb.png",
      tier: "gold",
      website: "https://www.adb.org",
      descriptionEn: "Multilateral development bank supporting sustainable growth across Asia and the Pacific.",
      isActive: true,
    },
    {
      name: "世界自然基金会",
      nameEn: "World Wide Fund for Nature",
      logo: "/images/sponsors/wwf.png",
      tier: "silver",
      website: "https://www.worldwildlife.org",
      descriptionEn: "Global conservation organization working to protect nature and tackle climate change.",
      isActive: true,
    },
  ];

  for (const sponsor of sponsors) {
    await prisma.sponsor.create({ data: sponsor });
  }
  console.log("✅ 赞助商数据已创建:", sponsors.length, "个");

  console.log("\n✨ 种子数据填充完成！");
  console.log("\n登录信息:");
  console.log("管理员: admin@shcw2026.org / admin123");
  console.log("测试用户: user@example.com / user12345");
  console.log("验证人员: verifier@shcw2026.org / verifier123");
}

main()
  .catch((e) => {
    console.error("种子数据填充失败:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
