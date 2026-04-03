export type DefaultCooperationPlan = {
  tierType: "platinum" | "gold" | "silver" | "partner";
  name: string;
  nameEn: string;
  description: string | null;
  descriptionEn: string | null;
  price: string | null;
  features: string[];
  featuresEn: string[];
  order: number;
  isActive: boolean;
};

export const defaultCooperationPlans: DefaultCooperationPlan[] = [
  {
    tierType: "platinum",
    name: "首席合作伙伴",
    nameEn: "Chief Partner",
    description: null,
    descriptionEn: null,
    price: "¥300,000-500,000",
    features: [
      "全球气候周网络G20级活动联办机会",
      "与联合国、亚开行等国际机构共创边会",
      "旗舰活动联办资格（如Future Food未来食物系统）",
      "高管面向500+CEO圈层全球圆桌对话",
      "国际公关媒体报道、央视级媒体专访",
      "标准展位36㎡及优先选址权",
      "VIP通行证20张",
    ],
    featuresEn: [
      "Co-hosting opportunities for G20-level programs within the Global Climate Week network",
      "Joint side events with international institutions such as the UN and ADB",
      "Eligibility to co-host flagship programs such as Future Food",
      "Global executive roundtables for a 500+ CEO audience",
      "International PR coverage and top-tier media interviews",
      "36 sqm standard booth with priority placement",
      "20 VIP passes",
    ],
    order: 1,
    isActive: true,
  },
  {
    tierType: "gold",
    name: "合作伙伴",
    nameEn: "Presenting Partner",
    description: null,
    descriptionEn: null,
    price: "¥50,000-200,000",
    features: [
      "SDG Week合作机会",
      "品牌Logo在主视觉显著位置展示",
      "圆桌讨论或分论坛演讲机会",
      "标准展位18㎡",
      "VIP通行证10张",
      "品牌物料入袋权益",
      "媒体曝光及新闻稿提及",
    ],
    featuresEn: [
      "SDG Week collaboration opportunity",
      "Prominent logo placement in key visual assets",
      "Roundtable or forum speaking opportunity",
      "18 sqm standard booth",
      "10 VIP passes",
      "Branded materials in attendee bags",
      "Media exposure and mention in press releases",
    ],
    order: 2,
    isActive: true,
  },
  {
    tierType: "silver",
    name: "生态伙伴",
    nameEn: "Ecosystem Partner",
    description: null,
    descriptionEn: null,
    price: "¥30,000-50,000",
    features: [
      "进入上海气候周生态网络",
      "品牌Logo在主视觉展示",
      "活动参与机会",
      "标准展位9㎡",
      "VIP通行证5张",
      "新闻稿提及",
    ],
    featuresEn: [
      "Access to the Shanghai Climate Week ecosystem network",
      "Logo placement in key visual assets",
      "Participation opportunities in event programming",
      "9 sqm standard booth",
      "5 VIP passes",
      "Mention in press releases",
    ],
    order: 3,
    isActive: true,
  },
  {
    tierType: "partner",
    name: "媒体/机构伙伴",
    nameEn: "Media / Institutional Partner",
    description: null,
    descriptionEn: null,
    price: "定制方案",
    features: [
      "独家报道权及采访优先权",
      "品牌联合推广机会",
      "活动现场媒体位",
      "官方媒体合作伙伴标识",
      "内容共创机会",
    ],
    featuresEn: [
      "Exclusive coverage and interview priority",
      "Joint brand promotion opportunities",
      "Dedicated on-site media access",
      "Official media partner designation",
      "Co-created content opportunities",
    ],
    order: 4,
    isActive: true,
  },
];