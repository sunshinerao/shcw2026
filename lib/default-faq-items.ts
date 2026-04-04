export type DefaultFaqItem = {
  category: string;
  categoryEn: string;
  question: string;
  questionEn: string;
  summary: string;
  summaryEn: string;
  answer: string;
  answerEn: string;
  sortOrder: number;
  isPinned: boolean;
  isPublished: boolean;
};

export const defaultFaqItems: DefaultFaqItem[] = [
  {
    category: "注册与参会",
    categoryEn: "Registration & Participation",
    question: "如何注册参加上海气候周2026？",
    questionEn: "How do I register for Shanghai Climate Week 2026?",
    summary: "通过官网注册并完善基本信息后，即可报名感兴趣的活动。",
    summaryEn: "Register on the website, complete your profile, and then sign up for the events you want to attend.",
    answer: "您可以通过我们的官方网站注册。点击右上角的“立即注册”按钮，填写基本信息后即可完成注册。注册成功后，您可以报名参加感兴趣的活动。",
    answerEn: "You can register through our official website. Click the Register button in the top right corner and fill in your basic information to complete registration. After registration, you can sign up for events that interest you.",
    sortOrder: 1,
    isPinned: true,
    isPublished: true,
  },
  {
    category: "注册与参会",
    categoryEn: "Registration & Participation",
    question: "参加活动需要付费吗？",
    questionEn: "Is there a fee to attend events?",
    summary: "大部分活动免费开放，少量闭门会议或工作坊可能收费。",
    summaryEn: "Most events are free, while some closed-door sessions or workshops may require payment.",
    answer: "上海气候周2026的大部分活动对公众免费开放。部分高端闭门会议或工作坊可能需要付费，具体信息请查看活动详情页面。",
    answerEn: "Most events at Shanghai Climate Week 2026 are free and open to the public. Some exclusive closed-door sessions or workshops may require a fee. Please check the event details page for specific information.",
    sortOrder: 2,
    isPinned: true,
    isPublished: true,
  },
  {
    category: "注册与参会",
    categoryEn: "Registration & Participation",
    question: "如何成为演讲嘉宾或合作伙伴？",
    questionEn: "How can I become a speaker or partner?",
    summary: "嘉宾可在注册时选择对应角色，合作机构可通过合作伙伴页面或直接联系团队。",
    summaryEn: "Prospective speakers can select the relevant role during registration, and partner organizations can apply through the partners page or contact the team directly.",
    answer: "如果您希望成为演讲嘉宾，请在注册时选择“演讲嘉宾”角色，我们的团队会审核您的申请。有意成为合作伙伴的机构，请通过“合作伙伴”页面提交申请或直接联系我们的合作团队。",
    answerEn: "If you wish to be a speaker, please select the Speaker role during registration, and our team will review your application. Organizations interested in becoming partners can submit an application through the Partners page or contact our partnership team directly.",
    sortOrder: 3,
    isPinned: true,
    isPublished: true,
  },
  {
    category: "活动与日程",
    categoryEn: "Events & Schedule",
    question: "活动日程在哪里查看？",
    questionEn: "Where can I view the event schedule?",
    summary: "活动页面会按日期和主题展示完整日程，可筛选后报名。",
    summaryEn: "The Events page shows the full schedule by date and theme, with filtering and registration options.",
    answer: "您可以在网站的“活动”页面查看完整日程。所有活动按日期和主题分类，您可以根据自己的兴趣筛选和报名。",
    answerEn: "You can view the complete schedule on the Events page of the website. All events are categorized by date and theme, and you can filter and register according to your interests.",
    sortOrder: 4,
    isPinned: true,
    isPublished: true,
  },
  {
    category: "活动与日程",
    categoryEn: "Events & Schedule",
    question: "可以取消已报名的活动吗？",
    questionEn: "Can I cancel my event registration?",
    summary: "可在个人中心取消已报名活动，建议至少提前 24 小时操作。",
    summaryEn: "You can cancel registered events in your dashboard, ideally at least 24 hours in advance.",
    answer: "是的，您可以在个人中心的“我的日程”页面取消已报名的活动。请在活动开始前至少24小时取消，以便我们将名额释放给其他参与者。",
    answerEn: "Yes, you can cancel registered events in the My Schedule section of your personal dashboard. Please cancel at least 24 hours before the event starts so we can release the spot to other participants.",
    sortOrder: 5,
    isPinned: true,
    isPublished: true,
  },
  {
    category: "活动与日程",
    categoryEn: "Events & Schedule",
    question: "活动是否提供线上参与方式？",
    questionEn: "Will events offer online participation?",
    summary: "部分重点论坛和峰会提供线上直播，具体以活动详情页为准。",
    summaryEn: "Some major forums and summits offer live streaming; check the event detail page for availability.",
    answer: "部分重要论坛和峰会将提供线上直播，您可以在活动详情页面查看是否有直播选项。线上参与也需要提前注册。",
    answerEn: "Some important forums and summits will offer live streaming. You can check the event details page to see if live streaming is available. Online participation also requires advance registration.",
    sortOrder: 6,
    isPinned: false,
    isPublished: true,
  },
  {
    category: "场馆与交通",
    categoryEn: "Venue & Transportation",
    question: "活动场馆在哪里？",
    questionEn: "Where are the event venues located?",
    summary: "主会场分布在上海多个核心区域，具体地址见活动详情页。",
    summaryEn: "Main venues are distributed across key areas of Shanghai; see each event detail page for exact addresses.",
    answer: "上海气候周2026的主要活动场馆包括上海国际会议中心、上海中心大厦、张江科学城等。具体地址请查看各活动的详情页面。",
    answerEn: "The main venues for Shanghai Climate Week 2026 include the Shanghai International Convention Center, Shanghai Tower, Zhangjiang Science City, and others. Please check each event's details page for specific addresses.",
    sortOrder: 7,
    isPinned: false,
    isPublished: true,
  },
  {
    category: "场馆与交通",
    categoryEn: "Venue & Transportation",
    question: "如何到达活动现场？",
    questionEn: "How do I get to the event venues?",
    summary: "各场馆交通便利，可通过地铁、公交或出租车前往。",
    summaryEn: "All venues are easily accessible by subway, bus, or taxi.",
    answer: "各场馆均位于上海市交通便利的区域，可通过地铁、公交或出租车到达。具体交通指南将在活动前发送给已注册的参与者。",
    answerEn: "All venues are located in easily accessible areas of Shanghai and can be reached by subway, bus, or taxi. Detailed transportation guides will be sent to registered participants before the events.",
    sortOrder: 8,
    isPinned: false,
    isPublished: true,
  },
];