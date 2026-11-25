import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ImportRecord = {
  facilityNumber: string;
  rowNumber: string | null;
  economicSectorCode: string | null;
  iban: string | null;
  facilityTitle: string | null;
  currentStatus: string | null;
  startDate: string | null;
  paymentCount: string | null;
  duration: string | null;
  approvedAmount: string | null;
  remainingAmount: string | null;
  subFacilityType: string | null;
  customerNumber: string | null;
  fileSerial: string | null;
  endDate: string | null;
  mainFacilityType: string | null;
  branchCode: string | null;
  additionalDescription: string | null;
  lastModifiedDate: string | null;
  archiveNumber: string | null;
  notificationLetterDate: string | null;
  notificationLetterNumber: string | null;
  requirements: string | null;
  approvalAuthority: string | null;
  nationalCode: string | null;
  requestDate: string | null;
  sourceFile: string;
  sheetName: string;
  sourceRow: number;
  rawData: Record<string, string>;
};

function cell(value: unknown): string {
  return value === null || value === undefined ? "" : String(value).trim();
}

function value(row: Record<string, string>, ...headers: string[]): string | null {
  for (const header of headers) {
    const found = row[header];
    if (found !== undefined && found.trim() !== "") return found.trim();
  }
  return null;
}

function isEmpty(row: unknown[]) {
  return row.every((item) => cell(item) === "");
}

