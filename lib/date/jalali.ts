const PERSIAN_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const ARABIC_DIGITS = "٠١٢٣٤٥٦٧٨٩";

function normalizeDigits(value: unknown): string {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)));
}

function getCalendarParts(date: Date, calendar = "persian"): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat(`en-US-u-ca-${calendar}-nu-latn`, {
    timeZone: "UTC",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
  return { year: read("year"), month: read("month"), day: read("day") };
}

function findGregorianDateForJalali(year: number, month: number, day: number): Date | null {
  const formatter = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
    timeZone: "UTC",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  // Jalali new year falls around March 20/21. Month lengths before the
  // requested date are deterministic, so only a small boundary window is needed.
  const daysBeforeMonth = month <= 6
    ? (month - 1) * 31
    : 186 + (month - 7) * 30;
  const approximateTime = Date.UTC(year + 621, 2, 19 + daysBeforeMonth + day - 1, 12);
  for (let offset = -3; offset <= 3; offset += 1) {
    const date = new Date(approximateTime + offset * 86400000);
    const parts = formatter.formatToParts(date);
    const read = (type: string) => Number(parts.find((part) => part.type === type)?.value);
    if (read("year") === year && read("month") === month && read("day") === day) return date;
  }
  return null;
}

function parseDate(value: unknown): { year: number; month: number; day: number } | null {
  const normalized = normalizeDigits(value).trim();
  const match = normalized.match(/^(\d{4})[\/.-](\d{1,2})[\/.-](\d{1,2})/);
  if (!match) return null;
  let year = Number(match[1]);
  let month = Number(match[2]);
  let day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  if (year >= 1700) {
    const gregorian = new Date(Date.UTC(year, month - 1, day, 12));
    if (
      gregorian.getUTCFullYear() !== year ||
      gregorian.getUTCMonth() !== month - 1 ||
      gregorian.getUTCDate() !== day
    ) return null;
    return getCalendarParts(gregorian);
  }

  if (year < 1200) return null;
  if (!findGregorianDateForJalali(year, month, day)) return null;
  return { year, month, day };
}

/** Returns today's date in the Persian (Jalali) calendar, using Tehran time. */
export function getTodayDateJalali(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "Asia/Tehran",
    calendar: "persian",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Adds a number of months to a Jalali date. Accepts Persian/Arabic digits and ISO dates. */
export function sumDatesJalali(startDate: unknown, durationInMonths: unknown): string {
  const start = parseDate(startDate);
  const durationText = normalizeDigits(durationInMonths);
  const durationMatch = durationText.match(/\d+(?:\.\d+)?/);
  const months = durationMatch ? Number(durationMatch[0]) : Number.NaN;
  if (!start || !Number.isFinite(months) || months < 0) return "";

  const totalMonth = start.year * 12 + start.month - 1 + Math.trunc(months);
  const targetYear = Math.floor(totalMonth / 12);
  const targetMonth = (totalMonth % 12) + 1;
  const firstDay = findGregorianDateForJalali(targetYear, targetMonth, 1);
  if (!firstDay) return "";

  let lastDay = 1;
  for (let day = 2; day <= 31; day += 1) {
    if (findGregorianDateForJalali(targetYear, targetMonth, day)) lastDay = day;
    else break;
  }

  const targetDay = Math.min(start.day, lastDay);
  const targetDate = findGregorianDateForJalali(targetYear, targetMonth, targetDay);
  if (!targetDate) return "";
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "UTC",
    calendar: "persian",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(targetDate);
}

export function getCurrentShamsiDate(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}
