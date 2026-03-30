export const EVENT_PASS_ENTRY_WINDOW_MS = 90 * 60 * 1000;
export const EVENT_PASS_QR_TTL_MS = 60 * 1000;

export type SupportedLocale = "zh" | "en";
export type EventPassState = "upcoming" | "active" | "checkedIn" | "expired" | "pendingApproval" | "rejected";

interface EventTimeInput {
  startDate: Date | string;
  startTime: string;
  endTime: string;
  checkedInAt?: Date | string | null;
}

interface PassportAchievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
}

export function combineEventDateTime(dateValue: Date | string, timeValue: string) {
  const eventDate = new Date(dateValue);
  const [hours, minutes] = timeValue.split(":").map((part) => Number.parseInt(part, 10));
  const combined = new Date(eventDate);
  combined.setHours(hours || 0, minutes || 0, 0, 0);
  return combined;
}

export function getEventDurationMinutes(dateValue: Date | string, startTime: string, endTime: string) {
  const startAt = combineEventDateTime(dateValue, startTime);
  const endAt = combineEventDateTime(dateValue, endTime);
  return Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60000));
}

export function getEventPassState(event: EventTimeInput, now = new Date()): EventPassState {
  if (event.checkedInAt) {
    return "checkedIn";
  }

  const startAt = combineEventDateTime(event.startDate, event.startTime);
  const endAt = combineEventDateTime(event.startDate, event.endTime);
  const entryOpenAt = new Date(startAt.getTime() - EVENT_PASS_ENTRY_WINDOW_MS);

  if (now > endAt) {
    return "expired";
  }

  if (now < entryOpenAt) {
    return "upcoming";
  }

  return "active";
}

export function formatLearningHours(totalMinutes: number, locale: SupportedLocale) {
  const hours = Math.round((totalMinutes / 60) * 10) / 10;
  if (locale === "en") {
    return `${hours} hrs`;
  }
  return `${hours} 小时`;
}

export function buildPassportAchievements(
  input: {
    hasPassport: boolean;
    registeredCount: number;
    attendedCount: number;
    wishlistCount: number;
    points: number;
    learningMinutes: number;
  },
  locale: SupportedLocale
): PassportAchievement[] {
  const labels = locale === "en"
    ? {
        issued: ["Passport Issued", "Your climate identity has been activated."],
        registered: ["First Registration", "You have completed your first event registration."],
        attended: ["On-site Participant", "You have completed at least one on-site check-in."],
        connector: ["Community Connector", "You are actively curating your event schedule."],
        points: ["Point Pioneer", "You have earned at least 20 climate action points."],
        learner: ["Steady Learner", "You have accumulated at least 2 hours of event learning time."],
      }
    : {
        issued: ["护照已签发", "您的气候身份已经激活。"],
        registered: ["首次报名", "您已完成第一次活动报名。"],
        attended: ["现场参与者", "您已完成至少一次现场签到。"],
        connector: ["议程连接者", "您正在积极管理自己的活动安排。"],
        points: ["积分先锋", "您已累计获得至少 20 分气候积分。"],
        learner: ["持续学习者", "您已累计至少 2 小时活动学习时长。"],
      };

  return [
    {
      id: "passport-issued",
      title: labels.issued[0],
      description: labels.issued[1],
      unlocked: input.hasPassport,
    },
    {
      id: "first-registration",
      title: labels.registered[0],
      description: labels.registered[1],
      unlocked: input.registeredCount >= 1,
    },
    {
      id: "on-site-participant",
      title: labels.attended[0],
      description: labels.attended[1],
      unlocked: input.attendedCount >= 1,
    },
    {
      id: "community-connector",
      title: labels.connector[0],
      description: labels.connector[1],
      unlocked: input.registeredCount + input.wishlistCount >= 4,
    },
    {
      id: "point-pioneer",
      title: labels.points[0],
      description: labels.points[1],
      unlocked: input.points >= 20,
    },
    {
      id: "steady-learner",
      title: labels.learner[0],
      description: labels.learner[1],
      unlocked: input.learningMinutes >= 120,
    },
  ];
}