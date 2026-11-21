import { getTodayDateJalali, sumDatesJalali } from "@/lib/date/jalali";

type TemplateDataSource = Record<string, any>;

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

export function getTemplateData(customer: TemplateDataSource) {
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
    ? (rawFirstInstallmentDate || sumDatesJalali(getTodayDateJalali(), 1))
    : rawFirstInstallmentDate;
  const todayPersianDate = getTodayDateJalali();
  const contractDate = firstNonEmpty(
    customer.contractDate,
    customer["تاریخ قرارداد"],
    rawDbData["تاریخ قرارداد"],
    todayPersianDate,
  );
  const startDate = firstNonEmpty(
    customer.startDate,
    customer["تاریخ شروع"],
    rawDbData["تاریخ شروع"],
    todayPersianDate,
  );

  return {
    ...rawDbData,
    ...customer,
    contractDate,
    startDate,
    "تاریخ قرارداد": contractDate,
    "تاریخ شروع": startDate,
    applicantName: applicantName ?? "",
    fullName: applicantName ?? "",
    customerTypeTitle: customer.type === "COMPANY" ? "حقوقی" : "حقیقی",
    contractTypeTitle,
    loanTypeTitle,
    // Prefer the Excel's first-installment date when provided; otherwise, for
    // installment loans, calculate it as one month after the server date.
    firstInstallmentDate: calculatedFirstInstallmentDate,
    installmentCount: rawInstallmentCount,
    serverDate: getTodayDateJalali(),
    // Date displayed at the top of every generated contract/template.
    documentDate: firstNonEmpty(customer.contractDate, getTodayDateJalali()),
    // These are CSS class values used by the existing loan-type checkboxes.
    isMaturityLoan: customer.loanType === "MATURITY" ? "checked" : "",
    isInstallmentLoan: customer.loanType === "INSTALLMENT" ? "checked" : "",
    isMorabaha: customer.contractType === "MORABAHA",
    isCreditCard: customer.contractType === "CREDIT_CARD",
  };
}
