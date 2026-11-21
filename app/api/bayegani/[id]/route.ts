import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCounterName, normalizePersianText } from "@/lib/normalize-persian";

type RouteContext = { params: Promise<{ id: string }> };

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function value(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) if (raw[key] !== undefined && cell(raw[key])) return cell(raw[key]);
  return "";
}

// Prisma returns PostgreSQL BIGINT fields as JavaScript bigint values.
// JSON.stringify/NextResponse.json cannot serialize bigint, so expose it as a
// string to preserve precision and keep the API response JSON-safe.
function serializeRecord<T extends { serialSort: bigint | null }>(record: T) {
  return {
    ...record,
    serialSort: record.serialSort === null ? null : record.serialSort.toString(),
  };
}

function splitCounter(input: string): { code: string; name: string } | null {
  const match = input.match(/^(\d+)\s*-\s*(.*)$/);
  return match ? { code: match[1].trim(), name: match[2].trim() } : null;
}

function normalizeCounter(raw: Record<string, unknown>) {
  let name = normalizeCounterName(value(raw, "نام باجه"));
  let code = normalizePersianText(value(raw, "کد باجه", "باجه"));
  const combinedName = splitCounter(name);
  if (combinedName) {
    code = code || combinedName.code;
    name = combinedName.name;
  }
  const combinedCode = splitCounter(code);
  if (combinedCode) {
    code = combinedCode.code;
    name = name || combinedCode.name;
  }
  raw["نام باجه"] = name;
  raw["کد باجه"] = code;
  raw["کد باجه-نام باجه"] = code && name ? `${code}-${name}` : "";
  return { name, code, label: code && name ? `${code}-${name}` : "" };
}

function customerNumberFromFacility(facilityNumber: string): string {
  const parts = facilityNumber.trim().split(".");
  return parts.length >= 3 ? (parts[2] || "").trim() : "";
}

