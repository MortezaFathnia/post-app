import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

function serialNumber(value: string | null): bigint | null {
  if (!value) return null;
  const normalized = value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[\\u200e\\u200f\\u202a-\\u202e\\u2066-\\u2069\\s,٬]/g, "");
  return /^\\d+$/.test(normalized) ? BigInt(normalized) : null;
}

function compareSerial(a: string | null, b: string | null): number {
  const aValue = serialNumber(a);
  const bValue = serialNumber(b);
  if (aValue === null && bValue !== null) return 1;
  if (aValue !== null && bValue === null) return -1;
  if (aValue !== null && bValue !== null && aValue !== bValue) return aValue < bValue ? -1 : 1;
  return 0;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function asCell(value: unknown): string | number | boolean | Date {
  if (value === null || value === undefined) return "";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return value;
  if (value instanceof Date) return value;
  return JSON.stringify(value);
}

export async function GET() {
  try {
    // Read every row; this endpoint does not write to or delete database records.
    const records = await prisma.bayeganiRecord.findMany({
      orderBy: [{ serialSort: { sort: "asc", nulls: "last" } }, { sourceRow: "asc" }, { id: "asc" }],
      select: {
        id: true,
        sourceFile: true,
        sheetName: true,
        sourceRow: true,
        facilityNumber: true,
        customerNumber: true,
        archiveCode: true,
        facilityTitle: true,
        serial: true,
        classification: true,
        counterName: true,
        counterCode: true,
        counterLabel: true,
        status: true,
        startDate: true,
        endDate: true,
        duration: true,
        approvedAmount: true,
        remainingAmount: true,
        nationalId: true,
        rawData: true,
      },
    });

    const metadataHeaders = [
      "شناسه رکورد",
      "نام فایل",
      "نام برگه",
      "شماره ردیف در فایل",
      "شماره تسهیلات",
      "شماره مشتری",
      "کد بایگانی",
      "عنوان تسهیلات",
      "سریال",
      "طبقه",
      "کد باجه",
      "نام باجه",
      "کدباجه-نام باجه",
      "وضعیت کنونی",
      "تاریخ شروع",
      "پایان قرارداد",
      "مدت",
      "مبلغ مصوب",
      "مانده تسهیلات",
      "کد ملی",
    ];
    const rawHeaders = new Set<string>();
    for (const record of records) {
      const raw = record.rawData;
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        for (const key of Object.keys(raw as Record<string, unknown>)) rawHeaders.add(key);
      }
    }
    // Keep original Persian Excel headers, followed by stable Persian database columns.
    const headers = [...rawHeaders, ...metadataHeaders.filter((header) => !rawHeaders.has(header))];
    const rows = records.map((record) => {
      const raw = record.rawData && typeof record.rawData === "object" && !Array.isArray(record.rawData)
        ? record.rawData as Record<string, unknown>
        : {};
      const row: Record<string, string | number | boolean | Date> = {};
      for (const header of rawHeaders) row[header] = asCell(raw[header]);
      Object.assign(row, {
        "شناسه رکورد": record.id,
        "نام فایل": record.sourceFile,
        "نام برگه": record.sheetName,
        "شماره ردیف در فایل": record.sourceRow,
        "شماره تسهیلات": record.facilityNumber ?? "",
        "شماره مشتری": record.customerNumber ?? "",
        "کد بایگانی": record.archiveCode ?? "",
        "عنوان تسهیلات": record.facilityTitle ?? "",
        "سریال": record.serial ?? (raw["سریال"] == null ? "" : asCell(raw["سریال"])),
        "طبقه": record.classification ?? "",
        "کد باجه": record.counterCode ?? "",
        "نام باجه": record.counterName ?? "",
        "کدباجه-نام باجه": record.counterLabel ?? "",
        "وضعیت کنونی": record.status ?? "",
        "تاریخ شروع": record.startDate ?? "",
        "پایان قرارداد": record.endDate ?? "",
        "مدت": record.duration ?? "",
        "مبلغ مصوب": record.approvedAmount ?? "",
        "مانده تسهیلات": record.remainingAmount ?? "",
        "کد ملی": record.nationalId ?? "",
      });
      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(rows, { header: headers, skipHeader: false });
    worksheet["!views"] = [{ rightToLeft: true }];
    worksheet["!cols"] = headers.map((header) => ({ wch: Math.min(32, Math.max(14, header.length + 3)) }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "رکوردهای بایگانی");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename*=UTF-8''bayegani-records.xlsx",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Bayegani Excel export error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "خطا در تهیه خروجی اکسل." },
      { status: 500 },
    );
  }
}
