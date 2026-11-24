import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCounterName, normalizePersianText } from "@/lib/normalize-persian";

function value(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const current = raw[key];
    if (current !== undefined && current !== null && String(current).trim() !== "") return String(current).trim();
  }
  return "";
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


function getHighestSerial(records: Array<{ serial: string | null; serialSort: bigint | null }>): bigint {
  let highest = 0n;
  for (const item of records) {
    if (item.serialSort !== null && item.serialSort > highest) highest = item.serialSort;
    if (item.serial) {
      const digits = item.serial
        .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
        .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
        .replace(/[^0-9]/g, "");
      if (/^\d{1,18}$/.test(digits)) {
        const numeric = BigInt(digits);
        if (numeric > highest) highest = numeric;
      }
    }
  }
  return highest;
}

export async function GET() {
  try {
    // Serial numbers are globally unique, so use the latest serial across the entire archive.
    const existing = await prisma.bayeganiRecord.findMany({
      where: { serial: { not: null } },
      select: { serial: true, serialSort: true },
    });
    const highestSerial = getHighestSerial(existing);
    return NextResponse.json({
      success: true,
      lastSerial: highestSerial.toString(),
      nextSerial: (highestSerial + 1n).toString(),
    });
  } catch (error) {
    console.error("Latest Bayegani serial lookup failed:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "دریافت آخرین سریال بایگانی ناموفق بود." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { rawData?: unknown };
    if (!body.rawData || typeof body.rawData !== "object" || Array.isArray(body.rawData)) {
      return NextResponse.json({ success: false, error: "اطلاعات واردشده معتبر نیست." }, { status: 400 });
    }
    const raw = { ...(body.rawData as Record<string, unknown>) };
    for (const key of ["column1", "column3", "column23", "column24"]) delete raw[key];
    const facilityNumber = value(raw, "شماره تسهیلات", "شماره تسهيلات");
    if (!facilityNumber) return NextResponse.json({ success: false, error: "کد قرارداد الزامی است." }, { status: 400 });
    // Serial numbers are globally unique across all BayeganiRecord rows.
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
    delete raw["کد بایگانی جدید"];
    // Serial is assigned globally from the highest numeric serial in the archive.
    // Serializable isolation plus the unique database index protects against duplicate serials.
    const record = await prisma.$transaction(async (tx) => {
      const existing = await tx.bayeganiRecord.findMany({
        where: { serial: { not: null } },
        select: { serial: true, serialSort: true },
      });
      const highestSerial = getHighestSerial(existing);
      const nextSerial = (highestSerial + 1n).toString();
      raw["سریال"] = nextSerial;
      delete raw["سریال2"];

      const generatedArchiveCode = [counter.code, value(raw, "طبقه", "طبقه بایگانی"), nextSerial].every(Boolean)
        ? [counter.code, value(raw, "طبقه", "طبقه بایگانی"), nextSerial].join("-")
        : "";
      const archiveCode = generatedArchiveCode || value(raw, "کد بایگانی", "شماره بایگانی");
      if (archiveCode) raw["کد بایگانی"] = archiveCode;

      const lastManualRecord = await tx.bayeganiRecord.findFirst({
        where: { sourceFile: "ورود دستی", sheetName: "ورود دستی" },
        orderBy: { sourceRow: "desc" },
        select: { sourceRow: true },
      });
      const nextSourceRow = (lastManualRecord?.sourceRow ?? 0) + 1;

      const personType = value(raw, "نوع شخص") || "حقیقی";
      if (!["حقیقی", "حقوقی"].includes(personType)) throw new Error("نوع شخص معتبر نیست.");
      raw["نوع شخص"] = personType;
      const nationalCode = personType === "حقوقی" ? "" : value(raw, "کد ملی", "کد ملي ", "کد ملي مشتري");
      if (personType === "حقیقی" && !/^[0-9]{10}$/.test(nationalCode)) {
        throw new Error("کد ملی شخص حقیقی باید دقیقاً شامل ۱۰ رقم باشد.");
      }
      if (personType === "حقوقی" && (!value(raw, "نام شرکت") || !value(raw, "شماره ثبت"))) {
        throw new Error("نام شرکت و شماره ثبت برای شخص حقوقی الزامی است.");
      }
      if (personType === "حقیقی") {
        await tx.customer.upsert({
          where: { nationalCode },
          create: { personType, name: value(raw, "نام") || null, lastName: value(raw, "نام خانوادگی") || null, nationalCode },
          update: { personType, name: value(raw, "نام") || null, lastName: value(raw, "نام خانوادگی") || null },
        });
      }
      if (personType === "حقوقی") {
        const registrationNumber = value(raw, "شماره ثبت");
        const company = {
          personType,
          name: null,
          lastName: null,
          nationalCode: null,
          companyName: value(raw, "نام شرکت"),
          registrationNumber,
        };
        const existingCompany = await tx.customer.findFirst({ where: { personType: "حقوقی", registrationNumber }, select: { id: true } });
        if (existingCompany) {
          await tx.customer.update({ where: { id: existingCompany.id }, data: company });
        } else {
          await tx.customer.create({ data: company });
        }
      }
      if (facilityNumber) {
        await tx.contractDetails.upsert({
          where: { facilityNumber },
          create: { facilityNumber },
          update: {},
        });
        if (personType === "حقیقی") {
          await tx.contractCustomer.upsert({
            where: { facilityNumber_nationalCode: { facilityNumber, nationalCode } },
            create: { facilityNumber, nationalCode, role: "BORROWER" },
            update: { role: "BORROWER" },
          });
        }
      }

      const facilityTypeValue = value(raw, "نوع تسهیلات", "نوع تسهيلات");
      const facilityCodeCandidate = facilityTypeValue.match(/^(\d+)\s*-/)?.[1];
      const matchedFacilityCode = facilityCodeCandidate
        ? await tx.facilityCode.findUnique({ where: { code: facilityCodeCandidate }, select: { code: true } })
        : null;
      const createdRecord = await tx.bayeganiRecord.create({
        data: {
          sourceFile: "ورود دستی", sheetName: "ورود دستی", sourceRow: nextSourceRow,
          facilityNumber: facilityNumber || null,
          personType,
          customerNumber: customerNumber || null,
          archiveCode: archiveCode || null,
          facilityTitle: value(raw, "عنوان تسهیلات", "عنوان تسهيلات") || null,
          serial: nextSerial,
          serialSort: highestSerial + 1n,
          classification: value(raw, "طبقه", "طبقه بایگانی"),
          counterName: counter.name, counterCode: counter.code, counterLabel: counter.label,
          status: value(raw, "وضعیت کنونی", "وضعيت کنونی") || "فعال",
          startDate: value(raw, "تاریخ شروع", "تاريخ شروع"),
          endDate: value(raw, "پایان قرارداد", " پایان قرارداد", "تاریخ پایان قرارداد"),
          bailDeliveryDate: value(raw, "تاریخ تحویل وثیقه", "تاريخ تحويل وثيقه") || null,
          duration: value(raw, "مدت"), installmentCount: value(raw, "تعداد اقساط") || null, approvedAmount: value(raw, "مبلغ مصوب", "مبلغ"),
          remainingAmount: value(raw, "مانده تسهیلات", "مانده تسهيلات"),
          nationalId: nationalCode || null,
          facilityCode: matchedFacilityCode?.code ?? null,
          rawData: raw as never,
        },
      });
      return createdRecord;
    }, { isolationLevel: "Serializable" });
    // Convert every BigInt value (including nested values) before building the JSON response.
    // This keeps PostgreSQL BIGINT fields intact in the database and exposes them as strings.
    const response = JSON.parse(
      JSON.stringify({ success: true, record }, (_key, item) =>
        typeof item === "bigint" ? item.toString() : item
      )
    );
    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    console.error("Manual Bayegani record creation failed:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "ثبت رکورد ناموفق بود." }, { status: 500 });
  }
}
