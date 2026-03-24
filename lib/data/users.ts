export type UserRole = 
  | "VISITOR" 
  | "ATTENDEE" 
  | "SPEAKER" 
  | "MEDIA" 
  | "SPONSOR" 
  | "ADMIN" 
  | "STAFF";

export type UserStatus = "PENDING" | "ACTIVE" | "SUSPENDED";

export interface User {
  id: string;
  name: string;
  nameEn?: string;
  email: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  registeredAt: string;
  organization?: {
    name: string;
    nameEn?: string;
    title?: string;
    titleEn?: string;
    industry?: string;
    industryEn?: string;
  };
  phone?: string;
  bio?: string;
  bioEn?: string;
  registeredEvents?: string[];
}

export const roleColors: Record<UserRole, string> = {
  VISITOR: "bg-slate-100 text-slate-700",
  ATTENDEE: "bg-emerald-100 text-emerald-700",
  SPEAKER: "bg-purple-100 text-purple-700",
  MEDIA: "bg-pink-100 text-pink-700",
  SPONSOR: "bg-amber-100 text-amber-700",
  ADMIN: "bg-red-100 text-red-700",
  STAFF: "bg-blue-100 text-blue-700",
};

export const statusColors: Record<UserStatus, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  SUSPENDED: "bg-red-100 text-red-700",
};

