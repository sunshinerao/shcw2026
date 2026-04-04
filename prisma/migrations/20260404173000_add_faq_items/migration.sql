-- CreateTable
CREATE TABLE "faq_items" (
    "id" TEXT NOT NULL,
    "question" TEXT NOT NULL,
    "questionEn" TEXT,
    "summary" TEXT,
    "summaryEn" TEXT,
    "answer" TEXT NOT NULL,
    "answerEn" TEXT,
    "attachmentUrl" TEXT,
    "attachmentName" TEXT,
    "isPinned" BOOLEAN NOT NULL DEFAULT false,
    "isPublished" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "faq_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "faq_items_isPublished_isPinned_sortOrder_idx" ON "faq_items"("isPublished", "isPinned", "sortOrder");

-- Seed initial FAQ items
INSERT INTO "faq_items" (
    "id",
    "question",
    "questionEn",
    "summary",
    "summaryEn",
    "answer",
    "answerEn",
    "isPinned",
    "isPublished",
    "sortOrder",
    "updatedAt"
) VALUES
(
    'faq-register',
    '如何注册参加上海气候周2026？',
    'How do I register for Shanghai Climate Week 2026?',
    '通过官网注册并完善基本信息后，即可报名感兴趣的活动。',
    'Register on the website, complete your profile, and then sign up for the events you want to attend.',
    '您可以通过我们的官方网站注册。点击右上角的“立即注册”按钮，填写基本信息后即可完成注册。注册成功后，您可以报名参加感兴趣的活动。',
    'You can register through our official website. Click the Register button in the top right corner and fill in your basic information to complete registration. After registration, you can sign up for events that interest you.',
    true,
    true,
    1,
    CURRENT_TIMESTAMP
),
(
    'faq-fee',
    '参加活动需要付费吗？',
    'Is there a fee to attend events?',
    '大部分活动免费开放，少量闭门会议或工作坊可能收费。',
    'Most events are free, while some closed-door sessions or workshops may require payment.',
    '上海气候周2026的大部分活动对公众免费开放。部分高端闭门会议或工作坊可能需要付费，具体信息请查看活动详情页面。',
    'Most events at Shanghai Climate Week 2026 are free and open to the public. Some exclusive closed-door sessions or workshops may require a fee. Please check the event details page for specific information.',
    true,
    true,
    2,
    CURRENT_TIMESTAMP
),
(
    'faq-speaker-partner',
    '如何成为演讲嘉宾或合作伙伴？',
    'How can I become a speaker or partner?',
    '嘉宾可在注册时选择对应角色，合作机构可通过合作伙伴页面或直接联系团队。',
    'Prospective speakers can select the relevant role during registration, and partner organizations can apply through the partners page or contact the team directly.',
    '如果您希望成为演讲嘉宾，请在注册时选择“演讲嘉宾”角色，我们的团队会审核您的申请。有意成为合作伙伴的机构，请通过“合作伙伴”页面提交申请或直接联系我们的合作团队。',
    'If you wish to be a speaker, please select the Speaker role during registration, and our team will review your application. Organizations interested in becoming partners can submit an application through the Partners page or contact our partnership team directly.',
    true,
    true,
    3,
    CURRENT_TIMESTAMP
),
(
    'faq-schedule',
    '活动日程在哪里查看？',
    'Where can I view the event schedule?',
    '活动页面会按日期和主题展示完整日程，可筛选后报名。',
    'The Events page shows the full schedule by date and theme, with filtering and registration options.',
    '您可以在网站的“活动”页面查看完整日程。所有活动按日期和主题分类，您可以根据自己的兴趣筛选和报名。',
    'You can view the complete schedule on the Events page of the website. All events are categorized by date and theme, and you can filter and register according to your interests.',
    true,
    true,
    4,
    CURRENT_TIMESTAMP
),
(
    'faq-cancel-registration',
    '可以取消已报名的活动吗？',
    'Can I cancel my event registration?',
    '可在个人中心取消已报名活动，建议至少提前 24 小时操作。',
    'You can cancel registered events in your dashboard, ideally at least 24 hours in advance.',
    '是的，您可以在个人中心的“我的日程”页面取消已报名的活动。请在活动开始前至少24小时取消，以便我们将名额释放给其他参与者。',
    'Yes, you can cancel registered events in the My Schedule section of your personal dashboard. Please cancel at least 24 hours before the event starts so we can release the spot to other participants.',
    true,
    true,
    5,
    CURRENT_TIMESTAMP
),
(
    'faq-online',
    '活动是否提供线上参与方式？',
    'Will events offer online participation?',
    '部分重点论坛和峰会提供线上直播，具体以活动详情页为准。',
    'Some major forums and summits offer live streaming; check the event detail page for availability.',
    '部分重要论坛和峰会将提供线上直播，您可以在活动详情页面查看是否有直播选项。线上参与也需要提前注册。',
    'Some important forums and summits will offer live streaming. You can check the event details page to see if live streaming is available. Online participation also requires advance registration.',
    false,
    true,
    6,
    CURRENT_TIMESTAMP
),
(
    'faq-venue',
    '活动场馆在哪里？',
    'Where are the event venues located?',
    '主会场分布在上海多个核心区域，具体地址见活动详情页。',
    'Main venues are distributed across key areas of Shanghai; see each event detail page for exact addresses.',
    '上海气候周2026的主要活动场馆包括上海国际会议中心、上海中心大厦、张江科学城等。具体地址请查看各活动的详情页面。',
    'The main venues for Shanghai Climate Week 2026 include the Shanghai International Convention Center, Shanghai Tower, Zhangjiang Science City, and others. Please check each event''s details page for specific addresses.',
    false,
    true,
    7,
    CURRENT_TIMESTAMP
),
(
    'faq-transport',
    '如何到达活动现场？',
    'How do I get to the event venues?',
    '各场馆交通便利，可通过地铁、公交或出租车前往。',
    'All venues are easily accessible by subway, bus, or taxi.',
    '各场馆均位于上海市交通便利的区域，可通过地铁、公交或出租车到达。具体交通指南将在活动前发送给已注册的参与者。',
    'All venues are located in easily accessible areas of Shanghai and can be reached by subway, bus, or taxi. Detailed transportation guides will be sent to registered participants before the events.',
    false,
    true,
    8,
    CURRENT_TIMESTAMP
);