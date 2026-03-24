export interface Speaker {
  id: string;
  name: string;
  nameEn?: string;
  avatar?: string;
  title: string;
  organization: string;
  bio: string;
  topics: string[];
  isKeynote: boolean;
  events?: string[];
  social?: {
    linkedin?: string;
    twitter?: string;
    website?: string;
  };
}

type Locale = "zh" | "en";

export const speakers: Speaker[] = [
  {
    id: "1",
    name: "吴昌华",
    nameEn: "Wu Changhua",
    title: "院长",
    organization: "全球气候学院",
    bio: "全球气候学院院长，曾任气候组织大中华区总裁。环境与发展政策分析专家，近二十年专注中国可持续发展事务。",
    topics: ["全球治理", "可持续发展", "气候政策"],
    isKeynote: true,
    events: ["盛大开幕仪式"],
  },
  {
    id: "2",
    name: "Shahbaz Khan",
    title: "主任兼代表",
    organization: "UNESCO东亚地区办事处",
    bio: "联合国教科文组织东亚地区办事处主任兼代表。亚太水论坛治理委员会成员，水资源和可持续发展领域国际专家。",
    topics: ["水资源", "可持续发展"],
    isKeynote: true,
    events: ["水安全论坛"],
  },
  {
    id: "3",
    name: "张庆丰",
    nameEn: "Zhang Qingfeng",
    title: "局长",
    organization: "亚洲开发银行",
    bio: "亚开行农业、粮食、自然和农村发展分局局长，负责管理亚开行260亿美元食品系统转型投资框架。",
    topics: ["农业发展", "食品系统", "气候适应"],
    isKeynote: true,
    events: ["未来食物系统", "水安全论坛"],
  },
  {
    id: "4",
    name: "Nick Mabey",
    title: "创始人兼CEO",
    organization: "E3G / 伦敦气候行动周",
    bio: "E3G创始董事兼CEO，伦敦气候行动周创始人。曾任英国首相气候变化顾问，全球气候行动知名领导者。",
    topics: ["气候政策", "国际合作"],
    isKeynote: true,
    events: ["城市合作平台", "可持续金融"],
  },
  {
    id: "5",
    name: "Bernice Lee",
    title: "研究总监",
    organization: "查塔姆研究所",
    bio: "查塔姆研究所研究总监，霍夫曼可持续发展与资源经济项目创始负责人。Chapter Zero Alliance核心成员。",
    topics: ["能源政策", "气候治理"],
    isKeynote: false,
    events: ["董事会治理转型"],
  },
  {
    id: "6",
    name: "Louis Downing",
    title: "CEO",
    organization: "全球基础设施巴塞尔基金会",
    bio: "全球基础设施巴塞尔基金会CEO，专注可持续基础设施投融资和气候韧性基础设施发展。",
    topics: ["基础设施", "气候韧性"],
    isKeynote: false,
    events: ["可持续基础设施"],
  },
  {
    id: "7",
    name: "马军",
    nameEn: "Ma Jun",
    title: "创始人兼主任",
    organization: "公众环境研究中心",
    bio: "公众环境研究中心创始人。2006年被《时代周刊》评为全球最具影响力100人之一，中国环境信息公开先驱者。",
    topics: ["环境信息", "绿色转型"],
    isKeynote: true,
    events: ["绿色供应链", "百品领航"],
  },
  {
    id: "8",
    name: "蔡宏",
    nameEn: "Cai Hong",
    title: "ESG负责人",
    organization: "阿里巴巴盒马鲜生",
    bio: "盒马鲜生商品事业部ESG负责人，专注绿色供应链、食品安全和低碳运营。",
    topics: ["ESG", "绿色供应链"],
    isKeynote: false,
    events: ["未来食物系统"],
  },
  {
    id: "9",
    name: "Chloe Lin",
    title: "可持续发展负责人",
    organization: "Oatly",
    bio: "Oatly大中华区可持续发展负责人，推动植物基饮品在中国的可持续发展战略。",
    topics: ["可持续食品", "植物基"],
    isKeynote: false,
    events: ["未来食物系统"],
  },
  {
    id: "10",
    name: "周敏",
    nameEn: "Zhou Min",
    title: "创始人兼CEO",
    organization: "遨问创投",
    bio: "遨问创投创始合伙人兼CEO，硬科技投资专家，福布斯中国最具影响力华人精英TOP100，专注气候科技投资。",
    topics: ["气候科技", "投资"],
    isKeynote: false,
    events: ["气候投资风向标"],
  },
  {
    id: "11",
    name: "David Sandalow",
    title: "教授",
    organization: "哥伦比亚大学",
    bio: "哥伦比亚大学全球能源政策中心资深研究员，ICEF主席。曾任美国能源部助理部长。",
    topics: ["能源政策", "气候创新"],
    isKeynote: false,
    events: ["气候投资风向标"],
  },
  {
    id: "12",
    name: "邹荣",
    nameEn: "Zou Rong",
    title: "联席主任",
    organization: "上海气候周执委会",
    bio: "上海气候周执委会联席主任，秉持中国行动、亚洲声音、世界标准理念，推动气候跨界合作网络。",
    topics: ["气候行动", "国际合作"],
    isKeynote: true,
    events: ["盛大开幕仪式"],
  },
  {
    id: "13",
    name: "路跃兵",
    nameEn: "Lu Yuebing",
    title: "董事会主席",
    organization: "法液空中国 / 气候资本集团",
    bio: "液化空气(中国)投资有限公司董事会主席，气候资本集团董事长。能源和氢能产业专家，绿色氢能领域资深专家。",
    topics: ["氢能", "绿色能源"],
    isKeynote: false,
    events: ["气候投资风向标"],
  },
  {
    id: "14",
    name: "Yumiko Asayama",
    title: "首席经理",
    organization: "亚太水论坛",
    bio: "亚太水论坛(APWF)首席经理，负责协调亚太地区水安全合作项目，推动区域内各国在水资源管理方面的合作。",
    topics: ["水资源", "水安全"],
    isKeynote: false,
    events: ["水安全论坛"],
  },
  {
    id: "15",
    name: "Malini Mehra",
    title: "CEO / 主席",
    organization: "GLOBE国会议员联盟 / IEEP UK",
    bio: "GLOBE国会议员联盟CEO，英国环境经济研究所主席。印度籍可持续发展专家，致力于推动气候变化立法和国际合作。",
    topics: ["气候立法", "国际合作"],
    isKeynote: false,
    events: ["可持续金融"],
  },
  {
    id: "16",
    name: "Beatrice Cassottana",
    title: "韧性工程专家",
    organization: "全球基础设施巴塞尔基金会",
    bio: "全球基础设施巴塞尔基金会韧性工程专家，拥有8年以上基础设施韧性评估经验，专注气候变化对基础设施影响的研究。",
    topics: ["基础设施", "气候韧性"],
    isKeynote: false,
    events: ["可持续基础设施"],
  },
  {
    id: "17",
    name: "Roman Novozhilov",
    title: "专家",
    organization: "新开发银行",
    bio: "新开发银行基础设施投资专家，专注于可持续基础设施项目的投融资。",
    topics: ["基础设施", "绿色金融"],
    isKeynote: false,
    events: ["FAST-Infra可持续基础设施"],
  },
  {
    id: "18",
    name: "Mandy Wenjie Ying",
    title: "专家",
    organization: "新开发银行",
    bio: "新开发银行代表，专注于气候金融和绿色投资。",
    topics: ["气候金融", "绿色投资"],
    isKeynote: false,
    events: ["FAST-Infra可持续基础设施"],
  },
  {
    id: "19",
    name: "嵇峰",
    nameEn: "Ji Feng",
    title: "所长",
    organization: "工信部中小企业发展促进中心",
    bio: "工信部中国中小企业发展促进中心人力资源发展研究所所长，专注于中小企业发展政策和人力资源开发。",
    topics: ["中小企业", "绿色转型"],
    isKeynote: false,
    events: ["绿色供应链转型赋能"],
  },
  {
    id: "20",
    name: "谢文泓",
    nameEn: "Xie Wenhong",
    title: "中国区总经理",
    organization: "气候债券倡议组织(CBI)",
    bio: "气候债券倡议组织(CBI)中国区总经理，专注推动可持续金融标准和中国绿色债券市场的发展。",
    topics: ["绿色债券", "可持续金融"],
    isKeynote: false,
    events: ["水安全论坛", "绿色供应链转型赋能"],
  },
  {
    id: "21",
    name: "郝小军",
    nameEn: "Hao Xiaojun",
    title: "合伙人",
    organization: "E20环境平台",
    bio: "E20环境平台合伙人，绿色科技投资专家。专注于环境产业投资和可持续发展项目。",
    topics: ["环境产业", "绿色投资"],
    isKeynote: false,
    events: ["气候投资风向标", "水安全论坛"],
  },
  {
    id: "22",
    name: "叶广涛",
    nameEn: "Plato Yip",
    title: "主席",
    organization: "地球之友香港",
    bio: "地球之友香港主席，香港主要环保非营利组织领袖，致力于推动香港和内地的环境保护与可持续发展工作。",
    topics: ["环保", "可持续发展"],
    isKeynote: false,
    events: ["可持续金融"],
  },
  {
    id: "23",
    name: "Christina",
    title: "代表",
    organization: "ProVeg International",
    bio: "ProVeg国际代表，推广植物饮食的组织，致力于推动可持续食品系统。",
    topics: ["植物基", "可持续食品"],
    isKeynote: false,
    events: ["未来食物系统"],
  },
  {
    id: "24",
    name: "叶常德",
    nameEn: "Ye Changde",
    title: "负责人",
    organization: "未来餐桌联盟",
    bio: "未来餐桌联盟负责人，致力于推广可持续饮食和植物基食品。",
    topics: ["可持续饮食", "植物基"],
    isKeynote: false,
    events: ["未来食物系统"],
  },
  {
    id: "25",
    name: "彭静",
    nameEn: "Peng Jing",
    title: "专家",
    organization: "中国水利水电科学研究院",
    bio: "中国水利水电科学研究院水资源专家，专注于水资源管理和水安全研究。",
    topics: ["水资源", "水安全"],
    isKeynote: false,
    events: ["水安全论坛"],
  },
  {
    id: "26",
    name: "Joanna Ylan Wu",
    title: "代表",
    organization: "地球之友香港",
    bio: "地球之友香港代表，关注环境保护和可持续发展议题。",
    topics: ["环保", "可持续发展"],
    isKeynote: false,
    events: ["可持续金融"],
  },
  {
    id: "27",
    name: "Agnes Tai",
    title: "代表",
    organization: "Chapter Zero Alliance香港",
    bio: "Chapter Zero Alliance香港代表，专注于推动企业董事会的气候治理。",
    topics: ["气候治理", "董事会"],
    isKeynote: false,
    events: ["董事会治理转型"],
  },
  {
    id: "28",
    name: "Simon Learmount",
    title: "教授",
    organization: "剑桥大学 / Chapter Zero Alliance",
    bio: "剑桥大学教师，Chapter Zero Alliance成员，专注于企业治理和可持续发展。",
    topics: ["企业治理", "可持续发展"],
    isKeynote: false,
    events: ["董事会治理转型"],
  },
  {
    id: "29",
    name: "Emily Farnworth",
    title: "代表",
    organization: "Chapter Zero Alliance",
    bio: "Chapter Zero Alliance代表，该组织致力于推动董事会层面的气候行动。",
    topics: ["气候治理", "董事会"],
    isKeynote: false,
    events: ["董事会治理转型"],
  },
  {
    id: "30",
    name: "Matthew Moss",
    title: "代表",
    organization: "Chapter Zero Alliance",
    bio: "Chapter Zero Alliance代表，推动企业领导者的气候责任。",
    topics: ["气候治理", "企业责任"],
    isKeynote: false,
    events: ["董事会治理转型"],
  },
  {
    id: "31",
    name: "Leo Horn-Phathanothai",
    title: "代表",
    organization: "曼谷气候周",
    bio: "曼谷气候周代表，推动亚洲城市的气候行动合作。",
    topics: ["城市气候", "国际合作"],
    isKeynote: false,
    events: ["城市合作平台"],
  },
  {
    id: "32",
    name: "黄彦翔",
    nameEn: "Arthur Huang",
    title: "创始人兼CEO",
    organization: "碳衡科技",
    bio: "碳衡科技创始人兼CEO，专注于碳排放管理和数字产品护照(DPP)的科技公司，帮助企业实现低碳转型。",
    topics: ["碳管理", "数字化"],
    isKeynote: false,
    events: ["百品领航"],
  },
];

