import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

function cell(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}
function value(raw: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) if (raw[key] !== undefined && cell(raw[key])) return cell(raw[key]);
  return "";
}

export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const recordId = Number(id);
  if (!Number.isInteger(recordId) || recordId < 1) return NextResponse.json({ error: "شناسه نامعتبر است." }, { status: 400 });
  const record = await prisma.bayeganiRecord.findUnique({ where: { id: recordId } });
  if (!record) return NextResponse.json({ error: "رکورد پیدا نشد." }, { status: 404 });
  return NextResponse.json({ success: true, record });
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const recordId = Number(id);
    if (!Number.isInteger(recordId) || recordId < 1) return NextResponse.json({ success: false, error: "شناسه نامعتبر است." }, { status: 400 });
    const body = await request.json() as { rawData?: unknown };
    if (!body.rawData || typeof body.rawData !== "object" || Array.isArray(body.rawData)) {
      return NextResponse.json({ success: false, error: "اطلاعات ویرایش‌شده معتبر نیست." }, { status: 400 });
    }
    const raw = body.rawData as Record<string, unknown>;
    const record = await prisma.bayeganiRecord.update({
      where: { id: recordId },
      data: {
        rawData: raw as never,
        facilityNumber: value(raw, "شماره تسهيلات", "شماره تسهیلات") || null,
        customerNumber: value(raw, "شماره مشتری", "شماره مشتري") || null,
        archiveCode: value(raw, "کد بایگانی", "شماره بایگانی", "کد بایگانی جدید") || null,
        facilityTitle: value(raw, "عنوان تسهیلات", "عنوان تسهيلات") || null,
        serial: value(raw, "سریال", "سریال2"),
        classification: value(raw, "طبقه", "طبقه بایگانی"),
        counterName: value(raw, "نام باجه"),
        counterCode: value(raw, "باجه", "کد باجه"),
        status: value(raw, "وضعيت کنونی", "وضعیت کنونی"),
        startDate: value(raw, "تاريخ شروع", "تاریخ شروع"),
        endDate: value(raw, " پایان قرارداد", "پایان قرارداد", "تاریخ پایان قرارداد"),
        duration: value(raw, "مدت", "24"),
        approvedAmount: value(raw, "مبلغ مصوب", "مبلغ"),
        remainingAmount: value(raw, "مانده تسهيلات", "مانده تسهیلات"),
        nationalId: value(raw, "کد ملي ", "کد ملي مشتري", "کد ملی"),
      },
    });
    return NextResponse.json({ success: true, record });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "ذخیره تغییرات ناموفق بود." }, { status: 500 });
  }
}