export async function GET(_request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const recordId = Number(id);
    if (!Number.isInteger(recordId) || recordId < 1) {
      return NextResponse.json({ success: false, error: "شناسه نامعتبر است." }, { status: 400 });
    }

    const record = await prisma.bayeganiRecord.findUnique({ where: { id: recordId } });
    if (!record) {
      return NextResponse.json({ success: false, error: "رکورد پیدا نشد." }, { status: 404 });
    }

    // GET remains read-only; hydrate customer name fields for older records from Customer.
    const rawData = record.rawData && typeof record.rawData === "object" && !Array.isArray(record.rawData)
      ? { ...(record.rawData as Record<string, unknown>) }
      : {};
    const nationalCode = record.nationalId || value(rawData, "کد ملی", "کد ملي ", "کد ملي مشتري");
    if (nationalCode) {
      const customer = await prisma.customer.findFirst({
        where: { nationalCode },
        select: { name: true, lastName: true },
      });
      if (customer) {
        rawData["نام"] = customer.name || rawData["نام"] || "";
        rawData["نام خانوادگی"] = customer.lastName || rawData["نام خانوادگی"] || "";
      }
    }
    return NextResponse.json({ success: true, record: serializeRecord({ ...record, rawData }) });
  } catch (error) {
    console.error("Load archive record error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "دریافت رکورد ناموفق بود.",
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const recordId = Number(id);
    if (!Number.isInteger(recordId) || recordId < 1) {
      return NextResponse.json({ success: false, error: "شناسه نامعتبر است." }, { status: 400 });
    }

    const body = await request.json() as { rawData?: unknown; status?: string };
    if (body.status !== undefined) {
      if (!["فعال", "تسویه شده"].includes(body.status)) {
        return NextResponse.json({ success: false, error: "وضعیت باید فعال یا تسویه شده باشد." }, { status: 400 });
      }
      const existing = await prisma.bayeganiRecord.findUnique({ where: { id: recordId }, select: { id: true, rawData: true } });
      if (!existing) return NextResponse.json({ success: false, error: "رکورد پیدا نشد." }, { status: 404 });
      const rawData = existing.rawData && typeof existing.rawData === "object" && !Array.isArray(existing.rawData)
        ? { ...(existing.rawData as Record<string, unknown>) } : {};
      rawData["وضعیت کنونی"] = body.status;
      const updated = await prisma.bayeganiRecord.update({ where: { id: recordId }, data: { status: body.status, rawData: rawData as never } });
      return NextResponse.json({ success: true, record: serializeRecord(updated) });
    }
    if (!body.rawData || typeof body.rawData !== "object" || Array.isArray(body.rawData)) {
      return NextResponse.json({ success: false, error: "اطلاعات ویرایش‌شده معتبر نیست." }, { status: 400 });
    }

    const raw = { ...(body.rawData as Record<string, unknown>) };
    for (const key of ["column1", "column3", "column23", "column24"]) delete raw[key];

    const existingRecord = await prisma.bayeganiRecord.findUnique({
      where: { id: recordId },
      select: { id: true, serial: true },
    });
    if (!existingRecord) {
      return NextResponse.json({ success: false, error: "رکورد پیدا نشد." }, { status: 404 });
    }

    // Serial is immutable after creation; ignore any value submitted by the browser.
    if (existingRecord.serial) raw["سریال"] = existingRecord.serial;
    delete raw["سریال2"];

    const facilityNumber = value(raw, "شماره تسهيلات", "شماره تسهیلات");
    if (!facilityNumber) return NextResponse.json({ success: false, error: "کد قرارداد الزامی است." }, { status: 400 });
    const duplicateContract = await prisma.bayeganiRecord.findFirst({ where: { id: { not: recordId }, OR: [{ facilityNumber }, { contractCode: facilityNumber }] }, select: { id: true } });
    if (duplicateContract) return NextResponse.json({ success: false, error: "این کد قرارداد قبلاً برای رکورد دیگری ثبت شده است؛ کد قرارداد باید یکتا باشد." }, { status: 409 });
    if (!value(raw, "تاریخ شروع", "تاريخ شروع")) {
      const parts = new Intl.DateTimeFormat("en-u-ca-persian", { timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
      const part = (type: string) => parts.find((item) => item.type === type)?.value || "";
      raw["تاریخ شروع"] = `${part("year")}/${part("month")}/${part("day")}`;
    }
    const derivedCustomerNumber = customerNumberFromFacility(facilityNumber);
    if (derivedCustomerNumber) raw["شماره مشتری"] = derivedCustomerNumber;
    const customerNumber = derivedCustomerNumber || value(raw, "شماره مشتری", "شماره مشتري");

    const counter = normalizeCounter(raw);
    raw["وضعیت کنونی"] = value(raw, "وضعیت کنونی", "وضعيت کنونی") || "فعال";
    raw["مبلغ مصوب"] = value(raw, "مبلغ مصوب", "مبلغ");
    delete raw["مبلغ"];
    const generatedArchiveCode = [counter.code, value(raw, "طبقه", "طبقه بایگانی"), value(raw, "سریال", "سریال2")].every(Boolean)
      ? [counter.code, value(raw, "طبقه", "طبقه بایگانی"), value(raw, "سریال", "سریال2")].join("-")
      : "";
    const archiveCode = generatedArchiveCode || value(raw, "کد بایگانی جدید", "کد بایگانی", "شماره بایگانی");
    delete raw["کد بایگانی جدید"];
    if (archiveCode) raw["کد بایگانی"] = archiveCode;

    const record = await prisma.$transaction(async (tx) => {
      const nationalCode = value(raw, "کد ملی", "کد ملي ", "کد ملي مشتري");
      if (nationalCode) {
        await tx.customer.upsert({
          where: { nationalCode },
          create: { name: value(raw, "نام") || null, lastName: value(raw, "نام خانوادگی") || null, nationalCode },
          update: { name: value(raw, "نام") || null, lastName: value(raw, "نام خانوادگی") || null },
        });
        if (facilityNumber) {
          await tx.contractDetails.upsert({
            where: { contractCode: facilityNumber },
            create: { contractCode: facilityNumber },
            update: {},
          });
          await tx.contractCustomer.upsert({
            where: { contractCode_nationalCode: { contractCode: facilityNumber, nationalCode } },
            create: { contractCode: facilityNumber, nationalCode, role: "BORROWER" },
            update: { role: "BORROWER" },
          });
        }
      }
      const updatedRecord = await tx.bayeganiRecord.update({
        where: { id: recordId },
        data: {
        rawData: raw as never,
        facilityNumber: facilityNumber || null,
        customerNumber: customerNumber || null,
        archiveCode: archiveCode || null,
        facilityTitle: value(raw, "عنوان تسهیلات", "عنوان تسهيلات") || null,
        classification: value(raw, "طبقه", "طبقه بایگانی"),
        counterName: counter.name,
        counterCode: counter.code,
        counterLabel: counter.label,
        status: value(raw, "وضعيت کنونی", "وضعیت کنونی") || "فعال",
        startDate: value(raw, "تاريخ شروع", "تاریخ شروع"),
        endDate: value(raw, " پایان قرارداد", "پایان قرارداد", "تاریخ پایان قرارداد"),
        bailDeliveryDate: value(raw, "تاریخ تحویل وثیقه", "تاريخ تحويل وثيقه") || null,
        duration: value(raw, "مدت", "24"),
        installmentCount: value(raw, "تعداد اقساط") || null,
        approvedAmount: value(raw, "مبلغ مصوب", "مبلغ"),
        remainingAmount: value(raw, "مانده تسهيلات", "مانده تسهیلات"),
        nationalId: nationalCode || null,
        contractCode: facilityNumber || null,
        },
      });
      return updatedRecord;
    });

    return NextResponse.json({ success: true, record: serializeRecord(record) });
  } catch (error) {
    console.error("Save archive record error:", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "ذخیره تغییرات ناموفق بود.",
    }, { status: 500 });
  }
}
