import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePersianText } from "@/lib/normalize-persian";

function normalizeInput(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("اطلاعات ارسالی معتبر نیست.");
  const input = body as Record<string, unknown>;
  const classification = Number(normalizePersianText(String(input.classification ?? "").trim()));
  const facilityType = normalizePersianText(String(input.facilityType ?? "").trim());
  const duration = normalizePersianText(String(input.duration ?? "").trim());
  if (!Number.isInteger(classification) || classification < 0) throw new Error("طبقه باید یک عدد صحیح و نامنفی باشد.");
  return { classification, facilityType: facilityType || null, duration: duration || null };
}

export async function GET() {
  try {
    const classifications = await prisma.facilityClassification.findMany({ orderBy: { classification: "asc" } });
    return NextResponse.json({ success: true, classifications });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "دریافت اطلاعات ناموفق بود." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = normalizeInput(await request.json());
    const existing = await prisma.facilityClassification.findUnique({ where: { classification: data.classification } });
    if (existing) return NextResponse.json({ success: false, error: "این طبقه قبلاً ثبت شده است." }, { status: 409 });
    const classification = await prisma.facilityClassification.create({ data });
    return NextResponse.json({ success: true, classification }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ثبت اطلاعات ناموفق بود.";
    return NextResponse.json({ success: false, error: message }, { status: message.includes("طبقه") || message.includes("معتبر") ? 400 : 500 });
  }
}
