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

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { rawData?: unknown };
    if (!body.rawData || typeof body.rawData !== "object" || Array.isArray(body.rawData)) {
      return NextResponse.json({ success: false, error: "اطلاعات واردشده معتبر نیست." }, { status: 400 });
    }
    const raw = { ...(body.rawData as Record<string, unknown>) };
    for (const key of ["column1", "column3", "column23", "column24"]) delete raw[key];
    const facilityNumber = value(raw, "شماره تسهیلات", "شماره تسهيلات");
    const derivedCustomerNumber = customerNumberFromFacility(facilityNumber);
    if (derivedCustomerNumber) raw["شماره مشتری"] = derivedCustomerNumber;
    const customerNumber = derivedCustomerNumber || value(raw, "شماره مشتری", "شماره مشتري");
    const counter = normalizeCounter(raw);
    raw["مبلغ مصوب"] = value(raw, "مبلغ مصوب", "مبلغ");
    delete raw["مبلغ"];
    delete raw["کد بایگانی جدید"];
    // Serial is assigned by the server from the highest numeric serial already stored.
    // Serializable isolation prevents two simultaneous manual inserts from taking the same number.
    const record = await prisma.$transaction(async (tx) => {
      const existing = await tx.bayeganiRecord.findMany({
        select: { serial: true, serialSort: true },
      });
      let highestSerial = 0n;
      for (const item of existing) {
        if (item.serialSort !== null && item.serialSort > highestSerial) {
          highestSerial = item.serialSort;
          continue;
        }
        if (item.serial) {
          const digits = item.serial
            .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
            .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
            .replace(/[^0-9]/g, "");
          if (/^\d{1,18}$/.test(digits)) {
            const numeric = BigInt(digits);
            if (numeric > highestSerial) highestSerial = numeric;
          }
        }
      }
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

      return tx.bayeganiRecord.create({
        data: {
          sourceFile: "ورود دستی", sheetName: "ورود دستی", sourceRow: nextSourceRow,
          facilityNumber: facilityNumber || null,
          customerNumber: customerNumber || null,
          archiveCode: archiveCode || null,
          facilityTitle: value(raw, "عنوان تسهیلات", "عنوان تسهيلات") || null,
          serial: nextSerial,
          serialSort: highestSerial + 1n,
          classification: value(raw, "طبقه", "طبقه بایگانی"),
          counterName: counter.name, counterCode: counter.code, counterLabel: counter.label,
          status: value(raw, "وضعیت کنونی", "وضعيت کنونی"),
          startDate: value(raw, "تاریخ شروع", "تاريخ شروع"),
          endDate: value(raw, "پایان قرارداد", " پایان قرارداد", "تاریخ پایان قرارداد"),
          duration: value(raw, "مدت"), approvedAmount: value(raw, "مبلغ مصوب", "مبلغ"),
          remainingAmount: value(raw, "مانده تسهیلات", "مانده تسهيلات"),
          nationalId: value(raw, "کد ملی", "کد ملي ", "کد ملي مشتري") || null,
          rawData: raw as never,
        },
      });
    }, { isolationLevel: "Serializable" });
    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (error) {
    console.error("Manual Bayegani record creation failed:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "ثبت رکورد ناموفق بود." }, { status: 500 });
  }
}
