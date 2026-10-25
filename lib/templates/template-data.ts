import type { Customer } from "@prisma/client";


function getTehranCalendarDate(date: Date): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-gregory", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(date);
  const part = (type: string) => Number(parts.find((item) => item.type === type)?.value);
  return { year: part("year"), month: part("month"), day: part("day") };
}

function getOneMonthLaterPersianDate(date: Date): string {
  const current = getTehranCalendarDate(date);
  const targetMonthIndex = current.month; // zero-based index of the next month
  const targetYear = current.year + Math.floor(targetMonthIndex / 12);
  const targetMonth = (targetMonthIndex % 12) + 1;
  const lastDay = new Date(Date.UTC(targetYear, targetMonth, 0)).getUTCDate();
  const targetDay = Math.min(current.day, lastDay);
  // Use UTC to represent the already-resolved Tehran calendar date without
  // depending on the machine's local time zone.
  const target = new Date(Date.UTC(targetYear, targetMonth - 1, targetDay, 12));
  return new Intl.DateTimeFormat("fa-IR", {
    timeZone: "UTC",
    calendar: "persian",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(target);
}

function firstNonEmpty(...values: unknown[]): string {
  for (const value of values) {
    if (value !== null && value !== undefined && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return "";
}

function isEmptyDateValue(value: unknown): boolean {
  const text = value === null || value === undefined ? "" : String(value).trim();
  return text === "" || text === "0" || text === "0000/00/00" || text === "0000-00-00";
}

function firstValidDateValue(...values: unknown[]): string {
  for (const value of values) {
    if (!isEmptyDateValue(value)) return String(value).trim();
  }
  return "";
}

function deriveInstallmentCount(durationValue: unknown, intervalValue: unknown): string {
  const duration = Number(String(durationValue ?? "").replace(/[^0-9.]/g, ""));
  const interval = Number(String(intervalValue ?? "").replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(duration) || duration <= 0) return "";
  if (!Number.isFinite(interval) || interval <= 0) return String(Math.floor(duration));
  return String(Math.max(1, Math.floor(duration / interval)));
}

export function getTemplateData(customer: Customer) {
  const applicantName = customer.type === "COMPANY"
    ? customer.companyName
    : customer.name;

  const contractTypeTitle = customer.contractType === "MORABAHA"
    ? "مرابحه"
    : customer.contractType === "CREDIT_CARD"
      ? "مرابحه کارت اعتباری"
      : "خرید دین";

  const loanTypeTitle = customer.loanType === "MATURITY"
    ? "سررسیدی"
    : customer.loanType === "INSTALLMENT"
      ? "اقساط"
      : "";

  // dbExcelData stores every original column from the DB worksheet using its
  // exact Persian header. Spreading it into the template data makes every
  // source value available as {{exact Excel header}} without adding files or
  // losing the existing English placeholder names used by the templates.
  const rawDbData = customer.dbExcelData &&
    typeof customer.dbExcelData === "object" &&
    !Array.isArray(customer.dbExcelData)
      ? customer.dbExcelData as Record<string, unknown>
      : {};

  const rawFirstInstallmentDate = firstValidDateValue(
    customer.firstInstallmentDate,
    rawDbData["تاریخ سررسید اولین قسط"],
    rawDbData["تاریخ اولین قسط"],
  );
  const explicitInstallmentCount = firstNonEmpty(
    customer.installmentCount,
    rawDbData["تعداد اقساط"],
    rawDbData["تعداد قسط"],
  );
  const rawInstallmentCount = explicitInstallmentCount || deriveInstallmentCount(
    customer.contractDuration ?? rawDbData["مدت تسهیلات(به ماه)"],
    customer.installmentInterval ?? rawDbData["فاصله اقساط مبادله ای"],
  );
  const calculatedFirstInstallmentDate = customer.loanType === "INSTALLMENT"
    ? (rawFirstInstallmentDate || getOneMonthLaterPersianDate(new Date()))
    : rawFirstInstallmentDate;

  return {
    ...rawDbData,
    ...customer,
    applicantName: applicantName ?? "",
    fullName: applicantName ?? "",
    customerTypeTitle: customer.type === "COMPANY" ? "حقوقی" : "حقیقی",
    contractTypeTitle,
    loanTypeTitle,
    // Prefer the Excel's first-installment date when provided; otherwise, for
    // installment loans, calculate it as one month after the server date.
    firstInstallmentDate: calculatedFirstInstallmentDate,
    installmentCount: rawInstallmentCount,
    serverDate: new Intl.DateTimeFormat("fa-IR", {
      timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date()),
    // Date displayed at the top of every generated contract/template.
    documentDate: firstNonEmpty(customer.contractDate, new Intl.DateTimeFormat("fa-IR", {
      timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit",
    }).format(new Date())),
    // These are CSS class values used by the existing loan-type checkboxes.
    isMaturityLoan: customer.loanType === "MATURITY" ? "checked" : "",
    isInstallmentLoan: customer.loanType === "INSTALLMENT" ? "checked" : "",
    isMorabaha: customer.contractType === "MORABAHA",
    isCreditCard: customer.contractType === "CREDIT_CARD",
  };
}
