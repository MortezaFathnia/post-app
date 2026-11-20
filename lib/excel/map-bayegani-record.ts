import type { Prisma } from "@prisma/client";
import type { DbExcelRow } from "./types";

function read(row: DbExcelRow, ...headers: string[]): string | null {
  const normalize = (value: string) =>
    value.replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[\u200c\s]+/g, " ").trim().toLocaleLowerCase();
  const entries = new Map(Object.entries(row).map(([key, value]) => [normalize(key), value]));
  for (const header of headers) {
    const value = entries.get(normalize(header));
    if (value !== undefined && value !== null && String(value).trim() !== "") {
      return String(value).trim();
    }
  }
  return null;
}

/** Maps the uploaded DB-sheet row into the archive columns. Keep rawData as the full source row. */
export function mapBayeganiExcelRow(
  row: DbExcelRow,
  contractCode: string,
  rawData: Prisma.InputJsonObject,
) {
  return {
    contractCode,
    nationalId: read(row, "کدملی/شناسه ملی مدیون", "کد ملی مدیون", "کد ملی", "شناسه ملی"),
    customerNumber: read(row, "شماره مشتری مدیون", "شماره مشتری", "کد مشتری"),
    facilityNumber: read(row, "شماره تسهیلات", "شماره تسهیلات اعطایی", "شماره پرونده تسهیلات", "شماره قرارداد تسهیلات"),
    archiveCode: read(row, "کد بایگانی", "شماره بایگانی", "کد آرشیو"),
    facilityTitle: read(row, "عنوان تسهیلات", "عنوان قرارداد", "مورد مصرف(انتخاب شود)", "مورد مصرف"),
    serial: read(row, "سریال", "شماره سریال", "سریال تسهیلات"),
    classification: read(row, "طبقه", "طبقه تسهیلات", "طبقه‌بندی", "طبقه بندی"),
    counterName: read(row, "نام باجه", "نام باجه عامل"),
    counterCode: read(row, "کد باجه", "کد باجه عامل"),
    counterLabel: (() => {
      const code = read(row, "کد باجه", "کد باجه عامل");
      const name = read(row, "نام باجه", "نام باجه عامل");
      return code && name ? `${code}-${name}` : code || name;
    })(),
    status: read(row, "وضعیت", "وضعیت تسهیلات", "وضعیت کنونی") ?? "فعال",
    startDate: read(row, "تاریخ شروع", "تاریخ شروع تسهیلات", "تاریخ قرارداد/اعطاء"),
    endDate: read(row, "تاریخ پایان", "تاریخ پایان تسهیلات", "تاریخ سررسید", "پایان قرارداد"),
    duration: read(row, "مدت", "مدت تسهیلات", "مدت تسهیلات(به ماه)"),
    installmentCount: read(row, "تعداد اقساط", "تعداد قسط", "تعداد اقساط تسهیلات"),
    approvedAmount: read(row, "مبلغ مصوب", "مبلغ تسهیلات", "مبلغ تسهیلات اعطایی(سهم بانک)", "مبلغ تسهیلات اعطایی"),
    remainingAmount: read(row, "مانده تسهیلات", "مانده بدهی", "مانده اصل تسهیلات"),
    rawData,
  };
}
