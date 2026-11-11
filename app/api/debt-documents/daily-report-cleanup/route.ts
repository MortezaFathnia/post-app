import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, "")
    .trim();
}

function amountKey(value: unknown): string | null {
  if (value === null || value === undefined || String(value).trim() === "") return null;
  const normalized = String(value)
    .replace(/[۰-۹٠-٩]/g, (digit) => {
      const persian = "۰۱۲۳۴۵۶۷۸۹";
      const arabic = "٠١٢٣٤٥٦٧٨٩";
      const index = persian.indexOf(digit);
      return String(index >= 0 ? index : arabic.indexOf(digit));
    })
    .replace(/[,٬\s]/g, "")
    .replace(/[٫]/g, ".");
  const numeric = Number(normalized);
  if (!Number.isFinite(numeric) || numeric === 0) return null;
  return String(numeric);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || !/\.(xlsx|xls)$/i.test(file.name)) {
      return NextResponse.json(
        { success: false, error: "لطفاً فایل Excel با فرمت xls یا xlsx انتخاب کنید." },
        { status: 400 },
      );
    }

    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
    let targetSheetName: string | undefined;
    let targetRows: unknown[][] = [];
    let depositIndex = -1;
    let withdrawalIndex = -1;

    for (const sheetName of workbook.SheetNames) {
      const worksheet = workbook.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
        header: 1,
        raw: true,
        defval: null,
      });
      const headerIndex = rows.findIndex((row) => {
        const headers = row.map(normalizeHeader);
        return headers.includes("واریز") && headers.includes("برداشت");
      });
      if (headerIndex >= 0) {
        const headers = rows[headerIndex].map(normalizeHeader);
        targetSheetName = sheetName;
        targetRows = rows.slice(headerIndex);
        depositIndex = headers.indexOf("واریز");
        withdrawalIndex = headers.indexOf("برداشت");
        break;
      }
    }

    if (!targetSheetName || depositIndex < 0 || withdrawalIndex < 0) {
      return NextResponse.json(
        { success: false, error: "در هیچ‌یک از برگه‌های فایل، ستون‌های «واریز» و «برداشت» پیدا نشد." },
        { status: 400 },
      );
    }

    const deposits = new Map<string, number[]>();
    const withdrawals = new Map<string, number[]>();

    targetRows.forEach((row, index) => {
      if (index === 0) return;
      const deposit = amountKey(row[depositIndex]);
      const withdrawal = amountKey(row[withdrawalIndex]);
      if (deposit) deposits.set(deposit, [...(deposits.get(deposit) ?? []), index]);
      if (withdrawal) withdrawals.set(withdrawal, [...(withdrawals.get(withdrawal) ?? []), index]);
    });

    const removed = new Set<number>();
    let removedPairs = 0;
    for (const [amount, depositRows] of deposits) {
      const withdrawalRows = withdrawals.get(amount) ?? [];
      const matches = Math.min(depositRows.length, withdrawalRows.length);
      for (let index = 0; index < matches; index += 1) {
        removed.add(depositRows[index]);
        removed.add(withdrawalRows[index]);
        removedPairs += 1;
      }
    }

    const cleanedRows = targetRows.filter((_, index) => !removed.has(index));
    const originalDataRows = Math.max(0, targetRows.length - 1);
    const remainingDataRows = Math.max(0, cleanedRows.length - 1);

    workbook.Sheets[targetSheetName] = XLSX.utils.aoa_to_sheet(cleanedRows);
    const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const baseName = file.name.replace(/\.(xlsx|xls)$/i, "");
    const outputName = `${baseName}-پاکسازی.xlsx`;

    return new NextResponse(output, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(outputName)}`,
        "X-Original-Rows": String(originalDataRows),
        "X-Removed-Rows": String(removed.size),
        "X-Removed-Pairs": String(removedPairs),
        "X-Remaining-Rows": String(remainingDataRows),
        "X-Cleanup-Sheet": encodeURIComponent(targetSheetName),
      },
    });
  } catch (error) {
    console.error("Daily report cleanup error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "خطا در پردازش فایل Excel." },
      { status: 500 },
    );
  }
}
