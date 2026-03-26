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

  // ======= 新闻示例数据 =======
  const newsItems = [
    {
      title: "上海气候周2026正式启动，共建可持续未来",
      titleEn: "Shanghai Climate Week 2026 Officially Launched to Build a Sustainable Future",
      slug: "shcw2026-launch",
      excerpt: "上海气候周2026于今日正式启动，汇聚全球气候领袖、企业家和政策制定者,共同探讨气候行动方案。",
      excerptEn: "Shanghai Climate Week 2026 officially launched today, bringing together global climate leaders, entrepreneurs, and policymakers to jointly explore climate action solutions.",
      content: "上海气候周2026于今日正式启动。本届气候周将汇聚全球气候领袖、企业家和政策制定者，以\"系统变革·加速行动\"为主题，聚焦绿色金融、循环经济、气候科技等领域。\n\n活动将涵盖主论坛、平行分论坛、展览展示和互动体验等多种形式，预计吸引超过5000名参与者，来自50多个国家和地区。\n\n气候周期间将发布多项重要报告和倡议，推动全球气候治理合作。",
      contentEn: "Shanghai Climate Week 2026 officially launched today. This year's Climate Week brings together global climate leaders, entrepreneurs, and policymakers under the theme of 'Systemic Change · Accelerated Action,' focusing on green finance, circular economy, climate technology, and more.\n\nThe event will cover various formats including main forums, parallel sessions, exhibitions, and interactive experiences, expected to attract over 5,000 participants from more than 50 countries and regions.\n\nSeveral important reports and initiatives will be released during Climate Week to promote global climate governance cooperation.",
      isPublished: true,
      publishedAt: new Date("2026-03-15"),
      views: 256,
    },
    {
      title: "全球气候领袖圆桌会议将在上海气候周举行",
      titleEn: "Global Climate Leaders Roundtable to be Held at SHCW2026",
      slug: "global-climate-leaders-roundtable",
      excerpt: "来自全球20多个国家的气候政策制定者将出席圆桌会议，探讨跨国气候合作新路径。",
      excerptEn: "Climate policymakers from over 20 countries will attend the roundtable to explore new paths for transnational climate cooperation.",
      content: "来自全球20多个国家的气候政策制定者将齐聚上海，出席全球气候领袖圆桌会议。本次圆桌会议将围绕碳市场联通、气候融资和技术转让等核心议题展开深入讨论。\n\n会议旨在推动建立更加紧密的国际气候合作机制，为全球气候治理贡献\"上海方案\"。",
      contentEn: "Climate policymakers from over 20 countries will gather in Shanghai to attend the Global Climate Leaders Roundtable. The roundtable will focus on core issues such as carbon market connectivity, climate finance, and technology transfer.\n\nThe meeting aims to promote the establishment of closer international climate cooperation mechanisms and contribute a 'Shanghai Solution' to global climate governance.",
      isPublished: true,
      publishedAt: new Date("2026-03-10"),
      views: 189,
    },
    {
      title: "气候科技创新展区亮点抢先看",
      titleEn: "Preview: Highlights of Climate Tech Innovation Exhibition",
      slug: "climate-tech-innovation-preview",
      excerpt: "超过100家气候科技企业将在上海气候周展示最新技术和解决方案，涵盖碳捕集、绿色氢能、智慧能源等领域。",
      excerptEn: "Over 100 climate tech companies will showcase their latest technologies and solutions at SHCW2026, covering carbon capture, green hydrogen, smart energy, and more.",
      content: "本届上海气候周将设立专门的气候科技创新展区，汇聚超过100家企业展示最新的气候解决方案。\n\n展区将分为碳捕集与利用、绿色氢能、智慧能源管理、可持续交通和循环经济五大板块。多项全球首发技术将在展区亮相。\n\n此外，展区还将举办\"气候科技路演\"活动，为初创企业提供与投资人对接的平台。",
      contentEn: "This year's Shanghai Climate Week will feature a dedicated Climate Tech Innovation Exhibition Zone, bringing together over 100 companies to showcase the latest climate solutions.\n\nThe exhibition will be divided into five major sections: Carbon Capture and Utilization, Green Hydrogen, Smart Energy Management, Sustainable Transportation, and Circular Economy. Multiple world-premiere technologies will debut at the exhibition.\n\nAdditionally, the zone will host 'Climate Tech Demo Day' events, providing a platform for startups to connect with investors.",
      isPublished: true,
      publishedAt: new Date("2026-03-05"),
      views: 142,
    },
  ];

  for (const item of newsItems) {
    const existing = await prisma.news.findUnique({ where: { slug: item.slug } });
    if (!existing) {
      await prisma.news.create({ data: item });
    }
  }
  console.log("✅ 新闻示例数据已创建:", newsItems.length, "条");

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