export const speakerCategories = [
  { key: "all", label: "全部嘉宾" },
  { key: "keynote", label: "主旨嘉宾" },
  { key: "policy", label: "政策专家" },
  { key: "finance", label: "金融投资" },
  { key: "business", label: "企业领袖" },
];

const speakerCategoryLabels: Record<Locale, Record<string, string>> = {
  zh: {
    all: "全部嘉宾",
    keynote: "主旨嘉宾",
    policy: "政策专家",
    finance: "金融投资",
    business: "企业领袖",
  },
  en: {
    all: "All speakers",
    keynote: "Keynote speakers",
    policy: "Policy experts",
    finance: "Finance and investment",
    business: "Business leaders",
  },
};

const speakerTranslations: Record<string, Partial<Record<Locale, Partial<Speaker>>>> = {
  "1": {
    en: {
      title: "President",
      organization: "Global Climate Academy",
      bio: "President of the Global Climate Academy and former Greater China head of The Climate Group. She is a policy analyst focused on environment, development, and sustainable transformation in China.",
      topics: ["Global governance", "Sustainable development", "Climate policy"],
      events: ["Grand Opening Ceremony"],
    },
  },
  "2": {
    en: {
      title: "Director and Representative",
      organization: "UNESCO Regional Office for East Asia",
      bio: "Director and Representative of UNESCO's Regional Office for East Asia. He is an international expert in water resources, sustainability, and regional cooperation.",
      topics: ["Water resources", "Sustainable development"],
      events: ["Water Security Forum"],
    },
  },
  "3": {
    en: {
      title: "Director General",
      organization: "Asian Development Bank",
      bio: "Director General for agriculture, food, nature, and rural development at ADB, leading a major investment framework for food system transformation and climate resilience.",
      topics: ["Agricultural development", "Food systems", "Climate adaptation"],
      events: ["Future Food Systems", "Water Security Forum"],
    },
  },
  "4": {
    en: {
      title: "Founder and CEO",
      organization: "E3G / London Climate Action Week",
      bio: "Founder and CEO of E3G and founder of London Climate Action Week. He previously advised the UK Prime Minister on climate policy and is a recognized global climate strategist.",
      topics: ["Climate policy", "International cooperation"],
      events: ["City Collaboration Platform", "Sustainable Finance"],
    },
  },
  "5": {
    en: {
      title: "Research Director",
      organization: "Chatham House",
      bio: "Research Director at Chatham House and founding leader of the Hoffmann programme on sustainable resource economies. She works on governance, energy, and systems transition.",
      topics: ["Energy policy", "Climate governance"],
      events: ["Board Governance Transition"],
    },
  },
  "6": {
    en: {
      title: "CEO",
      organization: "Global Infrastructure Basel Foundation",
      bio: "CEO of the Global Infrastructure Basel Foundation, focused on financing sustainable infrastructure and climate-resilient urban development.",
      topics: ["Infrastructure", "Climate resilience"],
      events: ["Sustainable Infrastructure"],
    },
  },
  "7": {
    en: {
      title: "Founder and Director",
      organization: "Institute of Public and Environmental Affairs",
      bio: "Founder of IPE and a pioneer of environmental information disclosure in China. He has been widely recognized for advancing transparency and green transition.",
      topics: ["Environmental data", "Green transition"],
      events: ["Green Supply Chain", "Top 100 Flagship Products"],
    },
  },
  "8": {
    en: {
      title: "Head of ESG",
      organization: "Hema Fresh, Alibaba",
      bio: "ESG lead for Hema Fresh, focusing on green supply chains, food safety, and low-carbon retail operations.",
      topics: ["ESG", "Green supply chain"],
      events: ["Future Food Systems"],
    },
  },
  "9": {
    en: {
      title: "Head of Sustainability",
      organization: "Oatly",
      bio: "Head of sustainability for Oatly Greater China, working on growth strategies for plant-based products and low-carbon food systems.",
      topics: ["Sustainable food", "Plant-based innovation"],
      events: ["Future Food Systems"],
    },
  },
  "10": {
    en: {
      title: "Founder and CEO",
      organization: "Aowen Ventures",
      bio: "Founder, managing partner, and CEO of Aowen Ventures. She specializes in hard-tech and climate-tech investment.",
      topics: ["Climate tech", "Investment"],
      events: ["Climate Investment Outlook"],
    },
  },
  "11": {
    en: {
      title: "Professor",
      organization: "Columbia University",
      bio: "Senior research scholar at Columbia University's Center on Global Energy Policy and chair of ICEF. Former Assistant Secretary at the U.S. Department of Energy.",
      topics: ["Energy policy", "Climate innovation"],
      events: ["Climate Investment Outlook"],
    },
  },
  "12": {
    en: {
      title: "Co-Director",
      organization: "Shanghai Climate Week Executive Committee",
      bio: "Co-Director of the Shanghai Climate Week Executive Committee, advancing cross-sector collaboration through the principles of China action, Asian voice, and global standards.",
      topics: ["Climate action", "International cooperation"],
      events: ["Grand Opening Ceremony"],
    },
  },
  "13": {
    en: {
      title: "Chairman",
      organization: "Air Liquide China / Climate Capital Group",
      bio: "Chairman of Air Liquide China and Climate Capital Group, with deep expertise in the energy and hydrogen sectors.",
      topics: ["Hydrogen", "Green energy"],
      events: ["Climate Investment Outlook"],
    },
  },
  "14": {
    en: {
      title: "Chief Manager",
      organization: "Asia-Pacific Water Forum",
      bio: "Chief Manager of the Asia-Pacific Water Forum, coordinating regional water-security initiatives and strengthening cross-border cooperation on water governance.",
      topics: ["Water resources", "Water security"],
      events: ["Water Security Forum"],
    },
  },
  "15": {
    en: {
      title: "CEO / Chair",
      organization: "GLOBE Legislators / IEEP UK",
      bio: "CEO of GLOBE Legislators and Chair of IEEP UK. She is an international sustainable development expert focused on climate legislation and multilateral cooperation.",
      topics: ["Climate legislation", "International cooperation"],
      events: ["Sustainable Finance"],
    },
  },
  "16": {
    en: {
      title: "Resilience Engineering Specialist",
      organization: "Global Infrastructure Basel Foundation",
      bio: "Infrastructure resilience specialist with extensive experience in evaluating how climate change affects infrastructure systems and investment planning.",
      topics: ["Infrastructure", "Climate resilience"],
      events: ["Sustainable Infrastructure"],
    },
  },
  "17": {
    en: {
      title: "Specialist",
      organization: "New Development Bank",
      bio: "Infrastructure investment specialist at the New Development Bank, focused on financing sustainable infrastructure projects.",
      topics: ["Infrastructure", "Green finance"],
      events: ["FAST-Infra Sustainable Infrastructure"],
    },
  },
  "18": {
    en: {
      title: "Specialist",
      organization: "New Development Bank",
      bio: "Representative of the New Development Bank, specializing in climate finance and green investment strategy.",
      topics: ["Climate finance", "Green investment"],
      events: ["FAST-Infra Sustainable Infrastructure"],
    },
  },
  "19": {
    en: {
      title: "Director",
      organization: "SME Development Promotion Center, MIIT",
      bio: "Director at the Center for SME Development Promotion under MIIT, focused on policy and human-resource development for green SME transition.",
      topics: ["SMEs", "Green transition"],
      events: ["Green Supply Chain Transition Enablement"],
    },
  },
  "20": {
    en: {
      title: "China General Manager",
      organization: "Climate Bonds Initiative",
      bio: "China General Manager at the Climate Bonds Initiative, advancing sustainable finance standards and the growth of the domestic green bond market.",
      topics: ["Green bonds", "Sustainable finance"],
      events: ["Water Security Forum", "Green Supply Chain Transition Enablement"],
    },
  },
  "21": {
    en: {
      title: "Partner",
      organization: "E20 Environment Platform",
      bio: "Partner at the E20 Environment Platform and an investor focused on green technologies, environmental industries, and sustainable projects.",
      topics: ["Environmental industry", "Green investment"],
      events: ["Climate Investment Outlook", "Water Security Forum"],
    },
  },
  "22": {
    en: {
      title: "Chairman",
      organization: "Friends of the Earth Hong Kong",
      bio: "Chairman of Friends of the Earth Hong Kong, leading environmental advocacy and sustainability initiatives across Hong Kong and mainland China.",
      topics: ["Environmental protection", "Sustainable development"],
      events: ["Sustainable Finance"],
    },
  },
  "23": {
    en: {
      title: "Representative",
      organization: "ProVeg International",
      bio: "Representative of ProVeg International, promoting plant-rich diets and more sustainable food systems.",
      topics: ["Plant-based innovation", "Sustainable food"],
      events: ["Future Food Systems"],
    },
  },
  "24": {
    en: {
      title: "Lead",
      organization: "Future Table Alliance",
      bio: "Lead of the Future Table Alliance, focused on promoting sustainable diets and plant-based food innovation.",
      topics: ["Sustainable diets", "Plant-based innovation"],
      events: ["Future Food Systems"],
    },
  },
  "25": {
    en: {
      title: "Specialist",
      organization: "China Institute of Water Resources and Hydropower Research",
      bio: "Water-resources specialist at IWHR, focused on water management, safety, and resilience.",
      topics: ["Water resources", "Water security"],
      events: ["Water Security Forum"],
    },
  },
  "26": {
    en: {
      title: "Representative",
      organization: "Friends of the Earth Hong Kong",
      bio: "Representative of Friends of the Earth Hong Kong, working on environmental protection and sustainable development issues.",
      topics: ["Environmental protection", "Sustainable development"],
      events: ["Sustainable Finance"],
    },
  },
  "27": {
    en: {
      title: "Representative",
      organization: "Chapter Zero Alliance Hong Kong",
      bio: "Representative of Chapter Zero Alliance Hong Kong, focused on improving climate governance at the board level.",
      topics: ["Climate governance", "Boards"],
      events: ["Board Governance Transition"],
    },
  },
  "28": {
    en: {
      title: "Professor",
      organization: "University of Cambridge / Chapter Zero Alliance",
      bio: "Academic at the University of Cambridge and member of Chapter Zero Alliance, specializing in corporate governance and sustainability.",
      topics: ["Corporate governance", "Sustainable development"],
      events: ["Board Governance Transition"],
    },
  },
  "29": {
    en: {
      title: "Representative",
      organization: "Chapter Zero Alliance",
      bio: "Representative of Chapter Zero Alliance, an initiative dedicated to advancing climate action at the board and executive level.",
      topics: ["Climate governance", "Boards"],
      events: ["Board Governance Transition"],
    },
  },
  "30": {
    en: {
      title: "Representative",
      organization: "Chapter Zero Alliance",
      bio: "Representative of Chapter Zero Alliance, supporting stronger climate accountability among business leaders.",
      topics: ["Climate governance", "Corporate responsibility"],
      events: ["Board Governance Transition"],
    },
  },
  "31": {
    en: {
      title: "Representative",
      organization: "Bangkok Climate Week",
      bio: "Representative of Bangkok Climate Week, building cooperation on climate action among Asian cities.",
      topics: ["Urban climate", "International cooperation"],
      events: ["City Collaboration Platform"],
    },
  },
  "32": {
    en: {
      title: "Founder and CEO",
      organization: "TanHeng Technology",
      bio: "Founder and CEO of TanHeng Technology, a climate-tech company focused on carbon management and digital product passports for low-carbon transition.",
      topics: ["Carbon management", "Digitalization"],
      events: ["Top 100 Flagship Products"],
    },
  },
};

export function getSpeakerCategories(locale: Locale = "zh") {
  return speakerCategories.map((category) => ({
    ...category,
    label: speakerCategoryLabels[locale][category.key] ?? category.label,
  }));
}

export function getLocalizedSpeaker(speaker: Speaker, locale: Locale = "zh"): Speaker {
  if (locale === "zh") {
    return speaker;
  }

  const translated = speakerTranslations[speaker.id]?.en;

  return {
    ...speaker,
    name: speaker.nameEn ?? speaker.name,
    title: translated?.title ?? speaker.title,
    organization: translated?.organization ?? speaker.organization,
    bio: translated?.bio ?? speaker.bio,
    topics: translated?.topics ?? speaker.topics,
    events: translated?.events ?? speaker.events,
  };
}

export function getSpeakersByCategory(category: string, locale: Locale = "zh"): Speaker[] {
  const localizedSpeakers = speakers.map((speaker) => getLocalizedSpeaker(speaker, locale));

  if (category === "all") return localizedSpeakers;
  if (category === "keynote") return localizedSpeakers.filter((speaker) => speaker.isKeynote);
  return localizedSpeakers;
}
