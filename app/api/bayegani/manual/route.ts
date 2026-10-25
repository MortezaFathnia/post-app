import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

function value(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const current = raw[key];
    if (current !== undefined && current !== null && String(current).trim() !== "") return String(current).trim();
  }
  return "";
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
    const raw = body.rawData as Record<string, unknown>;
    const facilityNumber = value(raw, "شماره تسهیلات", "شماره تسهيلات");
    const derivedCustomerNumber = customerNumberFromFacility(facilityNumber);
    if (derivedCustomerNumber) raw["شماره مشتری"] = derivedCustomerNumber;
    const customerNumber = derivedCustomerNumber || value(raw, "شماره مشتری", "شماره مشتري");
    const record = await prisma.bayeganiRecord.create({
      data: {
        sourceFile: "ورود دستی", sheetName: "ورود دستی", sourceRow: Date.now(),
        facilityNumber: facilityNumber || null,
        customerNumber: customerNumber || null,
        archiveCode: value(raw, "کد بایگانی", "شماره بایگانی", "کد بایگانی جدید") || null,
        facilityTitle: value(raw, "عنوان تسهیلات", "عنوان تسهيلات") || null,
        serial: value(raw, "سریال", "سریال2"), classification: value(raw, "طبقه", "طبقه بایگانی"),
        counterName: value(raw, "نام باجه"), counterCode: value(raw, "کد باجه", "باجه"),
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
