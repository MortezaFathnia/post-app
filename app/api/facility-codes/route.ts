import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePersianText } from "@/lib/normalize-persian";

function normalizeInput(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("اطلاعات ارسالی معتبر نیست.");
  const input = body as Record<string, unknown>;
  const code = normalizePersianText(String(input.code ?? "").trim());
  const name = normalizePersianText(String(input.name ?? "").trim());
  if (!code || !name) throw new Error("کد تسهیلات و نام تسهیلات الزامی هستند.");
  if (!/^\d+$/.test(code)) throw new Error("کد تسهیلات باید فقط شامل عدد باشد.");
  return { code, name };
}

export async function GET() {
  try {
    const facilityCodes = await prisma.facilityCode.findMany({
      orderBy: [{ code: "asc" }],
      select: { id: true, code: true, name: true },
    });
    return NextResponse.json({ success: true, facilityCodes });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "دریافت فهرست کد تسهیلات ناموفق بود." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { code, name } = normalizeInput(await request.json());
    const existing = await prisma.facilityCode.findUnique({ where: { code } });
    if (existing) return NextResponse.json({ success: false, error: `کد تسهیلات «${code}» از قبل ثبت شده است.` }, { status: 409 });
    const facilityCode = await prisma.facilityCode.create({ data: { code, name } });
    return NextResponse.json({ success: true, facilityCode }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ثبت کد تسهیلات ناموفق بود.";
    const status = message.includes("الزامی") || message.includes("باید فقط") || message.includes("معتبر نیست") ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
