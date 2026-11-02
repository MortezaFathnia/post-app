import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function value(row: Record<string, unknown>, key: string): string | null {
  const raw = row[key];
  if (raw === undefined || raw === null || String(raw).trim() === "") return null;
  return String(raw).trim();
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page") || 1));
    const pageSize = Math.min(100, Math.max(10, Number(params.get("pageSize") || 20)));
    const search = (params.get("search") || "").trim();
    const filterType = params.get("filterType") || "";
    const filterValue = (params.get("filterValue") || "").trim();
    const allowedSortFields = [
      "createdAt", "counterLabel", "facilityNumber", "serial", "checkNumber",
      "checkStatus", "dueDate", "paidAmount", "unpaidAmount", "embeddedProfit",
      "delayDays", "delayPenalty", "bankAgent", "administrativeNumber",
    ] as const;
    type SortField = (typeof allowedSortFields)[number];
    const requestedSort = params.get("sortBy") || "createdAt";
    const sortBy: SortField = allowedSortFields.includes(requestedSort as SortField)
      ? requestedSort as SortField
      : "createdAt";
    const sortOrder = params.get("sortOrder") === "desc" ? "desc" : "asc";
    const searchableFields = [
      "counterLabel", "facilityNumber", "serial", "checkNumber", "checkStatus",
      "dueDate", "paidAmount", "unpaidAmount", "embeddedProfit", "delayDays",
      "delayPenalty", "bankAgent", "administrativeNumber",
    ] as const;
    const where: Prisma.DebtDiscountingRecordWhereInput = {};
    if (search) {
      where.OR = searchableFields.map((field) => ({
        [field]: { contains: search, mode: "insensitive" },
      }));
    }
    const filterFields: Record<string, string> = {
      counter: "counterLabel",
      facilityNumber: "facilityNumber",
      checkStatus: "checkStatus",
      dueDate: "dueDate",
      bankAgent: "bankAgent",
    };
    const filterField = filterFields[filterType];
    if (filterValue && filterField) {
      where[filterField as keyof Prisma.DebtDiscountingRecordWhereInput] = {
        contains: filterValue,
        mode: "insensitive",
      } as never;
    }
    const [records, total] = await Promise.all([
      prisma.debtDiscountingRecord.findMany({
        where,
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.debtDiscountingRecord.count({ where }),
    ]);
    return NextResponse.json({ success: true, records, total, page, pageSize });
  } catch (error) {
    console.error("Debt discounting records list error:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت فهرست اسناد خرید دین" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const counterLabel = String(formData.get("counterLabel") ?? "").trim();
    const facilityNumber = String(formData.get("facilityNumber") ?? "").trim();

    if (!counterLabel || !facilityNumber) {
      return NextResponse.json(
        { success: false, error: "کدباجه - نام باجه و کد تسهیلات خرید دین الزامی است." },
        { status: 400 },
      );
    }
    if (!(file instanceof File) || !/\.(xlsx|xls)$/i.test(file.name)) {
      return NextResponse.json(
        { success: false, error: "یک فایل Excel با فرمت xlsx یا xls انتخاب کنید." },
        { status: 400 },
      );
    }

    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return NextResponse.json({ success: false, error: "فایل Excel فاقد Sheet است." }, { status: 400 });
    }

    const worksheet = workbook.Sheets[sheetName];
    const headerRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "" });
    const headers = new Set((headerRows[0] ?? []).map((header) => String(header).trim()));
    const requiredHeaders = [
      "سریال سفته/ چک",
      "شماره سفته / چک",
      "وضعیت سفته / چک",
      "تاريخ سررسيد",
      "پرداخت شده",
      "پرداخت نشده",
      "سود/کارمزد مستتر",
      "مدت تاخير به روز",
      "جريمه تاخير",
      "بانک عامل",
      "شماره انتظامی",
    ];
    const missingHeaders = requiredHeaders.filter((header) => !headers.has(header));
    if (missingHeaders.length) {
      return NextResponse.json(
        { success: false, error: `ستون‌های موردنیاز در فایل وجود ندارند: ${missingHeaders.join("، ")}` },
        { status: 400 },
      );
    }
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
      defval: "",
      raw: false,
    });
    if (!rows.length) {
      return NextResponse.json({ success: false, error: "فایل Excel فاقد ردیف اطلاعاتی است." }, { status: 400 });
    }

    const records = rows.map((row, index) => ({
      sourceFile: file.name,
      sheetName,
      sourceRow: index + 2,
      counterLabel,
      facilityNumber,
      serial: value(row, "سریال سفته/ چک"),
      checkNumber: value(row, "شماره سفته / چک"),
      checkStatus: value(row, "وضعیت سفته / چک"),
      dueDate: value(row, "تاريخ سررسيد"),
      paidAmount: value(row, "پرداخت شده"),
      unpaidAmount: value(row, "پرداخت نشده"),
      embeddedProfit: value(row, "سود/کارمزد مستتر"),
      delayDays: value(row, "مدت تاخير به روز"),
      delayPenalty: value(row, "جريمه تاخير"),
      bankAgent: value(row, "بانک عامل"),
      administrativeNumber: value(row, "شماره انتظامی"),
      rawData: row as Prisma.InputJsonObject,
    }));

    const pairsByKey = new Map<
      string,
      { administrativeNumber: string; checkNumber: string; sourceRows: number[] }
    >();

    for (const record of records) {
      if (!record.administrativeNumber || !record.checkNumber) continue;
      const key = JSON.stringify([record.administrativeNumber, record.checkNumber]);
      const pair = pairsByKey.get(key) ?? {
        administrativeNumber: record.administrativeNumber,
        checkNumber: record.checkNumber,
        sourceRows: [],
      };
      pair.sourceRows.push(record.sourceRow);
      pairsByKey.set(key, pair);
    }

    const conflicts: string[] = [];
    for (const pair of pairsByKey.values()) {
      if (pair.sourceRows.length > 1) {
        conflicts.push(
          `ترکیب شماره انتظامی «${pair.administrativeNumber}» و شماره سفته «${pair.checkNumber}» در ردیف‌های فایل ${pair.sourceRows.join("، ")} تکراری است.`,
        );
      }
    }

    const pairs = [...pairsByKey.values()];
    if (pairs.length) {
      const existing = await prisma.debtDiscountingRecord.findMany({
        where: {
          OR: pairs.map((pair) => ({
            administrativeNumber: pair.administrativeNumber,
            checkNumber: pair.checkNumber,
          })),
        },
        select: { administrativeNumber: true, checkNumber: true },
      });
      const existingKeys = new Set(
        existing.map((record) =>
          JSON.stringify([record.administrativeNumber, record.checkNumber]),
        ),
      );

      for (const pair of pairs) {
        const key = JSON.stringify([pair.administrativeNumber, pair.checkNumber]);
        if (existingKeys.has(key)) {
          conflicts.push(
            `ترکیب شماره انتظامی «${pair.administrativeNumber}» و شماره سفته «${pair.checkNumber}» از قبل در جدول اسناد خرید دین ثبت شده است.`,
          );
        }
      }
    }

    if (conflicts.length) {
      return NextResponse.json(
        {
          success: false,
          error: "بارگذاری انجام نشد؛ ترکیب شماره انتظامی و شماره سفته باید در کل جدول یکتا باشد.",
          conflicts,
        },
        { status: 409 },
      );
    }

    await prisma.debtDiscountingRecord.createMany({ data: records });

    return NextResponse.json({
      success: true,
      count: records.length,
      counterLabel,
      facilityNumber,
    });
  } catch (error) {
    console.error("Debt discounting Excel upload error:", error);
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json(
        {
          success: false,
          error: "ترکیب شماره انتظامی و شماره سفته تکراری است؛ این ترکیب باید در کل جدول یکتا باشد.",
        },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "خطا در پردازش فایل Excel" },
      { status: 500 },
    );
  }
}