function mapRow(
  rawData: Record<string, string>,
  fileName: string,
  sheetName: string,
  sourceRow: number,
): ImportRecord | null {
  const facilityNumber = value(rawData, "شماره تسهيلات", "شماره تسهیلات", "facilityNumber");
  if (!facilityNumber) return null;

  return {
    facilityNumber,
    rowNumber: value(rawData, "رديف", "ردیف"),
    economicSectorCode: value(rawData, "کد بخش اقتصادی"),
    iban: value(rawData, "کد IBAN", "کد ایبان"),
    facilityTitle: value(rawData, "عنوان تسهيلات", "عنوان تسهیلات"),
    currentStatus: value(rawData, "وضعيت کنونی", "وضعیت کنونی"),
    startDate: value(rawData, "تاريخ شروع", "تاریخ شروع"),
    paymentCount: value(rawData, "تعداد پرداخت ها", "تعداد پرداخت‌ها"),
    duration: value(rawData, "مدت"),
    approvedAmount: value(rawData, "مبلغ مصوب"),
    remainingAmount: value(rawData, "مانده تسهيلات", "مانده تسهیلات"),
    subFacilityType: value(rawData, "نوع فرعی تسهیلات"),
    customerNumber: value(rawData, "شماره مشتری", "شماره مشتري"),
    fileSerial: value(rawData, "سریال پرونده"),
    endDate: value(rawData, "تاریخ پایان قرارداد", "تاريخ پايان قرارداد"),
    mainFacilityType: value(rawData, "نوع اصلی تسهلات", "نوع اصلی تسهیلات"),
    branchCode: value(rawData, "کد شعبه"),
    additionalDescription: value(rawData, "توضیحات بیشتر"),
    lastModifiedDate: value(rawData, "تاریخ آخرین تغییر"),
    archiveNumber: value(rawData, "شماره بایگانی"),
    notificationLetterDate: value(rawData, "تاریخ نامه ابلاغیه"),
    notificationLetterNumber: value(rawData, "شماره نامه ابلاغیه"),
    requirements: value(rawData, "ملزومات پرونده"),
    approvalAuthority: value(rawData, "مرجع تصویب کننده"),
    nationalCode: value(rawData, "کد ملي مشتري", "کد ملی مشتری"),
    requestDate: value(rawData, "تاریخ درخواست"),
    sourceFile: fileName,
    sheetName,
    sourceRow,
    rawData,
  };
}

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const requestedPage = Number.parseInt(params.get("page") ?? "1", 10);
    const requestedPageSize = Number.parseInt(params.get("pageSize") ?? "20", 10);
    const page = Number.isFinite(requestedPage) ? Math.max(1, requestedPage) : 1;
    const pageSize = Number.isFinite(requestedPageSize) ? Math.min(100, Math.max(10, requestedPageSize)) : 20;
    const search = (params.get("search") ?? "").trim();

    const where = search ? {
      OR: [
        { facilityNumber: { contains: search, mode: "insensitive" as const } },
        { facilityTitle: { contains: search, mode: "insensitive" as const } },
        { customerNumber: { contains: search, mode: "insensitive" as const } },
        { nationalCode: { contains: search, mode: "insensitive" as const } },
        { archiveNumber: { contains: search, mode: "insensitive" as const } },
        { fileSerial: { contains: search, mode: "insensitive" as const } },
        { branchCode: { contains: search, mode: "insensitive" as const } },
        { currentStatus: { contains: search, mode: "insensitive" as const } },
      ],
    } : {};

    const [records, total] = await Promise.all([
      prisma.bayeganiGuarantee.findMany({
        where,
        orderBy: [{ facilityNumber: "asc" }, { id: "asc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.bayeganiGuarantee.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      records,
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    });
  } catch (error) {
    console.error("Bayegani guarantee list error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "خطا در دریافت اطلاعات ضمانتنامه." },
      { status: 500 },
    );
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
    const records: ImportRecord[] = [];

    for (const sheetName of workbook.SheetNames) {
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
      });
      const headerIndex = matrix.findIndex((row) => !isEmpty(row));
      if (headerIndex < 0) continue;
      const headers = matrix[headerIndex].map((item, index) => cell(item) || `ستون بدون نام ${index + 1}`);

      for (let index = headerIndex + 1; index < matrix.length; index++) {
        const row = matrix[index];
        if (isEmpty(row)) continue;
        const rawData: Record<string, string> = {};
        headers.forEach((header, columnIndex) => {
          rawData[header] = cell(row[columnIndex]);
        });
        const mapped = mapRow(rawData, file.name, sheetName, index + 1);
        if (mapped) records.push(mapped);
      }
    }

    if (records.length === 0) {
      return NextResponse.json(
        { success: false, error: "هیچ ردیف معتبری دارای شماره تسهیلات در فایل پیدا نشد." },
        { status: 400 },
      );
    }

    const duplicateFacilityNumbers = records.length - new Set(records.map((record) => record.facilityNumber)).size;
    if (duplicateFacilityNumbers > 0) {
      return NextResponse.json(
        { success: false, error: `در فایل ${duplicateFacilityNumbers} شماره تسهیلات تکراری وجود دارد. ابتدا موارد تکراری را اصلاح کنید.` },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const facilityNumbers = records.map((record) => record.facilityNumber);
      const existing = await tx.bayeganiGuarantee.findMany({
        where: { facilityNumber: { in: facilityNumbers } },
        select: { facilityNumber: true },
      });
      const existingNumbers = new Set(existing.map((record) => record.facilityNumber).filter((item): item is string => !!item));

      for (const facilityNumber of facilityNumbers) {
        await tx.contractDetails.upsert({
          where: { facilityNumber },
          create: { facilityNumber },
          update: {},
        });
      }

      let created = 0;
      let updated = 0;
      for (const record of records) {
        const { rawData, ...data } = record;
        await tx.bayeganiGuarantee.upsert({
          where: { facilityNumber: record.facilityNumber },
          create: { ...data, rawData: rawData as never },
          update: { ...data, rawData: rawData as never },
        });
        if (existingNumbers.has(record.facilityNumber)) updated++;
        else created++;
      }
      return { created, updated };
    });

    return NextResponse.json({
      success: true,
      detected: records.length,
      created: result.created,
      updated: result.updated,
      message: "رکوردهای دارای شماره تسهیلات مشابه به‌روزرسانی و رکوردهای جدید اضافه شدند؛ سایر رکوردها حفظ شدند.",
    });
  } catch (error) {
    console.error("Bayegani guarantee import error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "خطا در پردازش فایل ضمانتنامه." },
      { status: 500 },
    );
  }
}
