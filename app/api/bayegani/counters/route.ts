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
      let name = record.counterName?.trim() ?? "";
      let code = record.counterCode?.trim() ?? "";
      // Support legacy rows where the counter was stored as one value, e.g. "64508-دلوئی".
      const combined = name.match(/^(\\d+)\\s*-\\s*(.+)$/);
      if (combined) {
        if (!code) code = combined[1];
        name = combined[2].trim();
      }
      if (!name || !code) continue;
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
