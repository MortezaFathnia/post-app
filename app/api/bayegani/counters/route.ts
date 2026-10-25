import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const counters = await prisma.bajehCode.findMany({
      where: {
        code: { not: "" },
        name: { not: "" },
      },
      orderBy: [{ code: "asc" }, { name: "asc" }],
      select: { code: true, name: true },
    });

    return NextResponse.json({ success: true, counters });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "دریافت فهرست باجه‌ها ناموفق بود.",
      },
      { status: 500 },
    );
  }
}
