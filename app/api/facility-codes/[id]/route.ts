import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizePersianText } from "@/lib/normalize-persian";

type RouteContext = { params: Promise<{ id: string }> };

function normalizeInput(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("اطلاعات ارسالی معتبر نیست.");
  const input = body as Record<string, unknown>;
  const code = normalizePersianText(String(input.code ?? "").trim());
  const name = normalizePersianText(String(input.name ?? "").trim());
  if (!code || !name) throw new Error("کد تسهیلات و نام تسهیلات الزامی هستند.");
  if (!/^\d+$/.test(code)) throw new Error("کد تسهیلات باید فقط شامل عدد باشد.");
  return { code, name };
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ success: false, error: "شناسه رکورد نامعتبر است." }, { status: 400 });
    const { code, name } = normalizeInput(await request.json());
    const current = await prisma.facilityCode.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ success: false, error: "کد تسهیلات پیدا نشد." }, { status: 404 });
    const duplicate = await prisma.facilityCode.findFirst({ where: { code, NOT: { id } } });
    if (duplicate) return NextResponse.json({ success: false, error: `کد تسهیلات «${code}» قبلاً ثبت شده است.` }, { status: 409 });
    const facilityCode = await prisma.facilityCode.update({ where: { id }, data: { code, name } });
    return NextResponse.json({ success: true, facilityCode });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ویرایش کد تسهیلات ناموفق بود.";
    const status = message.includes("الزامی") || message.includes("باید فقط") || message.includes("معتبر نیست") ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
