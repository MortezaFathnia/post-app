import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { normalizeCounterName, normalizePersianText } from "@/lib/normalize-persian";

export const runtime = "nodejs";

const REMOVED_RAW_FIELDS = new Set(["column1", "column3", "column23", "column24"]);

function serialSortValue(value: string | null | undefined): bigint | null {
  if (!value) return null;
  const normalized = value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[\u200e\u200f\u202a-\u202e\u2066-\u2069\s,٬]/g, "");
  // Keep values within PostgreSQL BIGINT's positive range.
  if (!/^\d{1,18}$/.test(normalized)) return null;
  return BigInt(normalized);
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

function removeUnwantedColumns(rawData: Record<string, unknown>) {
  for (const key of Object.keys(rawData)) {
    if (REMOVED_RAW_FIELDS.has(key.trim().toLowerCase())) delete rawData[key];
  }
  return rawData;
}

function splitCounter(value: string): { code: string; name: string } | null {
  // Accept both a complete value (e.g. "64508-دلوئی") and an incomplete
  // legacy value (e.g. "1538-") without leaving the code inside the name.
  const match = value.match(/^(\d+)\s*-\s*(.*)$/);
  if (!match) return null;
  return { code: match[1].trim(), name: match[2].trim() };
}

function normalizeCounter(rawData: Record<string, unknown>) {
  let name = normalizeCounterName(findValue(rawData, "نام باجه"));
  let code = normalizePersianText(findValue(rawData, "کد باجه", "باجه"));

  const combinedName = splitCounter(name);
  if (combinedName) {
    code = code || combinedName.code;
    name = combinedName.name;
  }

  // Some older imports stored the combined "code-name" value in the code field.
  const combinedCode = splitCounter(code);
  if (combinedCode) {
    code = combinedCode.code;
    name = name || combinedCode.name;
  }

  // Store the two values separately. Empty names are intentionally cleared.
  rawData["نام باجه"] = name;
  rawData["کد باجه"] = code;
  rawData["کد باجه-نام باجه"] = code && name ? `${code}-${name}` : "";
  return { name, code, label: code && name ? `${code}-${name}` : "" };
}

function customerNumberFromFacility(facilityNumber: string): string {
  const parts = facilityNumber.trim().split(".");
  return parts.length >= 3 ? (parts[2] || "").trim() : "";
}

function buildNewArchiveCode(rawData: Record<string, unknown>) {
  const counterCode = findValue(rawData, "کد باجه", "باجه");
  const floor = findValue(rawData, "طبقه", "طبقه بایگانی");
  const serial = findValue(rawData, "سریال", "سریال2");
  return counterCode && floor && serial ? [counterCode, floor, serial].join("-") : "";
}

function mapRow(rawData: Record<string, unknown>) {
  const facilityNumber = findValue(rawData, "شماره تسهيلات", "شماره تسهیلات");
  const derivedCustomerNumber = customerNumberFromFacility(facilityNumber);
  const customerNumber = derivedCustomerNumber || findValue(rawData, "شماره مشتری", "شماره مشتري");
  if (derivedCustomerNumber) rawData["شماره مشتری"] = derivedCustomerNumber;

  const counter = normalizeCounter(rawData);
  const suppliedArchiveCode = findValue(rawData, "کد بایگانی جدید", "کد بایگانی", "شماره بایگانی");
  const archiveCode = suppliedArchiveCode || buildNewArchiveCode(rawData);
  delete rawData["کد بایگانی جدید"];
  if (archiveCode) rawData["کد بایگانی"] = archiveCode;

  return {
    facilityNumber,
    customerNumber,
    archiveCode,
    facilityTitle: findValue(rawData, "عنوان تسهیلات", "عنوان تسهيلات"),
    serial: findValue(rawData, "سریال", "سریال2"),
    serialSort: serialSortValue(findValue(rawData, "سریال", "سریال2")),
    classification: findValue(rawData, "طبقه", "طبقه بایگانی"),
    counterName: counter.name,
    counterCode: counter.code,
    counterLabel: counter.label,
    status: findValue(rawData, "وضعيت کنونی", "وضعیت کنونی"),
    startDate: findValue(rawData, "تاريخ شروع", "تاریخ شروع"),
    endDate: findValue(rawData, " پایان قرارداد", "پایان قرارداد", "تاریخ پایان قرارداد"),
    duration: findValue(rawData, "مدت", "24"),
    approvedAmount: findValue(rawData, "مبلغ مصوب", "مبلغ"),
    remainingAmount: findValue(rawData, "مانده تسهيلات", "مانده تسهیلات"),
    nationalId: findValue(rawData, "کد ملي ", "کد ملي مشتري", "کد ملی"),
  };
}

