type EventRegistrationWindow = {
  startDate?: string | Date | null;
  startTime?: string | null;
  isClosed?: boolean | null;
};

const SHANGHAI_UTC_OFFSET_HOURS = 8;
const DEFAULT_REGISTRATION_GRACE_MINUTES = 60;

function parseDateKey(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 10) : null;
}

function parseTimeParts(value: string | null | undefined) {
  if (typeof value !== "string") {
    return null;
  }

  const match = value.trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) {
    return null;
  }

  const hours = Number.parseInt(match[1], 10);
  const minutes = Number.parseInt(match[2], 10);

  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }

  return { hours, minutes };
}

function getEventStartInstant(event: EventRegistrationWindow) {
  const dateKey = parseDateKey(event.startDate);
  const timeParts = parseTimeParts(event.startTime);

  if (!dateKey || !timeParts) {
    return null;
  }

  const [year, month, day] = dateKey.split("-").map((part) => Number.parseInt(part, 10));
  if ([year, month, day].some((part) => Number.isNaN(part))) {
    return null;
  }

  return new Date(
    Date.UTC(year, month - 1, day, timeParts.hours - SHANGHAI_UTC_OFFSET_HOURS, timeParts.minutes, 0, 0)
  );
}

export function getEventRegistrationDeadline(event: EventRegistrationWindow) {
  const startInstant = getEventStartInstant(event);
  if (!startInstant) {
    return null;
  }

  return new Date(startInstant.getTime() + DEFAULT_REGISTRATION_GRACE_MINUTES * 60 * 1000);
}

export function isEventRegistrationDeadlinePassed(event: EventRegistrationWindow, now = new Date()) {
  const deadline = getEventRegistrationDeadline(event);
  if (!deadline) {
    return false;
  }

  return now.getTime() >= deadline.getTime();
}

export function isEventRegistrationUnavailable(event: EventRegistrationWindow, now = new Date()) {
  return Boolean(event.isClosed) || isEventRegistrationDeadlinePassed(event, now);
}