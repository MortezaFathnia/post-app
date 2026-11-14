import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
    if (query.length < 2) {
      return NextResponse.json({ success: true, people: [] });
    }

    const records = await prisma.debtDiscountingFacility.findMany({
      where: {
        facilityTitle: { contains: query, mode: "insensitive" },
        facilityNumber: { not: null },
      },
      select: {
        facilityTitle: true,
        facilityNumber: true,
      },
      orderBy: [{ facilityTitle: "asc" }, { facilityNumber: "asc" }],
      take: 500,
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
    console.error("Debt discounting facility autocomplete error:", error);
    return NextResponse.json(
      { success: false, error: "جست‌وجوی نام و تسهیلات ناموفق بود." },
      { status: 500 },
    );
  }
}
