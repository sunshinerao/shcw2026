// Standalone script to seed 10 sample news articles
// Run against local:  npx tsx prisma/seed-news.ts
// Run against cloud:  DATABASE_URL="postgresql://..." npx tsx prisma/seed-news.ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const newsItems = [
    {
      title: "上海气候周2026正式启动，共建可持续未来",
      titleEn: "Shanghai Climate Week 2026 Officially Launched",
      slug: "shcw2026-launch",
      excerpt: "上海气候周2026于今日正式启动，汇聚全球气候领袖、企业家和政策制定者，共同探讨气候行动方案。",
      excerptEn: "SHCW2026 officially launched today, bringing together global climate leaders, entrepreneurs, and policymakers.",
      content: "上海气候周2026于今日正式启动。本届气候周将汇聚全球气候领袖、企业家和政策制定者，以\"系统变革·加速行动\"为主题，聚焦绿色金融、循环经济、气候科技等领域。\n\n活动将涵盖主论坛、平行分论坛、展览展示和互动体验等多种形式，预计吸引超过5000名参与者，来自50多个国家和地区。\n\n气候周期间将发布多项重要报告和倡议，推动全球气候治理合作。",
      contentEn: "Shanghai Climate Week 2026 officially launched today. This year's Climate Week brings together global climate leaders, entrepreneurs, and policymakers under the theme of 'Systemic Change · Accelerated Action,' focusing on green finance, circular economy, climate technology, and more.\n\nThe event will cover various formats including main forums, parallel sessions, exhibitions, and interactive experiences, expected to attract over 5,000 participants from more than 50 countries and regions.",
      isPublished: true,
      publishedAt: new Date("2026-03-20"),
      views: 328,
    },
    {
      title: "全球气候领袖圆桌会议亮点前瞻",
      titleEn: "Global Climate Leaders Roundtable Preview",
      slug: "global-climate-leaders-roundtable",
      excerpt: "来自全球20多个国家的气候政策制定者将出席圆桌会议，探讨跨国气候合作新路径。",
      excerptEn: "Climate policymakers from over 20 countries will attend the roundtable to explore new paths for transnational climate cooperation.",
      content: "来自全球20多个国家的气候政策制定者将齐聚上海，出席全球气候领袖圆桌会议。本次圆桌会议将围绕碳市场联通、气候融资和技术转让等核心议题展开深入讨论。\n\n会议旨在推动建立更加紧密的国际气候合作机制，为全球气候治理贡献\"上海方案\"。",
      contentEn: "Climate policymakers from over 20 countries will gather in Shanghai to attend the Global Climate Leaders Roundtable. The roundtable will focus on core issues such as carbon market connectivity, climate finance, and technology transfer.\n\nThe meeting aims to promote the establishment of closer international climate cooperation mechanisms.",
      isPublished: true,
      publishedAt: new Date("2026-03-18"),
      views: 215,
    },
    {
      title: "气候科技创新展区亮点抢先看",
      titleEn: "Climate Tech Innovation Exhibition Highlights",
      slug: "climate-tech-innovation-preview",
      excerpt: "超过100家气候科技企业将展示最新技术和解决方案，涵盖碳捕集、绿色氢能、智慧能源等领域。",
      excerptEn: "Over 100 climate tech companies will showcase latest technologies covering carbon capture, green hydrogen, and smart energy.",
      content: "本届上海气候周将设立专门的气候科技创新展区，汇聚超过100家企业展示最新的气候解决方案。\n\n展区将分为碳捕集与利用、绿色氢能、智慧能源管理、可持续交通和循环经济五大板块。多项全球首发技术将在展区亮相。\n\n此外，展区还将举办\"气候科技路演\"活动，为初创企业提供与投资人对接的平台。",
      contentEn: "This year's SHCW will feature a dedicated Climate Tech Innovation Exhibition Zone with over 100 companies.\n\nThe exhibition covers Carbon Capture, Green Hydrogen, Smart Energy Management, Sustainable Transportation, and Circular Economy. Multiple world-premiere technologies will debut at the exhibition.",
      isPublished: true,
      publishedAt: new Date("2026-03-16"),
      views: 187,
    },
    {
      title: "绿色金融论坛：碳市场与ESG投资趋势",
      titleEn: "Green Finance Forum: Carbon Markets & ESG Investment Trends",
      slug: "green-finance-forum-carbon-esg",
      excerpt: "金融领袖将聚焦碳市场发展与ESG投资新趋势，探讨绿色金融在推动气候行动中的关键作用。",
      excerptEn: "Financial leaders will focus on carbon market development and new ESG investment trends.",
      content: "上海气候周绿色金融论坛将邀请全球顶级金融机构高管、碳市场专家及ESG投资先锋共同探讨可持续金融的未来方向。\n\n论坛将重点讨论碳市场全球化联通机制、碳信用标准化、ESG信息披露最佳实践，以及绿色债券和可持续贷款的创新模式。\n\n与会者将分享在气候转型中获利与减碳双赢的实际案例。",
      contentEn: "The SHCW Green Finance Forum brings together top financial institution executives, carbon market experts, and ESG investment pioneers to discuss the future of sustainable finance.\n\nKey topics include global carbon market connectivity, carbon credit standardization, ESG disclosure best practices, and innovative green bond and sustainable loan models.",
      isPublished: true,
      publishedAt: new Date("2026-03-14"),
      views: 156,
    },
    {
      title: "循环经济赛道：从废弃物到新资源的变革之路",
      titleEn: "Circular Economy Track: From Waste to New Resources",
      slug: "circular-economy-transformation",
      excerpt: "循环经济赛道将展示全球领先的废弃物资源化利用案例和创新技术。",
      excerptEn: "The Circular Economy track will showcase world-leading waste-to-resource cases and innovative technologies.",
      content: "循环经济是应对资源危机和气候变化的关键路径。本届气候周的循环经济赛道将围绕\"设计为循环\"理念，展示从产品设计、材料选择到回收再利用的全生命周期解决方案。\n\n来自欧洲、亚洲和北美的企业将分享在塑料回收、电子废弃物处理、建筑材料循环利用等领域的创新实践。\n\n赛道还将发布《亚太地区循环经济发展报告2026》。",
      contentEn: "Circular economy is a key pathway to address resource crises and climate change. This track at SHCW focuses on the 'Design for Circularity' concept, showcasing full life-cycle solutions from product design to recycling.\n\nCompanies from Europe, Asia, and North America will share innovative practices in plastics recycling, e-waste processing, and construction material reuse.",
      isPublished: true,
      publishedAt: new Date("2026-03-12"),
      views: 134,
    },
    {
      title: "U20青年气候领袖峰会开放报名",
      titleEn: "U20 Youth Climate Leaders Summit Open for Registration",
      slug: "u20-youth-summit-registration",
      excerpt: "面向全球20岁以下的青年气候行动者，U20青年峰会现已开放报名，名额有限。",
      excerptEn: "Open to climate activists under 20 worldwide, U20 Youth Summit registration is now open with limited spots.",
      content: "上海气候周U20青年气候领袖峰会正式开放报名！本次峰会面向全球20岁以下的青年气候行动者，提供一个展示创新项目、交流经验、连接资源的国际平台。\n\n峰会将设置青年气候方案路演、跨代对话、技能工作坊等环节。优秀方案将获得种子资金和导师支持。\n\n报名截止日期为2026年4月15日，名额仅限200人。",
      contentEn: "The SHCW U20 Youth Climate Leaders Summit is now open for registration! This summit provides a platform for global climate activists under 20 to showcase innovative projects, exchange experiences, and connect with resources.\n\nActivities include youth climate solution demos, intergenerational dialogues, and skill workshops. Outstanding solutions will receive seed funding and mentorship.",
      isPublished: true,
      publishedAt: new Date("2026-03-10"),
      views: 298,
    },
    {
      title: "数字产品护照(DPP)创新论坛议程公布",
      titleEn: "Digital Product Passport Innovation Forum Agenda Released",
      slug: "dpp-innovation-forum-agenda",
      excerpt: "DPP创新论坛将探讨数字产品护照在供应链透明度和可持续消费中的应用前景。",
      excerptEn: "The DPP Innovation Forum will explore digital product passports for supply chain transparency and sustainable consumption.",
      content: "上海气候周DPP创新论坛议程正式公布。该论坛将邀请欧盟数字产品护照政策制定者、全球品牌供应链负责人和技术服务商共同探讨DPP的最新发展。\n\n议程亮点包括：欧盟电池法规DPP实施案例分享、区块链技术在产品溯源中的应用、中国制造业DPP试点项目进展，以及消费者端DPP应用的用户体验创新。\n\n论坛还将现场演示多个DPP技术平台的功能。",
      contentEn: "The SHCW DPP Innovation Forum agenda is now released. The forum brings together EU DPP policymakers, global brand supply chain leaders, and technology providers.\n\nHighlights include EU Battery Regulation DPP case studies, blockchain technology for product traceability, China manufacturing DPP pilot progress, and consumer-facing DPP UX innovation.",
      isPublished: true,
      publishedAt: new Date("2026-03-08"),
      views: 167,
    },
    {
      title: "智慧水务赛道：水资源管理的数字化革命",
      titleEn: "Smart Water Track: Digital Revolution in Water Management",
      slug: "smart-water-digital-revolution",
      excerpt: "智慧水务赛道聚焦AI和物联网在水资源管理领域的前沿应用。",
      excerptEn: "The Smart Water track focuses on cutting-edge AI and IoT applications in water resource management.",
      content: "水资源短缺是全球面临的重大挑战之一。上海气候周的智慧水务赛道将展示如何利用人工智能、物联网和大数据技术实现水资源的智慧管理。\n\n参展企业将演示智能灌溉系统、城市管网泄漏检测平台、水质实时监测方案等创新产品。\n\n赛道特别设立\"水创新挑战赛\"环节，面向全球征集水资源领域的创新解决方案。",
      contentEn: "Water scarcity is one of the world's most pressing challenges. The Smart Water track at SHCW showcases how AI, IoT, and big data technologies enable intelligent water resource management.\n\nExhibitors will demonstrate smart irrigation systems, urban pipe network leak detection, and real-time water quality monitoring solutions.",
      isPublished: true,
      publishedAt: new Date("2026-03-06"),
      views: 124,
    },
    {
      title: "首批战略合作伙伴名单公布",
      titleEn: "First Batch of Strategic Partners Announced",
      slug: "strategic-partners-announced",
      excerpt: "上海气候周2026首批战略合作伙伴名单公布，涵盖能源、科技、金融等领域的全球领军企业。",
      excerptEn: "First batch of SHCW2026 strategic partners announced, covering leading global enterprises in energy, tech, and finance.",
      content: "上海气候周2026组委会正式公布首批战略合作伙伴名单。合作伙伴包括来自能源、科技、金融和消费品行业的全球领军企业。\n\n首批合作伙伴将参与气候周的主论坛赞助、展览展示、主题对话等核心环节，并在各自行业领域发起气候行动倡议。\n\n组委会表示，第二批合作伙伴招募正在进行中，欢迎更多企业加入气候行动联盟。",
      contentEn: "The SHCW2026 Organizing Committee officially announces the first batch of strategic partners, including leading global enterprises from energy, technology, finance, and consumer goods industries.\n\nPartners will participate in main forum sponsorship, exhibitions, themed dialogues, and will launch climate action initiatives in their respective industries.",
      isPublished: true,
      publishedAt: new Date("2026-03-04"),
      views: 201,
    },
    {
      title: "志愿者招募启动：成为气候行动的一份子",
      titleEn: "Volunteer Recruitment Launched: Be Part of Climate Action",
      slug: "volunteer-recruitment-2026",
      excerpt: "上海气候周2026志愿者招募正式启动，诚邀热心气候行动的各界人士加入我们的团队。",
      excerptEn: "SHCW2026 volunteer recruitment is now open. We invite climate enthusiasts from all backgrounds to join our team.",
      content: "上海气候周2026志愿者招募正式启动！我们正在寻找充满热情、关心气候变化的志愿者，在以下岗位为气候周贡献力量：\n\n会务支持：协助论坛和活动的组织与运营\n嘉宾接待：负责国内外嘉宾的引导和服务\n翻译支持：提供中英文口译或笔译协助\n媒体宣传：协助社交媒体内容创作和现场报道\n展览引导：在展览区域提供参观引导服务\n\n志愿者将获得气候周通行证、专属纪念品，以及与全球气候领袖面对面交流的机会。报名截止至2026年4月30日。",
      contentEn: "SHCW2026 volunteer recruitment is officially open! We're looking for passionate climate-minded volunteers for:\n\nEvent Support: Help organize forums and activities\nGuest Reception: Guide and serve domestic and international guests\nTranslation Support: Provide Chinese-English interpretation or translation\nMedia & PR: Assist with social media content and on-site coverage\nExhibition Guides: Provide visitor guidance in exhibition areas\n\nVolunteers will receive a Climate Week pass, exclusive memorabilia, and the opportunity to interact with global climate leaders.",
      isPublished: true,
      publishedAt: new Date("2026-03-01"),
      views: 445,
    },
  ];

  let created = 0;
  let skipped = 0;
  for (const item of newsItems) {
    const existing = await prisma.news.findUnique({ where: { slug: item.slug } });
    if (!existing) {
      await prisma.news.create({ data: item });
      console.log(`  ✅ ${item.slug}`);
      created++;
    } else {
      console.log(`  ⏩ 已存在: ${item.slug}`);
      skipped++;
    }
  }
  console.log(`\n📊 完成: ${created} 条新建, ${skipped} 条已存在, 共 ${newsItems.length} 条`);
}

main()
  .catch((e) => {
    console.error("❌ 新闻种子数据失败:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