// 模拟用户数据
export const mockUsers: User[] = [
  {
    id: "1",
    name: "张明华",
    nameEn: "Michael Zhang",
    email: "zhangmh@example.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zhangmh",
    role: "ADMIN",
    status: "ACTIVE",
    registeredAt: "2025-01-15T08:30:00Z",
    organization: {
      name: "上海气候周组委会",
      nameEn: "Shanghai Climate Week Organizing Committee",
      title: "技术总监",
      titleEn: "Technical Director",
      industry: "环保组织",
      industryEn: "Environmental organization",
    },
    phone: "+86 138-0000-0001",
    bio: "资深环保技术专家，专注于气候科技与数字化转型。",
    bioEn: "Senior environmental technology expert focused on climate tech and digital transformation.",
    registeredEvents: ["1", "12", "14"],
  },
  {
    id: "2",
    name: "李思远",
    nameEn: "Simon Li",
    email: "lisiyuan@company.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=lisiyuan",
    role: "SPEAKER",
    status: "ACTIVE",
    registeredAt: "2025-02-20T10:15:00Z",
    organization: {
      name: "清华大学",
      nameEn: "Tsinghua University",
      title: "教授",
      titleEn: "Professor",
      industry: "教育科研",
      industryEn: "Education and research",
    },
    phone: "+86 139-0000-0002",
    bio: "清华大学环境学院教授，主要从事气候变化政策研究。",
    bioEn: "Professor at Tsinghua University's School of Environment, specializing in climate policy research.",
    registeredEvents: ["8", "12", "14"],
  },
  {
    id: "3",
    name: "王小红",
    nameEn: "Hannah Wang",
    email: "wangxh@mediagroup.cn",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=wangxh",
    role: "MEDIA",
    status: "ACTIVE",
    registeredAt: "2025-03-01T14:20:00Z",
    organization: {
      name: "绿色财经媒体",
      nameEn: "Green Finance Media",
      title: "资深记者",
      titleEn: "Senior Reporter",
      industry: "媒体",
      industryEn: "Media",
    },
    phone: "+86 137-0000-0003",
    bio: "专注ESG与可持续金融领域的深度报道。",
    bioEn: "Focused on in-depth coverage of ESG and sustainable finance.",
    registeredEvents: ["6", "12", "18"],
  },
  {
    id: "4",
    name: "陈建国",
    nameEn: "Jason Chen",
    email: "chenjg@sponsor.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=chenjg",
    role: "SPONSOR",
    status: "ACTIVE",
    registeredAt: "2025-03-10T09:00:00Z",
    organization: {
      name: "绿能科技集团",
      nameEn: "Green Energy Technology Group",
      title: "市场总监",
      titleEn: "Marketing Director",
      industry: "新能源",
      industryEn: "New energy",
    },
    phone: "+86 136-0000-0004",
    bio: "致力于推动企业绿色转型与可持续发展。",
    bioEn: "Dedicated to driving corporate green transformation and sustainable development.",
    registeredEvents: ["12", "17", "22"],
  },
  {
    id: "5",
    name: "刘小雨",
    nameEn: "Lucy Liu",
    email: "liuxy@email.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=liuxy",
    role: "ATTENDEE",
    status: "PENDING",
    registeredAt: "2026-03-15T16:45:00Z",
    organization: {
      name: "创新咨询",
      nameEn: "Innovation Consulting",
      title: "顾问",
      titleEn: "Consultant",
      industry: "咨询",
      industryEn: "Consulting",
    },
    phone: "+86 135-0000-0005",
    registeredEvents: ["7", "12"],
  },
  {
    id: "6",
    name: "赵大伟",
    nameEn: "David Zhao",
    email: "zhaodw@greenorg.org",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zhaodw",
    role: "STAFF",
    status: "ACTIVE",
    registeredAt: "2025-01-20T11:30:00Z",
    organization: {
      name: "WWF China",
      nameEn: "WWF China",
      title: "项目协调员",
      titleEn: "Project Coordinator",
      industry: "环保组织",
      industryEn: "Environmental organization",
    },
    phone: "+86 134-0000-0006",
    bio: "负责活动协调与志愿者管理。",
    bioEn: "Responsible for event coordination and volunteer management.",
    registeredEvents: ["1", "6", "12", "20"],
  },
  {
    id: "7",
    name: "孙丽华",
    nameEn: "Livia Sun",
    email: "sunlh@university.edu",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=sunlh",
    role: "SPEAKER",
    status: "SUSPENDED",
    registeredAt: "2025-04-05T13:10:00Z",
    organization: {
      name: "复旦大学",
      nameEn: "Fudan University",
      title: "副教授",
      titleEn: "Associate Professor",
      industry: "教育科研",
      industryEn: "Education and research",
    },
    phone: "+86 133-0000-0007",
    bio: "研究城市气候适应性与韧性城市。",
    bioEn: "Researches urban climate adaptation and resilient cities.",
    registeredEvents: ["23"],
  },
  {
    id: "8",
    name: "周建华",
    nameEn: "Kevin Zhou",
    email: "zhoujh@techcorp.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zhoujh",
    role: "ATTENDEE",
    status: "ACTIVE",
    registeredAt: "2026-02-28T08:00:00Z",
    organization: {
      name: "未来科技",
      nameEn: "Future Tech",
      title: "产品经理",
      titleEn: "Product Manager",
      industry: "科技",
      industryEn: "Technology",
    },
    phone: "+86 132-0000-0008",
    registeredEvents: ["10", "12", "22"],
  },
  {
    id: "9",
    name: "吴婷婷",
    nameEn: "Tina Wu",
    email: "wutt@finance.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=wutt",
    role: "ATTENDEE",
    status: "ACTIVE",
    registeredAt: "2026-03-05T15:30:00Z",
    organization: {
      name: "绿色金融研究院",
      nameEn: "Green Finance Research Institute",
      title: "研究员",
      titleEn: "Research Fellow",
      industry: "金融",
      industryEn: "Finance",
    },
    phone: "+86 131-0000-0009",
    registeredEvents: ["18", "22"],
  },
  {
    id: "10",
    name: "郑浩然",
    nameEn: "Howard Zheng",
    email: "zhenghr@startup.io",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=zhenghr",
    role: "VISITOR",
    status: "PENDING",
    registeredAt: "2026-03-18T10:00:00Z",
    organization: {
      name: "碳中和创业",
      nameEn: "Carbon Neutral Startup",
      title: "创始人",
      titleEn: "Founder",
      industry: "创业",
      industryEn: "Startup",
    },
    phone: "+86 130-0000-0010",
  },
  {
    id: "11",
    name: "马丽娜",
    nameEn: "Nina Ma",
    email: "maln@news.cn",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=maln",
    role: "MEDIA",
    status: "ACTIVE",
    registeredAt: "2025-11-10T09:15:00Z",
    organization: {
      name: "中国环境报",
      nameEn: "China Environment News",
      title: "编辑",
      titleEn: "Editor",
      industry: "媒体",
      industryEn: "Media",
    },
    phone: "+86 129-0000-0011",
    registeredEvents: ["12", "14", "18"],
  },
  {
    id: "12",
    name: "黄志强",
    nameEn: "Victor Huang",
    email: "huangzq@solar.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=huangzq",
    role: "SPONSOR",
    status: "ACTIVE",
    registeredAt: "2025-08-22T14:00:00Z",
    organization: {
      name: "阳光能源",
      nameEn: "Sunshine Energy",
      title: "CEO",
      titleEn: "CEO",
      industry: "新能源",
      industryEn: "New energy",
    },
    phone: "+86 128-0000-0012",
    bio: "光伏行业20年经验，推动清洁能源普及。",
    bioEn: "20 years of photovoltaic industry experience, driving clean energy adoption.",
    registeredEvents: ["12", "17", "19", "22"],
  },
  {
    id: "13",
    name: "林小芳",
    nameEn: "Fiona Lin",
    email: "linxf@student.edu",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=linxf",
    role: "ATTENDEE",
    status: "ACTIVE",
    registeredAt: "2026-03-10T11:20:00Z",
    organization: {
      name: "上海交通大学",
      nameEn: "Shanghai Jiao Tong University",
      title: "研究生",
      titleEn: "Graduate Student",
      industry: "教育",
      industryEn: "Education",
    },
    phone: "+86 127-0000-0013",
    registeredEvents: ["2", "3", "12"],
  },
  {
    id: "14",
    name: "谢明辉",
    nameEn: "Henry Xie",
    email: "xiemh@bank.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=xiemh",
    role: "SPEAKER",
    status: "ACTIVE",
    registeredAt: "2025-06-15T16:30:00Z",
    organization: {
      name: "绿色投资银行",
      nameEn: "Green Investment Bank",
      title: "可持续发展总监",
      titleEn: "Director of Sustainability",
      industry: "金融",
      industryEn: "Finance",
    },
    phone: "+86 126-0000-0014",
    bio: "专注于绿色金融产品设计与国际资本对接。",
    bioEn: "Focused on green finance product design and international capital partnerships.",
    registeredEvents: ["14", "18"],
  },
  {
    id: "15",
    name: "罗晓燕",
    nameEn: "Yana Luo",
    email: "luoxy@consulting.com",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=luoxy",
    role: "STAFF",
    status: "ACTIVE",
    registeredAt: "2025-03-20T08:45:00Z",
    organization: {
      name: "气候周秘书处",
      nameEn: "Climate Week Secretariat",
      title: "运营经理",
      titleEn: "Operations Manager",
      industry: "环保组织",
      industryEn: "Environmental organization",
    },
    phone: "+86 125-0000-0015",
    bio: "负责大会运营统筹与流程管理。",
    bioEn: "Responsible for event operations planning and process management.",
    registeredEvents: ["1", "4", "5", "12", "16"],
  },
];

