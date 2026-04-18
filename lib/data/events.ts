export interface Event {
  id: string;
  title: string;
  titleEn?: string;
  description: string;
  descriptionEn?: string;
  shortDesc?: string;
  shortDescEn?: string;
  startDate: string;
  endDate: string;
  startTime: string;
  endTime: string;
  venue: string;
  venueEn?: string;
  address?: string;
  city?: string;
  cityEn?: string;
  image?: string;
  type: "forum" | "workshop" | "ceremony" | "conference" | "networking";
  eventLayer?: string | null;
  hostType?: string | null;
  trackId?: string;
  maxAttendees?: number;
  eventDateSlots?: EventDateSlot[];
  partners?: string[];
  partnersEn?: string[];
  speakerIds?: string[];
  isPublished: boolean;
  isFeatured: boolean;
}

export interface EventDateSlot {
  scheduleDate: string | Date;
  startTime: string;
  endTime: string;
}

export const typeLabels = {
  forum: "主题论坛",
  workshop: "工作坊",
  ceremony: "仪式活动",
  conference: "大型会议",
  networking: "交流酒会",
};

export const eventLayerLabels: Record<string, string> = {
  INSTITUTION: "制度层",
  ECONOMY: "经济层",
  ROOT: "根源层",
  ACCELERATOR: "加速器",
  COMPREHENSIVE: "综合",
};

export const eventLayerLabelsEn: Record<string, string> = {
  INSTITUTION: "Institutional",
  ECONOMY: "Economic",
  ROOT: "Foundational",
  ACCELERATOR: "Accelerator",
  COMPREHENSIVE: "Comprehensive",
};

export const eventHostTypeLabels: Record<string, string> = {
  OFFICIAL: "官方活动",
  CO_HOSTED: "联合主办",
  REGISTERED: "注册活动",
  SIDE_EVENT: "边会活动",
  COMMUNITY: "社区活动",
};

export const eventHostTypeLabelsEn: Record<string, string> = {
  OFFICIAL: "Official",
  CO_HOSTED: "Co-hosted",
  REGISTERED: "Registered",
  SIDE_EVENT: "Side Event",
  COMMUNITY: "Community",
};

export const eventLayerColors: Record<string, string> = {
  INSTITUTION: "bg-indigo-100 text-indigo-700",
  ECONOMY: "bg-teal-100 text-teal-700",
  ROOT: "bg-orange-100 text-orange-700",
  ACCELERATOR: "bg-cyan-100 text-cyan-700",
  COMPREHENSIVE: "bg-violet-100 text-violet-700",
};

export const eventHostTypeColors: Record<string, string> = {
  OFFICIAL: "bg-red-100 text-red-700",
  CO_HOSTED: "bg-sky-100 text-sky-700",
  REGISTERED: "bg-lime-100 text-lime-700",
  SIDE_EVENT: "bg-fuchsia-100 text-fuchsia-700",
  COMMUNITY: "bg-yellow-100 text-yellow-700",
};

export const eventSummariesEn: Record<string, string> = {
  "1": "Circular economy and sustainable fashion in the textile industry",
  "2": "Climate leadership development for young people",
  "3": "Youth climate innovation challenge",
  "4": "Circular economy and digital innovation",
  "5": "Financial innovation for the circular economy",
  "6": "Sustainable trade and global supply chains",
  "7": "Sustainable agriculture and food system transformation",
  "8": "Water security and financial innovation in Asia-Pacific",
  "9": "Water security technology and innovation practices",
  "10": "Climate resilience technology for oceans and islands",
  "11": "Global city climate collaboration network",
  "12": "Grand opening with global climate leaders",
  "13": "TED-style climate talks",
  "14": "Board-level climate governance",
  "15": "Climate-resilient infrastructure",
  "16": "High-level networking dinner",
  "17": "Climate Lighthouse awards ceremony",
  "18": "Sustainable finance and cross-border capital",
  "19": "FAST-Infra framework and applications",
  "20": "Green supply chain transition for SMEs",
  "21": "Showcasing climate competitiveness for brands",
  "22": "Climate tech investment roadshow",
  "23": "Urban climate and health connections",
};

