import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const fields = [
  "counterName",
  "counterCode",
  "brokerName",
  "brokerCustomerCode",
  "bankRepresentative",
] as const;

type CounterDetailsInput = Partial<Record<(typeof fields)[number], string | null>>;

function parsePayload(value: unknown): CounterDetailsInput {
  if (!value || typeof value !== "object") throw new Error("اطلاعات ارسالی معتبر نیست.");
  const source = value as Record<string, unknown>;
  const result: CounterDetailsInput = {};
  for (const field of fields) {
    const raw = source[field];
    if (raw === undefined) continue;
    if (raw !== null && typeof raw !== "string") throw new Error(`مقدار فیلد ${field} معتبر نیست.`);
    result[field] = typeof raw === "string" ? raw.trim() || null : null;
  }
  return result;
}

export async function GET() {
  try {
    const records = await prisma.counterDetails.findMany({
      orderBy: [{ counterCode: "asc" }, { counterName: "asc" }],
    });
    return NextResponse.json({ success: true, records });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "دریافت اطلاعات باجه ناموفق بود." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = parsePayload(await request.json());
    if (!data.counterName && !data.counterCode) {
      return NextResponse.json({ success: false, error: "نام باجه یا کد باجه را وارد کنید." }, { status: 400 });
    }
    const record = await prisma.counterDetails.create({ data });
    return NextResponse.json({ success: true, record }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "ثبت اطلاعات ناموفق بود." },
      { status: 400 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as { id?: number; [key: string]: unknown };
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "شناسه رکورد معتبر نیست." }, { status: 400 });
    }
    const data = parsePayload(body);
    const record = await prisma.counterDetails.update({ where: { id }, data });
    return NextResponse.json({ success: true, record });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "ویرایش اطلاعات ناموفق بود." },
      { status: 400 },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "شناسه رکورد معتبر نیست." }, { status: 400 });
    }
    await prisma.counterDetails.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "حذف اطلاعات ناموفق بود." },
      { status: 400 },
    );
  }
}