// 活动名称映射（用于显示用户报名的活动）
export const eventNames: Record<string, string> = {
  "1": "Re:Fashion 循环经济论坛",
  "2": "U20+年度会议 Day 1",
  "3": "U20+年度会议 Day 2",
  "4": "China Circularity 100 Day 1",
  "5": "China Circularity 100 Day 2",
  "6": "Trade System 3.0 可持续贸易",
  "7": "Future Food 未来食物系统",
  "8": "Water Security 水安全论坛",
  "10": "Climate Tech 海洋与岛屿气候技术",
  "12": "上海气候周2026 盛大开幕仪式",
  "14": "The Board 董事会治理转型",
  "16": "上海气候周2026 可持续之夜",
  "17": "2026气候灯塔·新范式",
  "18": "转绿成金 可持续金融",
  "19": "FAST-Infra 可持续基础设施",
  "20": "绿色供应链转型赋能",
  "22": "科技先锋 气候投资风向标",
  "23": "城市气候与健康论坛",
};

export const eventNamesEn: Record<string, string> = {
  "1": "Re:Fashion Circular Economy Forum",
  "2": "U20+ Annual Meeting Day 1",
  "3": "U20+ Annual Meeting Day 2",
  "4": "China Circularity 100 Day 1",
  "5": "China Circularity 100 Day 2",
  "6": "Trade System 3.0: Sustainable Trade",
  "7": "Future Food System",
  "8": "Water Security Forum",
  "10": "Climate Tech: Ocean and Islands",
  "12": "Shanghai Climate Week 2026 Grand Opening",
  "14": "The Board: Governance Transformation",
  "16": "Shanghai Climate Week 2026 Sustainable Night",
  "17": "2026 Climate Lighthouse: New Paradigms",
  "18": "Turning Green into Gold: Sustainable Finance",
  "19": "FAST-Infra Sustainable Infrastructure",
  "20": "Green Supply Chain Transition Enablement",
  "22": "Tech Pioneers: Climate Investment Outlook",
  "23": "Urban Climate and Health Forum",
};

export function getLocalizedUserName(user: User, locale: string = "zh") {
  return locale === "en" ? user.nameEn ?? user.name : user.name;
}

export function getLocalizedOrganizationName(user: User, locale: string = "zh") {
  if (!user.organization) {
    return undefined;
  }

  return locale === "en"
    ? user.organization.nameEn ?? user.organization.name
    : user.organization.name;
}

export function getLocalizedOrganizationTitle(user: User, locale: string = "zh") {
  if (!user.organization) {
    return undefined;
  }

  return locale === "en"
    ? user.organization.titleEn ?? user.organization.title
    : user.organization.title;
}

export function getLocalizedOrganizationIndustry(user: User, locale: string = "zh") {
  if (!user.organization) {
    return undefined;
  }

  return locale === "en"
    ? user.organization.industryEn ?? user.organization.industry
    : user.organization.industry;
}

export function getLocalizedUserBio(user: User, locale: string = "zh") {
  return locale === "en" ? user.bioEn ?? user.bio : user.bio;
}

export function getUserEventName(eventId: string, locale: string = "zh") {
  if (locale === "en") {
    return eventNamesEn[eventId] ?? `Event #${eventId}`;
  }

  return eventNames[eventId] ?? `活动 #${eventId}`;
}