export const eventVenuesEn: Record<string, string> = {
  "1": "Donghua University Campus",
  "2": "HKUST Shanghai Campus",
  "3": "HKUST Shanghai Campus",
  "4": "Shanghai Holiday Hotel",
  "5": "Shanghai Holiday Hotel",
  "6": "Eastern Hub",
  "7": "Hey Barista",
  "8": "Eastern Hub",
  "9": "Cruise Port",
  "10": "Shanghai Jiao Tong University Campus",
  "11": "Eastern Hub",
  "12": "Eastern Hub Conference Hall",
  "13": "Eastern Hub",
  "14": "Eastern Hub",
  "15": "Eastern Hub",
  "16": "TBD",
  "17": "TBD",
  "18": "Eastern Hub",
  "19": "Eastern Hub",
  "20": "Baoshan Venue",
  "21": "Nanda Plaza",
  "22": "Binjiang Smart Plaza",
  "23": "TBD",
};

export const eventPartnersEn: Record<string, string> = {
  "中国纺织工业联合会": "China National Textile and Apparel Council",
  "东华大学": "Donghua University",
  "全球气候学院": "Global Climate Academy",
  "清合循环经济与碳中和研究院": "Circular Economy and Carbon Neutrality Institute",
  "中国ESG联盟": "China ESG Alliance",
  "欧盟驻华代表团": "Delegation of the European Union to China",
  "中国商品进出口商会": "China Chamber of Commerce for Import and Export of Machinery and Electronic Products",
  "世界资源研究所": "World Resources Institute",
  "亚开行": "Asian Development Bank",
  "盒马鲜生": "Hema Fresh",
  "未来食品联盟": "Future Food Alliance",
  "亚太水论坛": "Asia-Pacific Water Forum",
  "上海交通大学": "Shanghai Jiao Tong University",
  "宁远气候与可持续发展研究院": "Ningyuan Institute for Climate and Sustainable Development",
  "UNDP中国": "UNDP China",
  "上海气候周": "Shanghai Climate Week",
  "伦敦气候行动周": "London Climate Action Week",
  "曼谷气候周": "Bangkok Climate Week",
  "浦东新区政府": "Pudong New Area Government",
  "欧盟高级参赞Laurent Bardon": "EU Senior Counsellor Laurent Bardon",
  "宁德时代Robin": "CATL Robin",
  "全球基础设施巴塞尔基金会": "Global Infrastructure Basel Foundation",
  "新开发银行": "New Development Bank",
  "青矩科技": "Qingju Technology",
  "2026合作伙伴": "2026 Partners",
  "地球之友香港": "Friends of the Earth Hong Kong",
  "工信部中国中小企业国际合作协会": "China Association for International Cooperation of SMEs",
  "遨问创投": "Aowen Ventures",
  "罗克韦尔自动化": "Rockwell Automation",
};

export const typeColors = {
  forum: "bg-blue-100 text-blue-700",
  workshop: "bg-green-100 text-green-700",
  ceremony: "bg-amber-100 text-amber-700",
  conference: "bg-purple-100 text-purple-700",
  networking: "bg-pink-100 text-pink-700",
};

export function getEventTypeLabel(type: Event["type"], locale: string): string {
  const englishLabels: Record<Event["type"], string> = {
    forum: "Forum",
    workshop: "Workshop",
    ceremony: "Ceremony",
    conference: "Conference",
    networking: "Networking",
  };

  return locale === "en" ? englishLabels[type] : typeLabels[type];
}

export function getEventLayerLabel(layer: string | null | undefined, locale: string): string {
  if (!layer) return "";
  return locale === "en" ? eventLayerLabelsEn[layer] || layer : eventLayerLabels[layer] || layer;
}

export function getEventHostTypeLabel(hostType: string | null | undefined, locale: string): string {
  if (!hostType) return "";
  return locale === "en" ? eventHostTypeLabelsEn[hostType] || hostType : eventHostTypeLabels[hostType] || hostType;
}

export function getLocalizedEventSummary(event: Event, locale: string): string {
  if (locale === "en") {
    return event.shortDescEn ?? event.descriptionEn ?? eventSummariesEn[event.id] ?? event.shortDesc ?? event.description;
  }

  return event.shortDesc ?? event.description;
}

