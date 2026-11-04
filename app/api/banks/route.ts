import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const banks = await prisma.bank.findMany({
      orderBy: [{ bankId: "asc" }],
      select: { id: true, name: true, bankId: true },
    });
    return NextResponse.json({ success: true, banks });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "دریافت فهرست بانک‌ها ناموفق بود." },
      { status: 500 },
    );
  }
}
