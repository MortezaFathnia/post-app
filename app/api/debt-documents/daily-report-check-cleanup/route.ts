import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

function normalizeDigits(value: string): string {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persian = "۰۱۲۳۴۵۶۷۸۹";
    const arabic = "٠١٢٣٤٥٦٧٨٩";
    const index = persian.indexOf(digit);
    return String(index >= 0 ? index : arabic.indexOf(digit));
  });
}
function normalizeText(value: unknown): string {
  return normalizeDigits(String(value ?? "").replace(/\u200c/g, " "))
    .replace(/[يى]/g, "ی").replace(/ك/g, "ک")
    .replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}
function normalizeHeader(value: unknown): string {
  return normalizeText(value).replace(/\s/g, "");
}
function amountKey(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const normalized = normalizeDigits(String(value)).replace(/[,٬،\s]/g, "").replace(/[٫]/g, ".");
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric === 0) return null;
  return String(numeric);
}
function findReportSheet(workbook: XLSX.WorkBook) {
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, raw: true, defval: "" });
    const headerIndex = rows.findIndex((row) => {
      const headers = row.map(normalizeHeader);
      return headers.includes("شرح") && headers.includes("واریز") && headers.includes("برداشت");
    });
    if (headerIndex >= 0) {
      const headers = rows[headerIndex].map(normalizeHeader);
      return { sheetName, rows: rows.slice(headerIndex), descriptionIndex: headers.indexOf("شرح"), depositIndex: headers.indexOf("واریز"), withdrawalIndex: headers.indexOf("برداشت") };
    }
  }
  return null;
}
function findChecksSheet(workbook: XLSX.WorkBook) {
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, raw: true, defval: "" });
    const headerIndex = rows.findIndex((row) => {
      const headers = row.map(normalizeHeader);
      return headers.includes("سریالسفته/چک") && (headers.includes("پرداختشده") || headers.includes("مبلغچک"));
    });
    if (headerIndex >= 0) {
      const headers = rows[headerIndex].map(normalizeHeader);
      return { rows: rows.slice(headerIndex + 1), serialIndex: headers.indexOf("سریالسفته/چک"), amountIndex: headers.includes("پرداختشده") ? headers.indexOf("پرداختشده") : headers.indexOf("مبلغچک") };
    }
  }
  return null;
}
function extractSerial(description: unknown): string | null {
  const match = normalizeDigits(String(description ?? "")).match(/\/\/\s*\d+\s*\/\s*(\d+)\s*\//);
  return match?.[1] ?? null;
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const reportFile = form.get("reportFile");
    const checksFile = form.get("checksFile");
    if (!(reportFile instanceof File) || !/\.(xls|xlsx)$/i.test(reportFile.name)) {
      return NextResponse.json({ success: false, error: "فایل گزارش روزانه با فرمت xls یا xlsx انتخاب کنید." }, { status: 400 });
    }
    if (!(checksFile instanceof File) || !/\.(xls|xlsx)$/i.test(checksFile.name)) {
      return NextResponse.json({ success: false, error: "فایل خروجی اسناد خرید دین را با فرمت xls یا xlsx انتخاب کنید." }, { status: 400 });
    }

    const reportBook = XLSX.read(await reportFile.arrayBuffer(), { type: "array", cellDates: false });
    const checksBook = XLSX.read(await checksFile.arrayBuffer(), { type: "array", cellDates: false });
    const report = findReportSheet(reportBook);
    if (!report) return NextResponse.json({ success: false, error: "ستون‌های شرح، واریز و برداشت در فایل گزارش روزانه پیدا نشد." }, { status: 400 });
    const checks = findChecksSheet(checksBook);
    if (!checks) return NextResponse.json({ success: false, error: "در فایل دوم ستون‌های سریال سفته / چک و پرداخت شده (یا مبلغ چک) پیدا نشد. خروجی اکسل بایگانی اسناد خرید دین را انتخاب کنید." }, { status: 400 });

    const amountBySerial = new Map<string, Set<string>>();
    for (const row of checks.rows) {
      const serial = normalizeText(row[checks.serialIndex]);
      const amount = amountKey(row[checks.amountIndex]);
      if (!serial || !amount) continue;
      const amounts = amountBySerial.get(serial) ?? new Set<string>();
      amounts.add(amount);
      amountBySerial.set(serial, amounts);
    }

    const matchedIndexes = new Set<number>();
    for (let index = 1; index < report.rows.length; index += 1) {
      const row = report.rows[index] ?? [];
      const serial = extractSerial(row[report.descriptionIndex]);
      if (!serial) continue;
      const expectedAmounts = amountBySerial.get(serial);
      if (!expectedAmounts) continue;
      const deposit = amountKey(row[report.depositIndex]);
      const withdrawal = amountKey(row[report.withdrawalIndex]);
      if ([deposit, withdrawal].some((amount) => amount !== null && expectedAmounts.has(amount))) matchedIndexes.add(index);
    }

    const cleanedRows = report.rows.filter((_, index) => !matchedIndexes.has(index));
    reportBook.Sheets[report.sheetName] = XLSX.utils.aoa_to_sheet(cleanedRows);
    const output = XLSX.write(reportBook, { type: "buffer", bookType: "xlsx" });
    const outputName = \`\${reportFile.name.replace(/\.(xls|xlsx)$/i, "")}-پاکسازی-چک.xlsx\`;
    return new NextResponse(output, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": \`attachment; filename*=UTF-8''\${encodeURIComponent(outputName)}\`,
        "X-Original-Rows": String(Math.max(0, report.rows.length - 1)),
        "X-Matched-Rows": String(matchedIndexes.size),
        "X-Remaining-Rows": String(Math.max(0, cleanedRows.length - 1)),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Daily report check cleanup error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "خطا در پاکسازی گزارش روزانه." }, { status: 500 });
  }
}
