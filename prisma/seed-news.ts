// Standalone script to seed sample news data
// Run: npx tsx prisma/seed-news.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
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

  let created = 0;
  for (const item of newsItems) {
    const existing = await prisma.news.findUnique({ where: { slug: item.slug } });
    if (!existing) {
      await prisma.news.create({ data: item });
      created++;
    } else {
      console.log(`  ⏩ 跳过已存在: ${item.slug}`);
    }
  }
  console.log(`✅ 新闻数据: ${created} 条新建, ${newsItems.length - created} 条已存在`);
}

main()
  .catch((e) => {
    console.error("❌ 新闻种子数据失败:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
