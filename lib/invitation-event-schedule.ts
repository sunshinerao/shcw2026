type InvitationLanguage = "zh" | "en";

type InvitationEventDateSlot = {
  scheduleDate: Date | string;
  startTime: string;
  endTime: string;
};

type InvitationEventScheduleInput = {
  language: InvitationLanguage;
  startDate?: Date | null;
  endDate?: Date | null;
  startTime?: string | null;
  endTime?: string | null;
  eventDateSlots?: InvitationEventDateSlot[] | null;
};

function toDateKey(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function formatFullDate(value: Date, language: InvitationLanguage): string {
  return language === "en"
    ? value.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : value.toLocaleDateString("zh-CN", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
}

export function formatInvitationEventSchedule(input: InvitationEventScheduleInput): {
  eventDateText: string;
  eventTimeText: string;
} {
  const { language, startDate, endDate, startTime, endTime, eventDateSlots } = input;

  if (!startDate) {
    return {
      eventDateText: language === "en" ? "April 20 - April 28, 2026" : "2026年4月20日 - 2026年4月28日",
      eventTimeText: language === "en" ? "See event information on our website" : "详见网站活动信息",
    };
  }

  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate ?? startDate);
  const startKey = toDateKey(start);
  const endKey = toDateKey(end);
  const isCrossDay = startKey !== endKey;
  const separator = language === "en" ? " – " : " - ";

  const eventDateText = isCrossDay
    ? `${formatFullDate(start, language)}${separator}${formatFullDate(end, language)}`
    : formatFullDate(start, language);

  const normalizedSlots = Array.isArray(eventDateSlots)
    ? eventDateSlots
        .filter((slot) => slot?.scheduleDate && slot?.startTime && slot?.endTime)
        .map((slot) => ({
          scheduleDate: normalizeDate(slot.scheduleDate),
          startTime: slot.startTime,
          endTime: slot.endTime,
        }))
        .sort((left, right) => {
          const byDate = toDateKey(left.scheduleDate).localeCompare(toDateKey(right.scheduleDate));
          if (byDate !== 0) return byDate;
          return left.startTime.localeCompare(right.startTime);
        })
    : [];

  if (normalizedSlots.length > 1) {
    const slotSeparator = language === "en" ? "; " : "；";
    return {
      eventDateText,
      eventTimeText: normalizedSlots
        .map((slot) => `${formatFullDate(slot.scheduleDate, language)} ${slot.startTime}${separator}${slot.endTime}`)
        .join(slotSeparator),
    };
  }

  if (startTime && endTime) {
    return {
      eventDateText,
      eventTimeText: isCrossDay
        ? `${formatFullDate(start, language)} ${startTime}${separator}${formatFullDate(end, language)} ${endTime}`
        : `${startTime}${separator}${endTime}`,
    };
  }

  return {
    eventDateText,
    eventTimeText: startTime || endTime || (language === "en" ? "See event information on our website" : "详见网站活动信息"),
  };
}