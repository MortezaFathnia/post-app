/** Add a number of calendar months to a Persian (Jalali) or Gregorian date. */
function normalizeDateDigits(value: string) {
  return value.replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function isJalaliLeapYear(year: number) {
  const breaks = [-61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210, 1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178];
  let jp = breaks[0];
  let jump = 0;
  for (let i = 1; i < breaks.length; i += 1) {
    const jm = breaks[i];
    jump = jm - jp;
    if (year < jm) break;
    jp = jm;
  }
  let n = year - jp;
  let leapJ = -14;
  for (let i = 1; i < breaks.length && jp < year; i += 1) {
    const jm = breaks[i];
    const span = jm - jp;
    leapJ += Math.floor(span / 33) * 8 + Math.floor((span % 33) / 4);
    jp = jm;
  }
  leapJ += Math.floor(n / 33) * 8 + Math.floor(((n % 33) + 3) / 4);
  if (jump % 33 === 4 && jump - n === 4) leapJ += 1;
  const gy = year + 621;
  const leapG = Math.floor(gy / 4) - Math.floor((Math.floor(gy / 100) + 1) * 3 / 4) - 150;
  const march = 20 + leapJ - leapG;
  if (jump - n < 6) n = n - jump + Math.floor((jump + 4) / 33) * 33;
  let leap = ((n + 1) % 33 - 1) % 4;
  if (leap === -1) leap = 4;
  return leap === 0 && march > 0;
}

function daysInMonth(year: number, month: number, jalali: boolean) {
  if (jalali) {
    if (month <= 6) return 31;
    if (month <= 11) return 30;
    return isJalaliLeapYear(year) ? 30 : 29;
  }
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function addMonthsToDate(startDate: string, duration: string) {
  const dateMatch = normalizeDateDigits(startDate).trim().match(/^(\d{4})([\/-])(\d{1,2})\2(\d{1,2})$/);
  const monthsText = normalizeDateDigits(duration).replace(/[,٬،\s]/g, "").trim();
  if (!dateMatch || !/^\d+$/.test(monthsText)) return "";
  const year = Number(dateMatch[1]);
  const month = Number(dateMatch[3]);
  const day = Number(dateMatch[4]);
  const months = Number(monthsText);
  const jalali = year >= 1200 && year <= 1600;
  if (!Number.isSafeInteger(months) || month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month, jalali)) return "";
  const totalMonths = year * 12 + month - 1 + months;
  const targetYear = Math.floor(totalMonths / 12);
  const targetMonth = totalMonths % 12 + 1;
  const targetDay = Math.min(day, daysInMonth(targetYear, targetMonth, jalali));
  const result = [targetYear, String(targetMonth).padStart(2, "0"), String(targetDay).padStart(2, "0")].join(dateMatch[2]);
  return /[۰-۹]/.test(startDate) ? result.replace(/[0-9]/g, (digit) => "۰۱۲۳۴۵۶۷۸۹"[Number(digit)]) : result;
}
