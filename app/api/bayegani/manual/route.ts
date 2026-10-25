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
  return { name, code };
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
    const record = await prisma.bayeganiRecord.create({
      data: {
        sourceFile: "ورود دستی", sheetName: "ورود دستی", sourceRow: Date.now(),
        facilityNumber: facilityNumber || null,
        customerNumber: customerNumber || null,
        archiveCode: value(raw, "کد بایگانی", "شماره بایگانی", "کد بایگانی جدید") || null,
        facilityTitle: value(raw, "عنوان تسهیلات", "عنوان تسهيلات") || null,
        serial: value(raw, "سریال", "سریال2"), classification: value(raw, "طبقه", "طبقه بایگانی"),
        counterName: counter.name, counterCode: counter.code,
        status: value(raw, "وضعیت کنونی", "وضعيت کنونی"),
        startDate: value(raw, "تاریخ شروع", "تاريخ شروع"),
        endDate: value(raw, "پایان قرارداد", " پایان قرارداد", "تاریخ پایان قرارداد"),
        duration: value(raw, "مدت"), approvedAmount: value(raw, "مبلغ مصوب", "مبلغ"),
        remainingAmount: value(raw, "مانده تسهیلات", "مانده تسهيلات"),
        nationalId: value(raw, "کد ملی", "کد ملي ", "کد ملي مشتري") || null,
        rawData: raw as never,
      },
    });
    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (error) {
    console.error("Manual Bayegani record creation failed:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "ثبت رکورد ناموفق بود." }, { status: 500 });
  }
}
