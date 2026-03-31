const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type AgendaSlot = {
  agendaDate: string;
  startTime: string;
  endTime: string;
};

export function isValidAgendaDate(value: string) {
  if (!ISO_DATE_PATTERN.test(value)) {
    return false;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function agendaDateToUtcDate(value: string) {
  if (!isValidAgendaDate(value)) {
    return null;
  }

  return new Date(`${value}T00:00:00.000Z`);
}

export function normalizeAgendaDateKey(value: string | Date) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  if (!value) {
    return "";
  }

  return value.slice(0, 10);
}

export function parseTimeToMinutes(value: string) {
  const match = TIME_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  return Number(match[1]) * 60 + Number(match[2]);
}

export function isAgendaTimeRangeValid(startTime: string, endTime: string) {
  const startMinutes = parseTimeToMinutes(startTime);
  const endMinutes = parseTimeToMinutes(endTime);

  if (startMinutes === null || endMinutes === null) {
    return false;
  }

  return startMinutes < endMinutes;
}

export function doAgendaSlotsOverlap(a: AgendaSlot, b: AgendaSlot) {
  if (normalizeAgendaDateKey(a.agendaDate) !== normalizeAgendaDateKey(b.agendaDate)) {
    return false;
  }

  const aStart = parseTimeToMinutes(a.startTime);
  const aEnd = parseTimeToMinutes(a.endTime);
  const bStart = parseTimeToMinutes(b.startTime);
  const bEnd = parseTimeToMinutes(b.endTime);

  if (aStart === null || aEnd === null || bStart === null || bEnd === null) {
    return false;
  }

  return aStart < bEnd && aEnd > bStart;
}

export function isAgendaDateWithinEventRange(
  agendaDate: string,
  startDate: string | Date,
  endDate?: string | Date | null
) {
  const dateKey = normalizeAgendaDateKey(agendaDate);
  const startKey = normalizeAgendaDateKey(startDate);
  const endKey = normalizeAgendaDateKey(endDate || startDate);

  if (!dateKey || !startKey || !endKey) {
    return false;
  }

  return dateKey >= startKey && dateKey <= endKey;
}