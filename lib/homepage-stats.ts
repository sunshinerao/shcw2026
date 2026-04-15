export type DateRangeEventLike = {
  startDate: string | Date;
  endDate: string | Date;
};

export type HomepageStatsSnapshot = {
  eventDays: number;
  forums: number;
  speakers: number;
  attendees: number;
};

export type HomepageStatKey = "days" | "forums" | "speakers" | "attendees";

function toUtcDate(value: string | Date): Date {
  if (value instanceof Date) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }

  const safe = value.slice(0, 10);
  const [year, month, day] = safe.split("-").map(Number);
  return new Date(Date.UTC(year, (month || 1) - 1, day || 1));
}

export function countDistinctEventDays(events: DateRangeEventLike[]): number {
  const dateSet = new Set<string>();

  for (const event of events) {
    const start = toUtcDate(event.startDate);
    const end = toUtcDate(event.endDate);
    const current = new Date(start);

    while (current <= end) {
      dateSet.add(current.toISOString().slice(0, 10));
      current.setUTCDate(current.getUTCDate() + 1);
    }
  }

  return dateSet.size;
}

export function getEventDateSpan(events: DateRangeEventLike[]) {
  if (events.length === 0) {
    return null;
  }

  let earliest = toUtcDate(events[0].startDate);
  let latest = toUtcDate(events[0].endDate);

  for (const event of events) {
    const start = toUtcDate(event.startDate);
    const end = toUtcDate(event.endDate);

    if (start < earliest) {
      earliest = start;
    }

    if (end > latest) {
      latest = end;
    }
  }

  return {
    start: earliest,
    end: latest,
  };
}

export function formatEventDateRange(
  startDate: string | Date,
  endDate: string | Date,
  locale: string,
): string {
  const start = toUtcDate(startDate);
  const end = toUtcDate(endDate);

  const startYear = start.getUTCFullYear();
  const endYear = end.getUTCFullYear();
  const startMonth = start.getUTCMonth() + 1;
  const endMonth = end.getUTCMonth() + 1;
  const startDay = start.getUTCDate();
  const endDay = end.getUTCDate();

  if (locale === "en") {
    const months = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    if (startYear === endYear && startMonth === endMonth) {
      return `${months[startMonth - 1]} ${startDay}-${endDay}, ${startYear}`;
    }

    if (startYear === endYear) {
      return `${months[startMonth - 1]} ${startDay} - ${months[endMonth - 1]} ${endDay}, ${startYear}`;
    }

    return `${months[startMonth - 1]} ${startDay}, ${startYear} - ${months[endMonth - 1]} ${endDay}, ${endYear}`;
  }

  if (startYear === endYear && startMonth === endMonth) {
    return `${startYear}年${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`;
  }

  if (startYear === endYear) {
    return `${startYear}年${startMonth}月${startDay}日 - ${endMonth}月${endDay}日`;
  }

  return `${startYear}年${startMonth}月${startDay}日 - ${endYear}年${endMonth}月${endDay}日`;
}

export function formatEventDateRangeFromEvents(events: DateRangeEventLike[], locale: string): string | null {
  const span = getEventDateSpan(events);

  if (!span) {
    return null;
  }

  return formatEventDateRange(span.start, span.end, locale);
}

export function buildHomepageStats(data: HomepageStatsSnapshot, showAttendees: boolean) {
  const items: Array<{ key: HomepageStatKey; value: string }> = [
    { key: "days", value: data.eventDays > 0 ? `${data.eventDays}+` : "0" },
    { key: "forums", value: data.forums > 0 ? `${data.forums}+` : "0" },
    { key: "speakers", value: data.speakers > 0 ? `${data.speakers}+` : "0" },
  ];

  if (showAttendees) {
    items.push({ key: "attendees", value: data.attendees > 0 ? `${data.attendees}+` : "0" });
  }

  return items;
}
