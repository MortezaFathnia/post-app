import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCounterName, normalizePersianText } from "@/lib/normalize-persian";

type RouteContext = { params: Promise<{ id: string }> };

function normalizeInput(body: unknown) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("اطلاعات ارسالی معتبر نیست.");
  const input = body as Record<string, unknown>;
  const code = normalizePersianText(String(input.code ?? "").trim());
  const name = normalizeCounterName(String(input.name ?? "").trim());
  if (!code || !name) throw new Error("کد باجه و نام باجه الزامی هستند.");
  if (!/^\\d+$/.test(code)) throw new Error("کد باجه باید فقط شامل عدد باشد.");
  return { code, name };
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ success: false, error: "شناسه باجه نامعتبر است." }, { status: 400 });
    const { code, name } = normalizeInput(await request.json());
    const current = await prisma.bajehCode.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ success: false, error: "باجه پیدا نشد." }, { status: 404 });
    const duplicate = await prisma.bajehCode.findFirst({ where: { code, NOT: { id } } });
    if (duplicate) return NextResponse.json({ success: false, error: `کد باجه «${code}» قبلاً ثبت شده است.` }, { status: 409 });
    const counter = await prisma.bajehCode.update({ where: { id }, data: { code, name } });
    return NextResponse.json({ success: true, counter });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ویرایش باجه ناموفق بود.";
    const status = message.includes("الزامی") || message.includes("باید فقط") || message.includes("معتبر نیست") ? 400 : 500;
    return NextResponse.json({ success: false, error: message }, { status });
  }
}

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const id = Number((await context.params).id);
    if (!Number.isInteger(id) || id < 1) return NextResponse.json({ success: false, error: "شناسه باجه نامعتبر است." }, { status: 400 });
    const current = await prisma.bajehCode.findUnique({ where: { id } });
    if (!current) return NextResponse.json({ success: false, error: "باجه پیدا نشد." }, { status: 404 });
    await prisma.bajehCode.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "حذف باجه ناموفق بود." }, { status: 500 });
  }
}
