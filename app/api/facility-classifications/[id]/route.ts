import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePersianText } from "@/lib/normalize-persian";

type RouteContext = { params: Promise<{ id: string }> };

function normalizeInput(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("اطلاعات ارسالی معتبر نیست.");
  const input = body as Record<string, unknown>;
  const classification = Number(normalizePersianText(String(input.classification ?? "").trim()));
  const facilityType = normalizePersianText(String(input.facilityType ?? "").trim());
  const duration = normalizePersianText(String(input.duration ?? "").trim());
  if (!Number.isInteger(classification) || classification < 0) throw new Error("طبقه باید یک عدد صحیح و نامنفی باشد.");
  return { classification, facilityType: facilityType || null, duration: duration || null };
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ success: false, error: "شناسه نامعتبر است." }, { status: 400 });
    const data = normalizeInput(await request.json());
    const current = await prisma.facilityClassification.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ success: false, error: "رکورد پیدا نشد." }, { status: 404 });
    const duplicate = await prisma.facilityClassification.findFirst({ where: { classification: data.classification, NOT: { id } } });
    if (duplicate) return NextResponse.json({ success: false, error: "این طبقه قبلاً ثبت شده است." }, { status: 409 });
    const classification = await prisma.facilityClassification.update({ where: { id }, data });
    return NextResponse.json({ success: true, classification });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ویرایش اطلاعات ناموفق بود.";
    return NextResponse.json({ success: false, error: message }, { status: message.includes("طبقه") || message.includes("معتبر") ? 400 : 500 });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ success: false, error: "شناسه نامعتبر است." }, { status: 400 });
    await prisma.facilityClassification.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "حذف رکورد ناموفق بود." }, { status: 500 });
  }
}
