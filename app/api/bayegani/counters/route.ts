import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { normalizeCounterName, normalizePersianText } from "@/lib/normalize-persian";

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
      let name = normalizeCounterName(record.counterName ?? "");
      let code = normalizePersianText(record.counterCode ?? "");
      // Support legacy rows where either field contains "code-name".
      const combinedName = name.match(/^(\d+)\s*-\s*(.*)$/);
      if (combinedName) {
        if (!code) code = combinedName[1].trim();
        name = combinedName[2].trim();
      }
      const combinedCode = code.match(/^(\d+)\s*-\s*(.*)$/);
      if (combinedCode) {
        code = combinedCode[1].trim();
        if (!name) name = combinedCode[2].trim();
      }
      // Do not expose incomplete values such as "1538-" as dropdown options.
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
