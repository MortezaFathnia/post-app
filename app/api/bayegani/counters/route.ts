import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCounterName, normalizePersianText } from "@/lib/normalize-persian";

function normalizeInput(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("اطلاعات ارسالی معتبر نیست.");
  const input = body as Record<string, unknown>;
  const code = normalizePersianText(String(input.code ?? "").trim());
  const name = normalizeCounterName(String(input.name ?? "").trim());
  if (!code || !name) throw new Error("کد باجه و نام باجه الزامی هستند.");
  if (!/^\\d+$/.test(code)) throw new Error("کد باجه باید فقط شامل عدد باشد.");
  return { code, name };
}

export async function GET() {
  try {
    const counters = await prisma.bajehCode.findMany({
      where: { code: { not: "" }, name: { not: "" } },
      orderBy: [{ code: "asc" }, { name: "asc" }],
      select: { id: true, code: true, name: true },
    });
    return NextResponse.json({ success: true, counters });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "دریافت فهرست باجه‌ها ناموفق بود." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { code, name } = normalizeInput(await request.json());
    const existingCode = await prisma.bajehCode.findFirst({ where: { code } });
    if (existingCode) return NextResponse.json({ success: false, error: `کد باجه «${code}» از قبل ثبت شده است.` }, { status: 409 });
    const counter = await prisma.bajehCode.create({ data: { code, name } });
    return NextResponse.json({ success: true, counter }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ثبت باجه ناموفق بود.";
    const status = message.includes("الزامی") || message.includes("باید فقط") || message.includes("معتبر نیست") ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
