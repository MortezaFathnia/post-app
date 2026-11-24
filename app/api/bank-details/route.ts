import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const fields = [
  "bankName",
  "branchName",
  "branchCode",
  "branchPostalCode",
  "branchPhone",
  "branchAddress",
  "branchManager",
  "counterName",
  "counterCode",
  "brokerName",
  "brokerCustomerCode",
  "bankRepresentative",
] as const;

type BankDetailsInput = Partial<Record<(typeof fields)[number], string | null>>;

function parsePayload(value: unknown): BankDetailsInput {
  if (!value || typeof value !== "object") throw new Error("اطلاعات ارسالی معتبر نیست.");
  const source = value as Record<string, unknown>;
  const result: BankDetailsInput = {};
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
    const records = await prisma.bankDetails.findMany({
      orderBy: [{ bankName: "asc" }, { branchName: "asc" }, { branchCode: "asc" }],
    });
    return NextResponse.json({ success: true, records });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "دریافت اطلاعات بانک و شعب ناموفق بود." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = parsePayload(await request.json());
    if (!data.bankName && !data.branchName && !data.branchCode) {
      return NextResponse.json({ success: false, error: "حداقل نام بانک، نام شعبه یا کد شعبه را وارد کنید." }, { status: 400 });
    }
    const record = await prisma.bankDetails.create({ data });
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
    const record = await prisma.bankDetails.update({ where: { id }, data });
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
    await prisma.bankDetails.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "حذف اطلاعات ناموفق بود." },
      { status: 400 },
    );
  }
}