export function getLocalizedEventVenue(event: Event, locale: string): string {
  return locale === "en" ? event.venueEn ?? eventVenuesEn[event.id] ?? event.venue : event.venue;
}

export function getLocalizedEventPartners(event: Event, locale: string): string[] {
  if (locale !== "en") {
    return event.partners ?? [];
  }

  if (event.partnersEn?.length) {
    return event.partnersEn;
  }

  return (event.partners ?? []).map((partner) => eventPartnersEn[partner] ?? partner);
}

export const featuredEvents: Event[] = [
  // 4月16日 - 预热活动
  {
    id: "1",
    title: "Re:Fashion 循环经济论坛",
    titleEn: "Re:Fashion Circular Economy Forum",
    description: "主题工作组会议（服装与绿色制服、酒店布草定向回收、汽车纺织品）、「太平气候公园」x Re-Fashion 展览、旗舰30品报告发布仪式",
    shortDesc: "纺织行业循环经济与可持续时尚",
    startDate: "2026-04-16",
    endDate: "2026-04-16",
    startTime: "09:00",
    endTime: "17:00",
    venue: "东华大学校区",
    type: "forum",
    partners: ["WWF China", "中国纺织工业联合会", "东华大学", "全球气候学院"],
    isPublished: true,
    isFeatured: false,
  },
  // 4月18日-19日 - U20+年度会议
  {
    id: "2",
    title: "U20+年度会议 Day 1",
    titleEn: "U20+ Annual Meeting Day 1",
    description: "面向10-20岁青少年的气候行动会议，包括Explorer（游戏化任务培养系统思维）、Designer（设计思维与行为科学应用）、Leader（商业/政策系统嵌入解决方案）",
    shortDesc: "青少年气候领袖培养",
    startDate: "2026-04-18",
    endDate: "2026-04-18",
    startTime: "09:00",
    endTime: "17:00",
    venue: "香港科技大学上海校区",
    type: "conference",
    partners: ["全球气候学院", "U20+ Evergreen Action", "UNITAR"],
    isPublished: true,
    isFeatured: false,
  },
  {
    id: "3",
    title: "U20+年度会议 Day 2",
    titleEn: "U20+ Annual Meeting Day 2",
    description: "五大挑战赛道（绿色能源、健康城市、水资源、清洁空气、生态保护），Climate Passport数字平台追踪验证",
    shortDesc: "青少年气候创新挑战",
    startDate: "2026-04-19",
    endDate: "2026-04-19",
    startTime: "09:00",
    endTime: "17:00",
    venue: "香港科技大学上海校区",
    type: "conference",
    partners: ["全球气候学院", "U20+ Evergreen Action", "UNITAR"],
    isPublished: true,
    isFeatured: false,
  },
  // 4月19日 - China Circularity 100
  {
    id: "4",
    title: "China Circularity 100 Day 1",
    titleEn: "China Circularity 100 Day 1",
    description: "数字AI深度赋能（智能材料回收分拣、碳数据管理平台）、材料创新与全球贸易协同、零碳与出海实践指南工作坊",
    shortDesc: "循环经济与数字化创新",
    startDate: "2026-04-19",
    endDate: "2026-04-19",
    startTime: "09:00",
    endTime: "17:00",
    venue: "上海假日酒店",
    type: "forum",
    partners: ["清合循环经济与碳中和研究院", "全球气候学院", "中国ESG联盟"],
    isPublished: true,
    isFeatured: false,
  },
  // 4月20日 - 核心活动日
  {
    id: "5",
    title: "China Circularity 100 Day 2",
    titleEn: "China Circularity 100 Day 2",
    description: "中小企业与金融共生机制（绿色信贷、供应链金融、碳资产抵押）、中国循环经济100创新典范发布",
    shortDesc: "循环经济金融创新",
    startDate: "2026-04-20",
    endDate: "2026-04-20",
    startTime: "09:00",
    endTime: "17:00",
    venue: "上海假日酒店",
    type: "forum",
    partners: ["清合循环经济与碳中和研究院", "全球气候学院", "中国ESG联盟"],
    isPublished: true,
    isFeatured: false,
  },
  {
    id: "6",
    title: "Trade System 3.0 可持续贸易",
    titleEn: "Trade System 3.0: Sustainable Trade",
    description: "中欧政策对话工作坊（WTO Villars 3.0、CBAM、RCEF 3.0）、Verified-DCF/零毁林标准试点、DPP/LCA/水足迹追溯平台、绿色贸易金融与风险定价工具",
    shortDesc: "可持续贸易与全球供应链",
    startDate: "2026-04-20",
    endDate: "2026-04-20",
    startTime: "09:00",
    endTime: "17:00",
    venue: "东方枢纽",
    type: "forum",
    partners: ["欧盟驻华代表团", "WWF China", "中国商品进出口商会", "世界资源研究所"],
    speakerIds: ["32"],
    isPublished: true,
    isFeatured: true,
  },
  {
    id: "7",
    title: "Future Food 未来食物系统",
    titleEn: "Future Food System",
    description: "ADB Food System Transformation Agenda Deep-Dive（张庆丰主讲）、未来农耕-赋能价值链（蔡宏、Chloe Lin、Christina、叶常德主讲）、前行之路-生态系统结盟前行",
    shortDesc: "可持续农业与食物系统转型",
    startDate: "2026-04-20",
    endDate: "2026-04-20",
    startTime: "13:00",
    endTime: "17:30",
    venue: "Hey Barista",
    type: "workshop",
    maxAttendees: 120,
    partners: ["全球气候学院", "亚开行", "盒马鲜生", "Oatly", "ProVeg", "未来食品联盟"],
    speakerIds: ["3", "8", "9"],
    isPublished: true,
    isFeatured: true,
  },
  // 4月21日 - 水安全主题日
  {
    id: "8",
    title: "Water Security 水安全论坛",
    titleEn: "Water Security Forum",
    description: "Innovation for Water Security in Asia and the Pacific，主讲：Shabaz Khan(UNESCO)、张庆丰(ADB)、彭静(中国水科院)、Singapore PUB，《亚洲水发展展望》2025上海发布，金融工具创新专题-气候债券/CBI",
    shortDesc: "亚太水安全与金融创新",
    startDate: "2026-04-21",
    endDate: "2026-04-21",
    startTime: "08:15",
    endTime: "12:30",
    venue: "东方枢纽",
    type: "forum",
    partners: ["亚太水论坛", "UNESCO", "亚开行", "全球气候学院"],
    speakerIds: ["2", "3"],
    isPublished: true,
    isFeatured: true,
  },
  {
    id: "9",
    title: "Water Security 水安全工作坊",
    titleEn: "Water Security Workshop",
    description: "产品创新专题-E20、技术与项目创新专题（循环再生海水淡化）、Climate Resilience Innovation Workshop（海洋与岛屿地区）、Food System Transformation Roundtable",
    shortDesc: "水安全技术与创新实践",
    startDate: "2026-04-21",
    endDate: "2026-04-21",
    startTime: "14:00",
    endTime: "17:00",
    venue: "邮轮港",
    type: "workshop",
    partners: ["UNDP", "亚太水论坛", "UNESCO"],
    speakerIds: ["14", "20", "21"],
    isPublished: true,
    isFeatured: false,
  },
  // 4月22日 - 地球日+盛大开幕
  {
    id: "10",
    title: "Climate Tech 海洋与岛屿气候技术",
    titleEn: "Climate Tech: Ocean and Islands",
    description: "上午：开幕仪式与主题演讲，下午：1.5°C建筑与社区主题工作坊、解决方案路演（气候韧性技术与跨行业应用）、互动气候韧性工作坊",
    shortDesc: "海洋岛屿气候韧性技术",
    startDate: "2026-04-22",
    endDate: "2026-04-22",
    startTime: "09:30",
    endTime: "17:00",
    venue: "上海交通大学校区",
    type: "conference",
    partners: ["上海交通大学", "宁远气候与可持续发展研究院", "UNDP中国"],
    isPublished: true,
    isFeatured: false,
  },
  {
    id: "11",
    title: "Connect+ 城市合作平台",
    titleEn: "Connect+ City Collaboration Platform",
    description: "CONNECT+ 10 Actions发布(2026-2030)、COP31+ 城市准备实验室启动、FAST-Infra 100 城市韧性项目池启动",
    shortDesc: "全球城市气候合作网络",
    startDate: "2026-04-22",
    endDate: "2026-04-22",
    startTime: "09:00",
    endTime: "12:00",
    venue: "东方枢纽",
    type: "forum",
    partners: ["上海气候周", "伦敦气候行动周", "曼谷气候周", "全球气候学院"],
    speakerIds: ["4", "31"],
    isPublished: true,
    isFeatured: false,
  },
  {
    id: "12",
    title: "上海气候周2026 盛大开幕仪式",
    titleEn: "Shanghai Climate Week 2026 Grand Opening",
    description: "主题：东方既白，五五年开局之年。包含「东方黎明」文化序曲、战略主题演讲（决定性十年的架构）、上海气候行动OS 1.0发布、领袖对话（从孤岛到系统）、上海宣言签署、气候公园开幕与招待会",
    shortDesc: "盛大开幕，全球气候领袖齐聚",
    startDate: "2026-04-22",
    endDate: "2026-04-22",
    startTime: "13:00",
    endTime: "19:45",
    venue: "东方枢纽会议厅",
    type: "ceremony",
    maxAttendees: 800,
    partners: ["上海气候周", "浦东新区政府", "欧盟高级参赞Laurent Bardon", "宁德时代Robin"],
    speakerIds: ["1", "12"],
    isPublished: true,
    isFeatured: true,
  },
  {
    id: "13",
    title: "韧性未来 Talk",
    titleEn: "Resilient Future Talk",
    description: "韧性城市、韧性的基础设施、全球碳交易政策和发展趋势、可持续的food体系、创新科学、青年创新责任",
    shortDesc: "TED风格气候主题演讲",
    startDate: "2026-04-22",
    endDate: "2026-04-22",
    startTime: "19:30",
    endTime: "21:30",
    venue: "东方枢纽",
    type: "networking",
    partners: ["上海气候周", "全球气候学院", "CC Talk"],
    speakerIds: ["1", "4", "7"],
    isPublished: true,
    isFeatured: false,
  },
  // 4月23日 - 董事会治理与基础设施
  {
    id: "14",
    title: "The Board 董事会治理转型",
    titleEn: "The Board: Governance Transformation",
    description: "开幕主题演讲（全球与中国视角）、圆桌1（将气候雄心转化为董事会层面行动）、圆桌2（中国领导力实践展示-天齐锂业、联想）、圆桌3（与领先中国银行金融与治理对话）、圆桌4（区域董事会领导力集群：上海-香港-伦敦）",
    shortDesc: "董事会层面气候治理",
    startDate: "2026-04-23",
    endDate: "2026-04-23",
    startTime: "09:00",
    endTime: "17:30",
    venue: "东方枢纽",
    type: "forum",
    partners: ["Chapter Zero Alliance", "全球气候学院"],
    speakerIds: ["5", "27", "28", "29", "30"],
    isPublished: true,
    isFeatured: true,
  },
  {
    id: "15",
    title: "Resilience by Design 可持续基础设施",
    titleEn: "Resilience by Design: Sustainable Infrastructure",
    description: "上午：理念重构与标准解码-FAST-Infra框架与Resilience by Design操作系统，下午：工具应用与生态构建（案例深潜、气候债券工作坊）、FAST-Infra 100 项目征集启动",
    shortDesc: "气候韧性基础设施",
    startDate: "2026-04-23",
    endDate: "2026-04-23",
    startTime: "09:00",
    endTime: "17:30",
    venue: "东方枢纽",
    type: "workshop",
    partners: ["全球基础设施巴塞尔基金会", "新开发银行", "青矩科技", "CBI"],
    speakerIds: ["6"],
    isPublished: true,
    isFeatured: true,
  },
  {
    id: "16",
    title: "上海气候周2026 可持续之夜",
    titleEn: "Shanghai Climate Week Sustainable Night",
    description: "交流沙龙，与全球气候领袖深入交流",
    shortDesc: "高端社交晚宴",
    startDate: "2026-04-23",
    endDate: "2026-04-23",
    startTime: "18:30",
    endTime: "20:30",
    venue: "待定",
    type: "networking",
    partners: ["2026合作伙伴"],
    isPublished: true,
    isFeatured: false,
  },
  // 4月24日 - 金融与绿色转型
  {
    id: "17",
    title: "2026气候灯塔·新范式",
    titleEn: "2026 Climate Lighthouse New Paradigm",
    description: "2026气候灯塔颁奖，表彰在气候行动中表现突出的企业和项目",
    shortDesc: "气候灯塔颁奖典礼",
    startDate: "2026-04-24",
    endDate: "2026-04-24",
    startTime: "09:30",
    endTime: "11:30",
    venue: "待定",
    type: "ceremony",
    partners: ["罗克韦尔自动化"],
    isPublished: true,
    isFeatured: false,
  },
  {
    id: "18",
    title: "转绿成金 可持续金融",
    titleEn: "Turning Green to Gold: Sustainable Finance",
    description: "「变绿为金」主题论坛、四城金融中心联动（上海-香港-伦敦-曼谷）、规则对齐（绿色资产「共同语言」）、金融工程（绿色/转型债券、气候科技VC、绿色REITs）、资本流动（跨境流动信用增级工具）",
    shortDesc: "可持续金融与跨境资本",
    startDate: "2026-04-24",
    endDate: "2026-04-24",
    startTime: "09:00",
    endTime: "17:00",
    venue: "东方枢纽",
    type: "forum",
    partners: ["全球气候学院", "地球之友香港", "伦敦气候行动周", "E3G", "曼谷气候周"],
    speakerIds: ["4", "15", "22", "26"],
    isPublished: true,
    isFeatured: true,
  },
  // 4月25日 - 基础设施与供应链
  {
    id: "19",
    title: "FAST-Infra 可持续基础设施",
    titleEn: "FAST-Infra: Sustainable Infrastructure",
    description: "概念重构与标准解码（FAST-Infra对中国的意义、全球框架与「韧性设计」OS）、工具应用与生态系统建设（深度案例研究、跨视角协作设计）、FAST-Infra 100 项目征集启动",
    shortDesc: "FAST-Infra框架与应用",
    startDate: "2026-04-25",
    endDate: "2026-04-25",
    startTime: "09:00",
    endTime: "17:30",
    venue: "东方枢纽",
    type: "workshop",
    partners: ["全球基础设施巴塞尔基金会", "新开发银行", "Greetech"],
    speakerIds: ["6", "17", "18"],
    isPublished: true,
    isFeatured: false,
  },
  {
    id: "20",
    title: "绿色供应链转型赋能",
    titleEn: "Green Supply Chain Transformation",
    description: "上午：认知重塑与战略发布-中国SME Scope 3成熟度指数发布，下午：能力构建与实战对接-平台实战工作坊（碳核算、绿色金融、数字化升级）、LEAD 50 × 专精特新小巨人协同计划启动",
    shortDesc: "中小企业绿色供应链转型",
    startDate: "2026-04-25",
    endDate: "2026-04-25",
    startTime: "09:00",
    endTime: "17:30",
    venue: "宝山区会场",
    type: "workshop",
    partners: ["新开发银行", "工信部中国中小企业国际合作协会", "IPE", "LEAD50", "CBI"],
    speakerIds: ["7"],
    isPublished: true,
    isFeatured: false,
  },
  // 4月27日 - 品牌与科技
  {
    id: "21",
    title: "百品领航 Top Runners 100",
    titleEn: "Top Runners 100",
    description: "上午-专题培训（闭门）：气候合规与品牌跃迁，下午-主题论坛：百品领航：气候竞争力如何成为企业新增长曲线、《2026中国百品领航企业气候行动报告》发布、百品领航企业授牌仪式",
    shortDesc: "品牌气候竞争力展示",
    startDate: "2026-04-27",
    endDate: "2026-04-27",
    startTime: "09:30",
    endTime: "16:30",
    venue: "南大广场",
    type: "forum",
    partners: ["全球气候学院", "CarbonNewture", "IPE"],
    speakerIds: ["7"],
    isPublished: true,
    isFeatured: false,
  },
  // 4月28日 - 科技投资与闭幕
  {
    id: "22",
    title: "科技先锋 气候投资风向标",
    titleEn: "Climate Tech Investment Compass",
    description: "路演模块I：绿色科技（Engine A）- 新型电力系统、工业过程减排、CCUS，路演模块II：AI for Climate（Engine B）- 电网负荷预测、工业设备预测性维护，路演模块III：绿色AI与交叉创新（Engine C）- 低碳AI芯片、算力调度，专题论坛：需求侧视角下的「可投资性」验证",
    shortDesc: "气候科技投资路演",
    startDate: "2026-04-28",
    endDate: "2026-04-28",
    startTime: "08:30",
    endTime: "17:30",
    venue: "滨江智慧广场",
    type: "conference",
    partners: ["全球气候学院", "New Energy Nexus", "遨问创投", "HT Venture"],
    speakerIds: ["10", "11"],
    isPublished: true,
    isFeatured: true,
  },
  {
    id: "23",
    title: "城市气候与健康论坛",
    titleEn: "Urban Climate and Health Forum",
    description: "开幕式致辞、两个主题演讲（城市气候-健康关系）、两个主题会议（小组对话）、创新亮点展示、闭幕与伙伴关系公告",
    shortDesc: "城市气候与健康关系",
    startDate: "2026-04-28",
    endDate: "2026-04-28",
    startTime: "09:00",
    endTime: "12:00",
    venue: "待定",
    type: "forum",
    partners: ["ASK Health Asia", "NYU Shanghai LOUD"],
    isPublished: true,
    isFeatured: false,
  },
];

