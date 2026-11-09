import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

function customerNumberFromFacility(facilityNumber: string): string | null {
  const customerNumber = facilityNumber.trim().split(".")[2]?.trim();
  return customerNumber || null;
}

function value(row: Record<string, unknown>, key: string): string | null {
  const raw = row[key];
  if (raw === undefined || raw === null || String(raw).trim() === "") return null;
  return String(raw).trim();
}

function normalizeHeader(header: unknown): string {
  return String(header ?? "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function textCell(row: Record<string, unknown>, key: string): string {
  const raw = row[key];
  if (raw === undefined || raw === null) return "";
  const cell = String(raw).trim();
  // Excel may display numeric amounts with thousands separators; the TXT format uses plain digits.
  return /^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(cell) ? cell.replace(/,/g, "") : cell;
}

function shamsiDateString(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
    timeZone: "Asia/Tehran",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

function csvCell(input: string): string {
  return /[",\r\n]/.test(input) ? `"${input.replace(/"/g, '""')}"` : input;
}

const textHeaders = [
  "شماره چک",
  "مبلغ چک",
  "شماره انتظامی",
  "تاریخ سررسید",
  "نوع چک",
  "هزینه ارسال",
  "تاریخ واخواست",
  "هزینه واخواست",
  "نوع دین",
  "بانک عامل",
  "شعبه چک",
  "چک داخلی یا خارجی",
  "حساب جاری چک",
  "کد رهگیری",
] as const;

const countFormatHeaders = [
  "تعداد",
  "شماره چک",
  "مبلغ چک",
  "شماره انتظامی(سری)",
  "تاریخ سررسید",
  "نوع چک",
  "هزینه ارسال",
  "تاریخ واخواست",
  "هزینه واخواست",
  "نوع دین",
  "بانک عامل",
  "شعبه چک",
  "چک داخلی یا خارجی",
  "حساب جاری چک",
] as const;

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const page = Math.max(1, Number(params.get("page") || 1));
    const pageSize = Math.min(100, Math.max(10, Number(params.get("pageSize") || 20)));
    const search = (params.get("search") || "").trim();
    const filterType = params.get("filterType") || "";
    const filterValue = (params.get("filterValue") || "").trim();
    const allowedSortFields = [
      "createdAt", "counterLabel", "facilityNumber", "customerNumber", "serial", "checkNumber",
      "checkStatus", "domesticForeign", "dueDate", "paidAmount", "unpaidAmount", "embeddedProfit",
      "delayDays", "delayPenalty", "bankAgent", "checkBranch", "description", "administrativeNumber",
    ] as const;
    type SortField = (typeof allowedSortFields)[number];
    const requestedSort = params.get("sortBy") || "createdAt";
    const sortBy: SortField = allowedSortFields.includes(requestedSort as SortField)
      ? requestedSort as SortField
      : "createdAt";
    const sortOrder = params.get("sortOrder") === "desc" ? "desc" : "asc";

    const searchableFields = [
      "counterLabel", "facilityNumber", "customerNumber", "serial", "checkNumber", "checkStatus",
      "domesticForeign", "dueDate", "paidAmount", "unpaidAmount", "embeddedProfit", "delayDays",
      "delayPenalty", "bankAgent", "checkBranch", "description", "administrativeNumber",
    ] as const;

    const normalizeDigits = (input: string) =>
      input.replace(/[۰-۹٠-٩]/g, (digit) => {
        const persian = "۰۱۲۳۴۵۶۷۸۹";
        const arabic = "٠١٢٣٤٥٦٧٨٩";
        const persianIndex = persian.indexOf(digit);
        return String(persianIndex >= 0 ? persianIndex : arabic.indexOf(digit));
      });

    const searchTerms = [...new Set([search, normalizeDigits(search)].filter(Boolean))];
    const where: Prisma.DebtDiscountingRecordWhereInput = {};
    if (params.get("uploadedOnly") === "true") {
      where.sourceFile = { not: null };
      where.sheetName = "چک ها";
    }
    if (searchTerms.length) {
      where.OR = searchTerms.flatMap((term) =>
        searchableFields.map((field) => ({
          [field]: { contains: term, mode: "insensitive" as const },
        })),
      );
    }

    const filterFields: Record<string, keyof Prisma.DebtDiscountingRecordWhereInput> = {
      counter: "counterLabel",
      facilityNumber: "facilityNumber",
      customerNumber: "customerNumber",
      serial: "serial",
      checkStatus: "checkStatus",
      domesticForeign: "domesticForeign",
      dueDate: "dueDate",
      bankAgent: "bankAgent",
      checkBranch: "checkBranch",
      description: "description",
      administrativeNumber: "administrativeNumber",
    };
    const filterField = filterFields[filterType];
    if (filterValue && filterField) {
      const filterTerms = [...new Set([filterValue, normalizeDigits(filterValue)])];
      const filterConditions = filterTerms.map((term) => ({
        [filterField]: { contains: term, mode: "insensitive" as const },
      }));
      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: filterConditions }];
        delete where.OR;
      } else {
        where.OR = filterConditions;
      }
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

export async function PATCH(request: NextRequest) {
  try {
    const body = (await request.json()) as { id?: number; checkStatus?: string };
    const id = Number(body.id);
    const allowedStatuses = ["درراه", "آزاد", "نقدشده"];
    if (!Number.isInteger(id) || id <= 0 || !body.checkStatus || !allowedStatuses.includes(body.checkStatus)) {
      return NextResponse.json(
        { success: false, error: "شناسه رکورد یا وضعیت چک معتبر نیست." },
        { status: 400 },
      );
    }

    const record = await prisma.debtDiscountingRecord.update({
      where: { id },
      data: { checkStatus: body.checkStatus },
      select: { id: true, checkStatus: true },
    });
    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Debt check status update error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "خطا در تغییر وضعیت چک." },
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
    const legacyHeaders = [
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
    const uploadFormat = String(formData.get("format") ?? "new");
    if (uploadFormat !== "legacy" && uploadFormat !== "new") {
      return NextResponse.json(
        { success: false, error: "نوع فرایند بارگذاری معتبر نیست." },
        { status: 400 },
      );
    }
    const expectedHeaders = uploadFormat === "legacy" ? legacyHeaders : null;
    const matchingSheet = workbook.SheetNames.find((name) => {
      const candidate = workbook.Sheets[name];
      const headerRows = XLSX.utils.sheet_to_json<unknown[]>(candidate, {
        header: 1,
        defval: "",
        range: "A1:N1",
      });
      const candidateHeaders = new Set((headerRows[0] ?? []).map(normalizeHeader));
      if (expectedHeaders) return expectedHeaders.every((header) => candidateHeaders.has(header));
      return textHeaders.every((header) => candidateHeaders.has(header))
        || countFormatHeaders.every((header) => candidateHeaders.has(header));
    });
    const sheetName = matchingSheet;
    if (!sheetName) {
      return NextResponse.json(
        {
          success: false,
          error: uploadFormat === "legacy"
            ? "این صفحه فقط قالب قدیمی ۱۱ ستونی فهرست اسناد خرید دین را می‌پذیرد."
            : "این صفحه فقط قالب جدید چک‌ها (۱۴ ستون) را می‌پذیرد.",
        },
        { status: 400 },
      );
    }

    const worksheet = workbook.Sheets[sheetName];
    const usedRange = XLSX.utils.decode_range(worksheet["!ref"] || "A1:N1");
    const checksRange: XLSX.Range = {
      s: { r: 0, c: 0 },
      e: { r: usedRange.e.r, c: 13 },
    };
    // Read only columns A:N from the «چک ها» sheet.
    const headerRows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
      header: 1,
      defval: "",
      range: checksRange,
    });
    const normalizedHeaders = (headerRows[0] ?? []).slice(0, 14).map(normalizeHeader);
    const headers = new Set(normalizedHeaders);
    const countFormat = countFormatHeaders.every((header) => headers.has(header));
    const newFormat = textHeaders.every((header) => headers.has(header));
    const isLegacyFormat = legacyHeaders.every((header) => headers.has(header));
    if (
      (uploadFormat === "legacy" && (!isLegacyFormat || newFormat || countFormat)) ||
      (uploadFormat === "new" && (!newFormat && !countFormat))
    ) {
      return NextResponse.json(
        {
          success: false,
          error: uploadFormat === "legacy"
            ? "قالب فایل با صفحه فهرست اسناد خرید دین مطابقت ندارد؛ قالب قدیمی ۱۱ ستونی لازم است."
            : "قالب فایل با صفحه بارگذاری اسناد جدید خرید دین مطابقت ندارد؛ قالب جدید ۱۴ ستونی لازم است.",
        },
        { status: 400 },
      );
    }

    const sourceRows = headerRows.slice(1).map((cells, index) => {
      const normalized: Record<string, unknown> = {};
      normalizedHeaders.forEach((header, columnIndex) => {
        if (header) normalized[header] = cells[columnIndex] ?? "";
      });
      return { row: normalized, sourceRow: index + 2 };
    });
    // Ignore formatting/blank rows and rows without a check number.
    const validSourceRows = sourceRows.filter(({ row }) =>
      countFormat || newFormat
        ? Boolean(value(row, "شماره چک"))
        : Object.values(row).some((cell) => String(cell ?? "").trim() !== "")
    );
    const rows = validSourceRows.map(({ row }) => row);
    if (!rows.length) {
      return NextResponse.json(
        { success: false, error: "در Sheet «چک ها» هیچ ردیفی با شماره چک معتبر در ستون‌های A:N پیدا نشد." },
        { status: 400 },
      );
    }

    const records = validSourceRows.map(({ row, sourceRow }) => {
      if (newFormat || countFormat) {
        const checkNumber = value(row, "شماره چک");
        return {
          sourceFile: file.name,
          sheetName,
          sourceRow,
          counterLabel,
          facilityNumber,
          customerNumber: customerNumberFromFacility(facilityNumber),
          // For the 14-column checks sheet, the check number is also stored as the serial.
          serial: countFormat ? checkNumber : value(row, "کد رهگیری"),
          checkNumber,
          checkStatus: "درراه",
          domesticForeign: value(row, "چک داخلی یا خارجی"),
          dueDate: value(row, "تاریخ سررسید"),
          paidAmount: value(row, "مبلغ چک"),
          unpaidAmount: null,
          embeddedProfit: null,
          delayDays: null,
          delayPenalty: null,
          bankAgent: value(row, "بانک عامل"),
          checkBranch: value(row, "شعبه چک"),
          description: value(row, "توضیحات"),
          administrativeNumber: countFormat
            ? value(row, "شماره انتظامی(سری)")
            : value(row, "شماره انتظامی"),
          rawData: row as Prisma.InputJsonObject,
        };
      }
      return {
        sourceFile: file.name,
        sheetName,
        sourceRow,
        counterLabel,
        facilityNumber,
        customerNumber: customerNumberFromFacility(facilityNumber),
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
        checkBranch: value(row, "شعبه چک"),
        description: value(row, "توضیحات"),
        administrativeNumber: value(row, "شماره انتظامی"),
        rawData: row as Prisma.InputJsonObject,
      };
    });

    const pairRows = new Map<
      string,
      { serial: string; administrativeNumber: string; sourceRows: number[] }
    >();

    for (const record of records) {
      if (!record.serial || !record.administrativeNumber) continue;
      const key = JSON.stringify([record.serial, record.administrativeNumber]);
      const pair = pairRows.get(key) ?? {
        serial: record.serial,
        administrativeNumber: record.administrativeNumber,
        sourceRows: [],
      };
      pair.sourceRows.push(record.sourceRow);
      pairRows.set(key, pair);
    }

    const conflicts: string[] = [];
    for (const pair of pairRows.values()) {
      if (pair.sourceRows.length > 1) {
        conflicts.push(
          `ترکیب سریال «${pair.serial}» و شماره انتظامی «${pair.administrativeNumber}» در ردیف‌های فایل ${pair.sourceRows.join("، ")} تکراری است.`,
        );
      }
    }

    const pairs = [...pairRows.values()];
    if (pairs.length) {
      const existing = await prisma.debtDiscountingRecord.findMany({
        where: {
          OR: pairs.map((pair) => ({
            serial: pair.serial,
            administrativeNumber: pair.administrativeNumber,
          })),
        },
        select: { serial: true, administrativeNumber: true },
      });
      const existingKeys = new Set(
        existing.map((record) => JSON.stringify([record.serial, record.administrativeNumber])),
      );

      for (const pair of pairs) {
        const key = JSON.stringify([pair.serial, pair.administrativeNumber]);
        if (existingKeys.has(key)) {
          conflicts.push(
            `ترکیب سریال «${pair.serial}» و شماره انتظامی «${pair.administrativeNumber}» از قبل در جدول اسناد خرید دین ثبت شده است.`,
          );
        }
      }
    }

    if (conflicts.length) {
      return NextResponse.json(
        {
          success: false,
          error: "بارگذاری انجام نشد؛ ترکیب سریال سفته / چک و شماره انتظامی باید در کل جدول یکتا باشد.",
          conflicts,
        },
        { status: 409 },
      );
    }

    await prisma.debtDiscountingRecord.createMany({ data: records });

    const countFormatOutputHeaders = [
      "شماره چک",
      "مبلغ چک",
      "شماره انتظامی",
      "تاریخ سررسید",
      "نوع چک",
      "هزینه ارسال",
      "تاریخ واخواست",
      "هزینه واخواست",
      "نوع دین",
      "بانک عامل",
      "شعبه چک",
      "چک داخلی یا خارجی",
      "حساب جاری چک",
      "کد رهگیری",
    ] as const;

    const formatDomesticForeign = (input: string): string => {
      const normalized = input.trim().toLocaleLowerCase();
      if (["true", "1", "بله", "داخلی"].includes(normalized)) return "TRUE";
      if (["false", "0", "خیر", "خارجی"].includes(normalized)) return "FALSE";
      return input;
    };

    const countFormatRows = countFormat
      ? rows.map((row) => countFormatOutputHeaders.map((header, index) => {
          if (header === "شماره انتظامی") return textCell(row, "شماره انتظامی(سری)");
          if (header === "کد رهگیری") return textCell(row, "شماره انتظامی(سری)");
          const cell = textCell(row, header);
          return header === "چک داخلی یا خارجی" ? formatDomesticForeign(cell) : cell;
        }))
      : undefined;

    const textContent = countFormat
      ? countFormatRows!.map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n"
      : newFormat
        ? [
            textHeaders.join(","),
            ...rows.map((row) => textHeaders.map((header) => {
              const cell = textCell(row, header);
              return header === "چک داخلی یا خارجی" ? formatDomesticForeign(cell) : cell;
            }).map(csvCell).join(",")),
          ].join("\r\n") + "\r\n"
        : undefined;

    return NextResponse.json({
      success: true,
      count: records.length,
      counterLabel,
      facilityNumber,
      uploadedRecords: records.map((record, index) => ({
        id: index + 1,
        counterLabel: record.counterLabel,
        facilityNumber: record.facilityNumber,
        customerNumber: record.customerNumber,
        serial: record.serial,
        checkNumber: record.checkNumber,
        checkStatus: record.checkStatus,
        dueDate: record.dueDate,
        paidAmount: record.paidAmount,
        administrativeNumber: record.administrativeNumber,
        bankAgent: record.bankAgent,
        checkBranch: record.checkBranch,
        domesticForeign: record.domesticForeign,
        sourceRow: record.sourceRow,
      })),
      ...(textContent === undefined ? {} : {
        textContent,
        textFileName: `${facilityNumber.replace(/[<>:"/\\\\|?*\x00-\x1F]/g, "_")}-${shamsiDateString()}.txt`,
        previewHeaders: countFormat ? countFormatOutputHeaders : textHeaders,
        previewRows: countFormat ? countFormatRows : rows.map((row) => textHeaders.map((header) => {
          const cell = textCell(row, header);
          return header === "چک داخلی یا خارجی" ? formatDomesticForeign(cell) : cell;
        })),
      }),
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
          error: "ترکیب سریال سفته / چک و شماره انتظامی تکراری است؛ این ترکیب باید در کل جدول یکتا باشد.",
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
