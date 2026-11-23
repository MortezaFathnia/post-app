import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) return NextResponse.json({ success: true, people: [] });

    // Source autocomplete exclusively from the full DebtDocument table.
    const records = await prisma.debtDocument.findMany({
      where: {
        facilityTitle: { contains: query, mode: "insensitive" },
        facilityNumber: { not: null },
      },
      select: { facilityTitle: true, facilityNumber: true },
      orderBy: [{ facilityTitle: "asc" }, { facilityNumber: "asc" }],
    });

    const grouped = new Map<string, Set<string>>();
    for (const record of records) {
      const name = record.facilityTitle?.trim();
      const facilityNumber = record.facilityNumber?.trim();
      if (!name || !facilityNumber) continue;
      if (!grouped.has(name)) grouped.set(name, new Set());
      grouped.get(name)!.add(facilityNumber);
    }

    const people = Array.from(grouped, ([name, numbers]) => ({
      name,
      facilityNumbers: Array.from(numbers).sort((a, b) => a.localeCompare(b, "fa", { numeric: true })),
    }));
    return NextResponse.json({ success: true, people });
  } catch (error) {
    console.error("DebtDocument autocomplete error:", error);
    return NextResponse.json({ success: false, error: "جست‌وجوی نام و تسهیلات ناموفق بود." }, { status: 500 });
  }
}
