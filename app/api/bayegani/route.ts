import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const REMOVED_RAW_FIELDS = ["column1", "column3", "column23", "column24"] as const;

function removeUnwantedColumns(rawData: Record<string, unknown>) {
  for (const key of REMOVED_RAW_FIELDS) delete rawData[key];
  return rawData;
}

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}
function emptyRow(row: unknown[]) {
  return row.every((value) => cell(value) === "");
}
function findValue(record: Record<string, unknown>, ...headers: string[]) {
  for (const header of headers) {
    const value = record[header];
    if (value !== undefined && value !== null && cell(value) !== "") return cell(value);
  }
  return "";
}
function normalizeCounter(rawData: Record<string, unknown>) {
  let name = findValue(rawData, "نام باجه");
  let code = findValue(rawData, "کد باجه", "باجه");
  const combined = name.match(/^(\\d+)\\s*-\\s*(.+)$/);
  if (combined) {
    if (!code) code = combined[1];
    name = combined[2].trim();
  }
  if (name) rawData["نام باجه"] = name;
  if (code) rawData["کد باجه"] = code;
  return { name, code };
}

function customerNumberFromFacility(facilityNumber: string): string {
  const parts = facilityNumber.trim().split(".");
  return parts.length >= 3 ? (parts[2] || "").trim() : "";
}

function mapRow(rawData: Record<string, unknown>) {
  const facilityNumber = findValue(rawData, "شماره تسهيلات", "شماره تسهیلات");
  const derivedCustomerNumber = customerNumberFromFacility(facilityNumber);
  const customerNumber = derivedCustomerNumber || findValue(rawData, "شماره مشتری", "شماره مشتري");
  if (derivedCustomerNumber) rawData["شماره مشتری"] = derivedCustomerNumber;
  const counter = normalizeCounter(rawData);

  return {
    facilityNumber,
    customerNumber,
    archiveCode: findValue(rawData, "کد بایگانی", "شماره بایگانی", "کد بایگانی جدید"),
    facilityTitle: findValue(rawData, "عنوان تسهیلات", "عنوان تسهيلات"),
    serial: findValue(rawData, "سریال", "سریال2"),
    classification: findValue(rawData, "طبقه", "طبقه بایگانی"),
    counterName: counter.name,
    counterCode: counter.code,
    status: findValue(rawData, "وضعيت کنونی", "وضعیت کنونی"),
    startDate: findValue(rawData, "تاريخ شروع", "تاریخ شروع"),
    endDate: findValue(rawData, " پایان قرارداد", "پایان قرارداد", "تاریخ پایان قرارداد"),
    duration: findValue(rawData, "مدت", "24"),
    approvedAmount: findValue(rawData, "مبلغ مصوب", "مبلغ"),
    remainingAmount: findValue(rawData, "مانده تسهيلات", "مانده تسهیلات"),
    nationalId: findValue(rawData, "کد ملي ", "کد ملي مشتري", "کد ملی"),
  };
}

export async function GET() {
  try {
    // Clean unwanted keys from previously saved JSON records.
    await prisma.$executeRaw`UPDATE "BayeganiRecord" SET "rawData" = "rawData" - ARRAY['column1', 'column3', 'column23', 'column24']::text[] WHERE "rawData" ?| ARRAY['column1', 'column3', 'column23', 'column24']::text[]`;
    const records = await prisma.bayeganiRecord.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
      take: 300,
      select: {
        id: true, sheetName: true, sourceRow: true, facilityNumber: true,
        customerNumber: true, archiveCode: true, facilityTitle: true, serial: true,
        classification: true, status: true, startDate: true, endDate: true,
        approvedAmount: true, remainingAmount: true, nationalId: true,
      },
    });
    const total = await prisma.bayeganiRecord.count();
    return NextResponse.json({ success: true, records, total });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "خطا در دریافت اطلاعات" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return NextResponse.json({ success: false, error: "فایل Excel را انتخاب کنید." }, { status: 400 });
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false });
    const records: Array<Record<string, unknown>> = [];
    for (const sheetName of workbook.SheetNames) {
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: false, blankrows: false });
      const headerIndex = matrix.findIndex((row) => !emptyRow(row));
      if (headerIndex < 0) continue;
      const headers = matrix[headerIndex].map((v, i) => cell(v) || `ستون بدون نام ${i + 1}`);
      for (let i = headerIndex + 1; i < matrix.length; i++) {
        const row = matrix[i];
        if (emptyRow(row)) continue;
        const rawData: Record<string, unknown> = {};
        headers.forEach((header, index) => { rawData[header] = cell(row[index]); });
        removeUnwantedColumns(rawData);
        const mapped = mapRow(rawData);
        if (!mapped.facilityNumber && !mapped.customerNumber && !mapped.facilityTitle) continue;
        records.push({
          sourceFile: file.name,
          sheetName,
          sourceRow: i + 1,
          ...mapped,
          rawData,
        });
      }
    }
    if (!records.length) return NextResponse.json({ success: false, error: "ردیف اطلاعاتی قابل‌واردکردن در فایل پیدا نشد." }, { status: 400 });
    // Skip already-imported source rows when the same file is uploaded again.
    let imported = 0;
    // Keep each SQL insert small enough for PostgreSQL's bind-parameter limit.
    for (let offset = 0; offset < records.length; offset += 400) {
      const batch = records.slice(offset, offset + 400);
      const result = await prisma.bayeganiRecord.createMany({ data: batch as never[], skipDuplicates: true });
      imported += result.count;
    }
    return NextResponse.json({ success: true, imported, detected: records.length, sheets: workbook.SheetNames });
  } catch (error) {
    console.error("Bayegani Excel import error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "خطا در پردازش فایل Excel" }, { status: 500 });
  }
}
