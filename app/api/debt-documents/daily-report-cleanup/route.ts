import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

type OutputMode = "fee" | "stamp" | "clean";

function normalizeText(value: unknown): string {
  return String(value ?? "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeHeader(value: unknown): string {
  return normalizeText(value).replace(/\s/g, "");
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

function findTargetSheet(workbook: XLSX.WorkBook) {
  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      raw: true,
      defval: null,
    });
    const headerIndex = rows.findIndex((row) => {
      const headers = row.map(normalizeHeader);
      return headers.includes("شناسهمرجع") &&
        headers.includes("واریز") &&
        headers.includes("برداشت");
    });
    if (headerIndex >= 0) {
      const headers = rows[headerIndex].map(normalizeHeader);
      return {
        sheetName,
        rows: rows.slice(headerIndex),
        headerIndex,
        referenceIndex: headers.indexOf("شناسهمرجع"),
        depositIndex: headers.indexOf("واریز"),
        withdrawalIndex: headers.indexOf("برداشت"),
      };
    }
  }
  return null;
}

function removeMatchedAmounts(rows: unknown[][], depositIndex: number, withdrawalIndex: number) {
  const deposits = new Map<string, number[]>();
  const withdrawals = new Map<string, number[]>();

  rows.forEach((row, index) => {
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
    let withdrawalCursor = 0;
    for (const depositRow of depositRows) {
      while (
        withdrawalCursor < withdrawalRows.length &&
        (removed.has(withdrawalRows[withdrawalCursor]) || withdrawalRows[withdrawalCursor] === depositRow)
      ) {
        withdrawalCursor += 1;
      }
      if (withdrawalCursor >= withdrawalRows.length) break;
      const withdrawalRow = withdrawalRows[withdrawalCursor];
      removed.add(depositRow);
      removed.add(withdrawalRow);
      removedPairs += 1;
      withdrawalCursor += 1;
    }
  }

  return {
    rows: rows.filter((_, index) => !removed.has(index)),
    removedRows: removed.size,
    removedPairs,
    originalRows: Math.max(0, rows.length - 1),
  };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const mode = normalizeText(formData.get("mode")) as OutputMode;

    if (!(file instanceof File) || !/\.(xlsx|xls)$/i.test(file.name)) {
      return NextResponse.json(
        { success: false, error: "لطفاً فایل Excel با فرمت xls یا xlsx انتخاب کنید." },
        { status: 400 },
      );
    }
    if (!["fee", "stamp", "clean"].includes(mode)) {
      return NextResponse.json({ success: false, error: "نوع خروجی نامعتبر است." }, { status: 400 });
    }

    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
    const target = findTargetSheet(workbook);
    if (!target) {
      return NextResponse.json(
        { success: false, error: "ستون‌های «شناسه مرجع»، «واریز» و «برداشت» در فایل پیدا نشدند." },
        { status: 400 },
      );
    }

    let outputRows: unknown[][];
    let matchedRows = 0;
    let removedRows = 0;
    let removedPairs = 0;
    let originalRows = Math.max(0, target.rows.length - 1);

    if (mode === "fee" || mode === "stamp") {
      const expectedValue = mode === "fee" ? "کارمزد" : "تمبر";
      const matched = target.rows.filter((row, index) =>
        index === 0 || normalizeText(row[target.referenceIndex]) === expectedValue
      );
      matchedRows = Math.max(0, matched.length - 1);
      outputRows = matched;
    } else {
      const result = removeMatchedAmounts(target.rows, target.depositIndex, target.withdrawalIndex);
      outputRows = result.rows;
      removedRows = result.removedRows;
      removedPairs = result.removedPairs;
    }

    workbook.Sheets[target.sheetName] = XLSX.utils.aoa_to_sheet(outputRows);
    const output = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
    const baseName = file.name.replace(/\.(xlsx|xls)$/i, "");
    const suffix = mode === "fee" ? "کارمزد" : mode === "stamp" ? "تمبر" : "پاکسازی-واریز-برداشت";
    const outputName = `${baseName}-${suffix}.xlsx`;
    const remainingRows = Math.max(0, outputRows.length - 1);

    return new NextResponse(output, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(outputName)}`,
        "X-Original-Rows": String(originalRows),
        "X-Matched-Rows": String(matchedRows),
        "X-Removed-Rows": String(removedRows),
        "X-Removed-Pairs": String(removedPairs),
        "X-Remaining-Rows": String(remainingRows),
        "X-Cleanup-Sheet": encodeURIComponent(target.sheetName),
      },
    });
  } catch (error) {
    console.error("Daily report processing error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "خطا در پردازش فایل Excel." },
      { status: 500 },
    );
  }
}