async function normalizeExistingRecords() {
  const existing = await prisma.bayeganiRecord.findMany({
    select: {
      id: true, rawData: true, facilityNumber: true, customerNumber: true,
      archiveCode: true, serial: true, serialSort: true, classification: true, counterName: true, counterCode: true, counterLabel: true,
    },
  });

  let normalized = 0;
  let pending: Array<ReturnType<typeof prisma.bayeganiRecord.update>> = [];

  for (const record of existing) {
    const rawData: Record<string, unknown> =
      record.rawData && typeof record.rawData === "object" && !Array.isArray(record.rawData)
        ? { ...(record.rawData as Record<string, unknown>) }
        : {};

    const before = JSON.stringify(rawData);
    removeUnwantedColumns(rawData);

    const facilityNumber = record.facilityNumber?.trim() || findValue(rawData, "شماره تسهيلات", "شماره تسهیلات");
    const derivedCustomerNumber = customerNumberFromFacility(facilityNumber);
    const customerNumber = derivedCustomerNumber || record.customerNumber?.trim() || findValue(rawData, "شماره مشتری", "شماره مشتري");
    if (derivedCustomerNumber) rawData["شماره مشتری"] = derivedCustomerNumber;

    if (!findValue(rawData, "کد باجه") && record.counterCode) rawData["کد باجه"] = record.counterCode;
    if (!findValue(rawData, "نام باجه") && record.counterName) rawData["نام باجه"] = record.counterName;
    if (!findValue(rawData, "سریال") && record.serial) rawData["سریال"] = record.serial;
    if (!findValue(rawData, "طبقه") && record.classification) rawData["طبقه"] = record.classification;

    const counter = normalizeCounter(rawData);
    const suppliedArchiveCode = findValue(rawData, "کد بایگانی جدید", "کد بایگانی", "شماره بایگانی");
    const nextArchiveCode = suppliedArchiveCode || record.archiveCode || buildNewArchiveCode(rawData) || "";
    delete rawData["کد بایگانی جدید"];
    if (nextArchiveCode) rawData["کد بایگانی"] = nextArchiveCode;
    const nextSerial = findValue(rawData, "سریال", "سریال2") || record.serial || null;
    const nextClassification = findValue(rawData, "طبقه", "طبقه بایگانی") || record.classification || null;
    const nextCounterName = counter.name || null;
    const nextCounterCode = counter.code || null;
    const nextCounterLabel = counter.label || null;
    const nextCustomerNumber = customerNumber || null;

    const changed =
      before !== JSON.stringify(rawData) ||
      nextCustomerNumber !== record.customerNumber ||
      nextArchiveCode !== record.archiveCode ||
      nextSerial !== record.serial ||
      serialSortValue(nextSerial) !== record.serialSort ||
      nextClassification !== record.classification ||
      nextCounterName !== record.counterName ||
      nextCounterCode !== record.counterCode ||
      nextCounterLabel !== record.counterLabel;

    if (!changed) continue;

    pending.push(prisma.bayeganiRecord.update({
      where: { id: record.id },
      data: {
        rawData: rawData as never,
        customerNumber: nextCustomerNumber,
        archiveCode: nextArchiveCode,
        serial: nextSerial,
        serialSort: serialSortValue(nextSerial),
        classification: nextClassification,
        counterName: nextCounterName,
        counterCode: nextCounterCode,
        counterLabel: nextCounterLabel,
      },
    }));
    normalized++;

    if (pending.length >= 150) {
      await prisma.$transaction(pending);
      pending = [];
    }
  }

  if (pending.length) await prisma.$transaction(pending);
  return normalized;
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const requestedPage = Number.parseInt(params.get("page") ?? "1", 10);
    const requestedPageSize = Number.parseInt(params.get("pageSize") ?? "20", 10);
    const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
    const pageSize = Number.isFinite(requestedPageSize)
      ? Math.min(100, Math.max(10, requestedPageSize))
      : 20;
    const search = (params.get("search") ?? "").trim();
    const sortableFields = ["facilityNumber", "facilityTitle", "nationalId", "counterLabel", "archiveCode", "serial", "startDate", "endDate", "approvedAmount"] as const;
    type SortField = (typeof sortableFields)[number] | "order";
    const requestedSort = params.get("sortBy") ?? "serial";
    const sortBy: SortField = requestedSort === "order"
      ? "order"
      : sortableFields.includes(requestedSort as (typeof sortableFields)[number])
        ? requestedSort as (typeof sortableFields)[number]
        : "serial";
    const sortOrder = params.get("sortOrder") === "desc" ? "desc" : "asc";

    const filterType = (params.get("filterType") ?? "").trim();
    const filterValue = (params.get("filterValue") ?? "").trim();

    // Apply the selected filter in PostgreSQL before counting, sorting, and pagination.
    const conditions: Prisma.BayeganiRecordWhereInput[] = [];
    if (search) {
      conditions.push({
        OR: [
          { facilityNumber: { contains: search, mode: "insensitive" as const } },
          { customerNumber: { contains: search, mode: "insensitive" as const } },
          { archiveCode: { contains: search, mode: "insensitive" as const } },
          { facilityTitle: { contains: search, mode: "insensitive" as const } },
          { nationalId: { contains: search, mode: "insensitive" as const } },
          { sheetName: { contains: search, mode: "insensitive" as const } },
        ],
      });
    }
    if (filterValue) {
      switch (filterType) {
        case "counter":
          conditions.push({
            OR: [
              { counterLabel: { contains: filterValue, mode: "insensitive" as const } },
              { counterCode: { contains: filterValue, mode: "insensitive" as const } },
              { counterName: { contains: filterValue, mode: "insensitive" as const } },
            ],
          });
          break;
        case "startDate":
          conditions.push({ startDate: { contains: filterValue, mode: "insensitive" as const } });
          break;
        case "endDate":
          conditions.push({ endDate: { contains: filterValue, mode: "insensitive" as const } });
          break;
        case "approvedAmount":
          conditions.push({ approvedAmount: { contains: filterValue, mode: "insensitive" as const } });
          break;
        case "status":
          conditions.push({ status: { contains: filterValue, mode: "insensitive" as const } });
          break;
        case "nationalId":
          conditions.push({ nationalId: { contains: filterValue, mode: "insensitive" as const } });
          break;
      }
    }
    const where = conditions.length ? { AND: conditions } : {};

    const [records, total, recordCounters] = await Promise.all([
      prisma.bayeganiRecord.findMany({
        where,
        orderBy: sortBy === "serial"
          ? [{ serialSort: { sort: sortOrder, nulls: "last" } }, { sourceRow: "asc" }, { id: "asc" }]
          : sortBy === "order"
            ? [{ id: "asc" }]
            : [{ [sortBy]: sortOrder }, { id: "asc" }],
        // PostgreSQL orders by the persisted numeric serialSort field before pagination.
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true, sheetName: true, sourceRow: true, facilityNumber: true,
          customerNumber: true, archiveCode: true, rawData: true, facilityTitle: true, serial: true,
          classification: true, counterLabel: true, status: true, startDate: true, endDate: true,
          approvedAmount: true, remainingAmount: true, nationalId: true,
        },
      }),
      prisma.bayeganiRecord.count({ where }),
      prisma.bayeganiRecord.findMany({
        where: { counterCode: { not: null }, counterName: { not: null } },
        select: { counterCode: true, counterName: true },
        distinct: ["counterCode", "counterName"],
        orderBy: [{ counterCode: "asc" }, { counterName: "asc" }],
      }),
    ]);

    // Backfill the dedicated counter table from existing archive rows.
    const validCounters = recordCounters
      .map((counter) => ({
        code: counter.counterCode?.trim() ?? "",
        name: counter.counterName?.trim() ?? "",
      }))
      .filter((counter) => counter.code && counter.name);

    if (validCounters.length) {
      await prisma.$transaction(
        validCounters.map((counter) =>
          prisma.bajehCode.upsert({
            where: { code_name: { code: counter.code, name: counter.name } },
            create: counter,
            update: {},
          }),
        ),
      );
    }

    const counters = await prisma.bajehCode.findMany({
      orderBy: [{ code: "asc" }, { name: "asc" }],
      select: { code: true, name: true },
    });

    const sortedRecords = records;

    const tableRecords = sortedRecords.map((record) => {
      const rawData = record.rawData && typeof record.rawData === "object" && !Array.isArray(record.rawData)
        ? record.rawData as Record<string, unknown>
        : {};
      const rawArchiveCode = findValue(rawData, "کد بایگانی", "کد بایگانی جدید", "شماره بایگانی");
      return { ...record, archiveCode: record.archiveCode || rawArchiveCode || null };
    });

    return NextResponse.json({
      success: true,
      records: tableRecords,
      counters,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "خطا در دریافت اطلاعات" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: "فایل Excel را انتخاب کنید." }, { status: 400 });
    }

    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", raw: false });
    const records: Array<Record<string, unknown>> = [];

    for (const sheetName of workbook.SheetNames) {
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
        header: 1, defval: "", raw: false, blankrows: false,
      });
      const headerIndex = matrix.findIndex((row) => !emptyRow(row));
      if (headerIndex < 0) continue;

      const headers = matrix[headerIndex].map((value, index) => cell(value) || `ستون بدون نام ${index + 1}`);
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

    if (!records.length) {
      return NextResponse.json({ success: false, error: "ردیف اطلاعاتی قابل‌واردکردن در فایل پیدا نشد." }, { status: 400 });
    }

    // Replace the archive dataset only after the workbook has been parsed and validated.
    // Keep every row, including repeated serial values, for manual correction.
    const operations = [prisma.bayeganiRecord.deleteMany()];
    for (let offset = 0; offset < records.length; offset += 300) {
      const batch = records.slice(offset, offset + 300);
      operations.push(prisma.bayeganiRecord.createMany({ data: batch as never[], skipDuplicates: false }));
    }
    const results = await prisma.$transaction(operations);
    const imported = results.slice(1).reduce((sum, result) => sum + result.count, 0);

    const normalized = await normalizeExistingRecords();

    return NextResponse.json({
      success: true,
      imported,
      detected: records.length,
      normalized,
      sheets: workbook.SheetNames,
      message: "رکوردهای قبلی بایگانی جایگزین شدند؛ ترتیب ردیف‌ها و کدهای بایگانی حفظ شد و سریال‌های تکراری برای ویرایش دستی باقی ماندند.",
    });
  } catch (error) {
    console.error("Bayegani Excel import error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "خطا در پردازش فایل Excel",
    }, { status: 500 });
  }
}