export function getEventDateLabel(dateStr: string, locale = "zh"): string {
  const date = new Date(dateStr);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  if (locale === "en") {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      weekday: "short",
    }).format(date);
  }

  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekday = weekdays[date.getDay()];
  return `${month}月${day}日 (${weekday})`;
}

type EventScheduleSource = {
  startDate: string | Date;
  endDate: string | Date;
  startTime: string;
  endTime: string;
  eventDateSlots?: EventDateSlot[] | null;
};

function toDateString(value: string | Date): string {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

export function normalizeEventDateSlots(event: EventScheduleSource): EventDateSlot[] {
  if (Array.isArray(event.eventDateSlots) && event.eventDateSlots.length > 0) {
    return [...event.eventDateSlots]
      .filter((slot) => slot?.scheduleDate && slot?.startTime && slot?.endTime)
      .map((slot) => ({
        scheduleDate: toDateString(slot.scheduleDate),
        startTime: slot.startTime,
        endTime: slot.endTime,
      }))
      .sort((left, right) => {
        const byDate = left.scheduleDate.localeCompare(right.scheduleDate);
        if (byDate !== 0) {
          return byDate;
        }

        return left.startTime.localeCompare(right.startTime);
      });
  }

  return [
    {
      scheduleDate: toDateString(event.startDate),
      startTime: event.startTime,
      endTime: event.endTime,
    },
  ];
}

export function getEventDateRangeLabel(event: EventScheduleSource, locale = "zh"): string {
  const slots = normalizeEventDateSlots(event);
  const firstDate = slots[0]?.scheduleDate || toDateString(event.startDate);
  const lastDate = slots[slots.length - 1]?.scheduleDate || toDateString(event.endDate || event.startDate);

  if (firstDate === lastDate) {
    return getEventDateLabel(String(firstDate), locale);
  }

  return `${getEventDateLabel(String(firstDate), locale)} - ${getEventDateLabel(String(lastDate), locale)}`;
}

export function getEventScheduleLines(event: EventScheduleSource, locale = "zh"): string[] {
  return normalizeEventDateSlots(event).map((slot) => (
    `${getEventDateLabel(String(slot.scheduleDate), locale)} ${slot.startTime} - ${slot.endTime}`
  ));
}

export function getEventTimeSummaryLabel(event: EventScheduleSource, locale = "zh"): string {
  const slots = normalizeEventDateSlots(event);

  if (slots.length === 1) {
    return `${slots[0].startTime} - ${slots[0].endTime}`;
  }

  const separator = locale === "en" ? "; " : "；";
  return getEventScheduleLines(event, locale).join(separator);
}

export function getEventScheduleLabel(
  event: EventScheduleSource,
  locale = "zh"
): string {
  return getEventScheduleLines(event, locale).join(locale === "en" ? " / " : " / ");
}

export function groupEventsByDate(events: Event[]): Record<string, Event[]> {
  return events.reduce((acc, event) => {
    const dateKey = event.startDate.slice(0, 10);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(event);
    return acc;
  }, {} as Record<string, Event[]>);
}
