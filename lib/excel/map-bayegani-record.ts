import type { Prisma } from "@prisma/client";
import type { DbExcelRow } from "./types";

function normalize(value: string): string {
  return value
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\s]+/g, " ")
    .trim()
    .toLocaleLowerCase();
}

function read(row: DbExcelRow, ...headers: string[]): string | null {
  const entries = new Map(Object.entries(row).map(([key, value]) => [normalize(key), value]));
  for (const header of headers) {
    const value = entries.get(normalize(header));
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return null;
}

function readByHeaderPart(row: DbExcelRow, ...parts: string[]): string | null {
  const normalizedParts = parts.map(normalize);
  for (const [header, value] of Object.entries(row)) {
    const key = normalize(header);
    if (normalizedParts.every((part) => key.includes(part)) &&
        value !== null && value !== undefined && String(value).trim()) {
      return String(value).trim();
    }
  }
  return null;
}

function normalizeDigits(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function serialSortValue(serial: string | null): bigint | null {
  if (!serial) return null;
  const digits = normalizeDigits(serial).replace(/[^0-9]/g, "");
  if (!digits || digits.length > 18) return null;
  try {
    return BigInt(digits);
  } catch {
    return null;
  }
}

/** Maps the uploaded DB-sheet row into persisted archive columns. rawData remains the untouched source row. */
export function mapBayeganiExcelRow(
  row: DbExcelRow,
  contractCode: string,
  rawData: Prisma.InputJsonObject,
) {
  const fullApplicantName = read(
    row,
    "نام و نام خانوادگی مدیون",
    "نام و نام خانوادگی متقاضی",
    "نام و نام خانوادگی مشتری",
    "نام مدیون",
    "نام متقاضی",
  );
  const applicantName = fullApplicantName ||
    [read(row, "نام مدیون", "نام متقاضی", "نام"), read(row, "نام خانوادگی مدیون", "نام خانوادگی متقاضی", "نام خانوادگی")]
      .filter(Boolean).join(" ") || null;
  const facilityType = read(
    row,
    "نوع تسهیلات",
    "نوع تسهیلات(انتخاب شود)",
    "نوع وام",
    "عنوان تسهیلات",
    "عنوان قرارداد",
  );
  const explicitTitle = read(row, "عنوان تسهیلات", "عنوان تسهيلات", "عنوان قرارداد");
  const facilityTitle = [facilityType, applicantName].filter(Boolean).join(" ") || explicitTitle;

  const serial =
    read(row, "سریال", "شماره سریال", "سریال تسهیلات", "سریال پرونده", "شماره سریال تسهیلات") ??
    readByHeaderPart(row, "سریال");

  const counterCode = read(row, "کد باجه", "کد باجه عامل", "کدباجه");
  const counterName = read(row, "نام باجه", "نام باجه عامل");
  const counterLabel = counterCode && counterName
    ? `${counterCode}-${counterName}`
    : counterCode || counterName;

  const facilityNumber = read(
    row,
    "شماره تسهیلات",
    "شماره تسهیلات اعطایی",
    "شماره پرونده تسهیلات",
    "شماره قرارداد تسهیلات",
    "شماره تسهیلات/قرارداد",
  );
  const customerNumber = read(
    row,
    "شماره مشتری مدیون",
    "شماره مشتری",
    "شماره مشتری تسهیلات",
    "کد مشتری",
  );

  return {
    contractCode,
    nationalId: read(row, "کدملی/شناسه ملی مدیون", "کد ملی مدیون", "کد ملی", "شناسه ملی"),
    customerNumber,
    facilityNumber,
    archiveCode: read(row, "کد بایگانی", "شماره بایگانی", "کد آرشیو"),
    facilityTitle,
    serial,
    serialSort: serialSortValue(serial),
    classification: read(row, "طبقه", "طبقه تسهیلات", "طبقه‌بندی", "طبقه بندی", "طبقه بایگانی"),
    counterName,
    counterCode,
    counterLabel,
    status: read(row, "وضعیت", "وضعیت تسهیلات", "وضعیت کنونی") ?? "فعال",
    startDate: read(row, "تاریخ شروع", "تاریخ شروع تسهیلات", "تاریخ شروع قرارداد", "تاریخ قرارداد/اعطاء", "تاریخ اعطاء"),
    endDate: read(row, "تاریخ پایان", "تاریخ پایان تسهیلات", "تاریخ پایان قرارداد", "تاریخ سررسید", "پایان قرارداد"),
    duration: read(row, "مدت", "مدت تسهیلات", "مدت تسهیلات(به ماه)", "مدت تسهیلات (به ماه)", "مدت قرارداد"),
    installmentCount: read(row, "تعداد اقساط", "تعداد قسط", "تعداد اقساط تسهیلات"),
    approvedAmount: read(row, "مبلغ مصوب", "مبلغ تسهیلات", "مبلغ تسهیلات اعطایی(سهم بانک)", "مبلغ تسهیلات اعطایی"),
    remainingAmount: read(row, "مانده تسهیلات", "مانده بدهی", "مانده اصل تسهیلات"),
    rawData,
  };
}
