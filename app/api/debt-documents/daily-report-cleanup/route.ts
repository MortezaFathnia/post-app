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
  // Ignore zero amounts: in this report, zero is the default empty-side value,
  // not a meaningful transaction amount to pair with another row.
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
      return headers.includes("کدمرجع") &&
        headers.includes("واریز") &&
        headers.includes("برداشت");
    });
    if (headerIndex >= 0) {
      const headers = rows[headerIndex].map(normalizeHeader);
      return {
        sheetName,
        rows: rows.slice(headerIndex),
        headerIndex,
        referenceIndex: headers.indexOf("کدمرجع"),
        depositIndex: headers.indexOf("واریز"),
        withdrawalIndex: headers.indexOf("برداشت"),
      };
    }
  }
  return null;
}

function removeMatchedAmounts(rows: unknown[][], depositIndex: number, withdrawalIndex: number) {
  const removed = new Set<number>();
  let removedPairs = 0;

  // For each row, look forward through subsequent rows (not only the immediately
  // next physical row) for the first still-unmatched withdrawal with the same amount.
  // Remove both rows and ensure each row is used in at most one pair.
  for (let index = 1; index < rows.length; index += 1) {
    if (removed.has(index)) continue;

    const deposit = amountKey(rows[index]?.[depositIndex]);
    if (deposit === null) continue;

    for (let nextIndex = index + 1; nextIndex < rows.length; nextIndex += 1) {
      if (removed.has(nextIndex)) continue;

      const nextWithdrawal = amountKey(rows[nextIndex]?.[withdrawalIndex]);
      if (nextWithdrawal !== null && deposit === nextWithdrawal) {
        removed.add(index);
        removed.add(nextIndex);
        removedPairs += 1;
        break;
      }
    }
  }

  return {
    rows: rows.filter((_, rowIndex) => !removed.has(rowIndex)),
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
        { success: false, error: "ستون‌های «کد مرجع»، «واریز» و «برداشت» در فایل پیدا نشدند." },
        { status: 400 },
      );
    }

    let outputRows: unknown[][];
    let matchedRows = 0;
    let removedRows = 0;
    let removedPairs = 0;
    const originalRows = Math.max(0, target.rows.length - 1);

    if (mode === "fee" || mode === "stamp") {
      const expectedReference = mode === "fee" ? "کارمزد" : "تمبر";
      const matched = target.rows.filter((row, index) => {
        if (index === 0) return true;
        return normalizeText(row[target.referenceIndex]) === expectedReference;
      });
      matchedRows = Math.max(0, matched.length - 1);
      outputRows = matched;
    } else {
      // Remove rows whose کد مرجع value is exactly تمبر or کارمزد.
      // Then compare each row's واریز with برداشت in subsequent rows.
      // If a later row has the same amount, remove both matched rows.
      const rowsWithoutFeeAndStampMatches = target.rows.filter((row, index) => {
        if (index === 0) return true;
        const referenceValue = normalizeText(row[target.referenceIndex]);
        return referenceValue !== "تمبر" && referenceValue !== "کارمزد";
      });

      const result = removeMatchedAmounts(
        rowsWithoutFeeAndStampMatches,
        target.depositIndex,
        target.withdrawalIndex,
      );
      outputRows = result.rows;
      removedRows = result.removedRows;
      removedPairs = result.removedPairs;
      matchedRows = Math.max(0, target.rows.length - rowsWithoutFeeAndStampMatches.length);
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
