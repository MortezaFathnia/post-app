import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function customerNumberFromFacility(facilityNumber: string | null): string {
  if (!facilityNumber) return "";
  return facilityNumber.trim().split(".")[2]?.trim() ?? "";
}

export async function GET(request: NextRequest) {
  try {
    const normalizeDigits = (input: string) =>
      input.replace(/[۰-۹٠-٩]/g, (digit) => {
        const persian = "۰۱۲۳۴۵۶۷۸۹";
        const arabic = "٠١٢٣٤٥٦٧٨٩";
        const persianIndex = persian.indexOf(digit);
        return String(persianIndex >= 0 ? persianIndex : arabic.indexOf(digit));
      });
    const normalizeDate = (input: string | null) => {
      if (!input?.trim()) return null;
      const normalized = normalizeDigits(input.trim()).replace(/[.-]/g, "/");
      const match = normalized.match(/^(\\d{4})\\/(\\d{1,2})\\/(\\d{1,2})$/);
      if (!match) return null;
      return `${match[1]}/${match[2].padStart(2, "0")}/${match[3].padStart(2, "0")}`;
    };
    const params = request.nextUrl.searchParams;
    const rawDateFrom = params.get("dateFrom");
    const rawDateTo = params.get("dateTo");
    const dateFrom = normalizeDate(rawDateFrom);
    const dateTo = normalizeDate(rawDateTo);
    if ((rawDateFrom && !dateFrom) || (rawDateTo && !dateTo)) {
      return NextResponse.json({ success: false, error: "قالب تاریخ معتبر نیست." }, { status: 400 });
    }
    if (dateFrom && dateTo && dateFrom > dateTo) {
      return NextResponse.json({ success: false, error: "تاریخ شروع نباید بعد از تاریخ پایان باشد." }, { status: 400 });
    }

    const where = dateFrom || dateTo ? {
      dueDate: {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      },
    } : undefined;
    // Export only records matching the selected due-date range (or all records if no range is selected).
    const records = await prisma.debtDiscountingRecord.findMany({
      where,
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    const rows = records.map((record) => ({
      "کدباجه - نام باجه": record.counterLabel,
      "کد تسهیلات خرید دین": record.facilityNumber,
      "شماره مشتری": customerNumberFromFacility(record.facilityNumber),
      "سریال سفته / چک": record.serial ?? "",
      "وضعیت سفته / چک": record.checkStatus ?? "درراه",
      "چک داخلی یا خارجی": record.domesticForeign ?? "",
      "تاریخ سررسید": record.dueDate ?? "",
      "پرداخت شده": record.paidAmount ?? "",
      "پرداخت نشده": record.unpaidAmount ?? "",
      "شماره انتظامی": record.administrativeNumber ?? "",
      "شماره سفته / چک": record.checkNumber ?? "",
      "سود/کارمزد مستتر": record.embeddedProfit ?? "",
      "مدت تأخیر به روز": record.delayDays ?? "",
      "جریمه تأخیر": record.delayPenalty ?? "",
      "بانک عامل": record.bankAgent ?? "",
      "شعبه چک": record.checkBranch ?? "",
      "توضیحات": record.description ?? "",
      "نام فایل": record.sourceFile,
      "نام برگه": record.sheetName,
      "شماره ردیف در فایل": record.sourceRow,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet["!views"] = [{ rightToLeft: true }];
    worksheet["!cols"] = Object.keys(rows[0] ?? {}).map((header) => ({
      wch: Math.min(32, Math.max(14, header.length + 3)),
    }));
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "اسناد خرید دین");
    const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": "attachment; filename*=UTF-8''debt-documents.xlsx",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Debt documents Excel export error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "خطا در تهیه خروجی اکسل." },
      { status: 500 },
    );
  }
}
