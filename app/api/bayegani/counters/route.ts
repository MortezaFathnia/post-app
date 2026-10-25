import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const records = await prisma.bayeganiRecord.findMany({
      where: {
        OR: [
          { counterName: { not: null } },
          { counterCode: { not: null } },
        ],
      },
      select: { counterName: true, counterCode: true },
      orderBy: [{ counterName: "asc" }, { counterCode: "asc" }],
    });

    const unique = new Map<string, { name: string; code: string }>();
    for (const record of records) {
      const name = record.counterName?.trim() ?? "";
      const code = record.counterCode?.trim() ?? "";
      if (!name && !code) continue;
      const key = `${name}\u0000${code}`;
      if (!unique.has(key)) unique.set(key, { name, code });
    }

    return NextResponse.json({
      success: true,
      counters: Array.from(unique.values()),
    });
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
