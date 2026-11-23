import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const facilityPrefix = "1538.340.";

export async function GET(request: NextRequest) {
  try {
    const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";

    // Use the same 1538.340. facility source as the "فهرست تسهیلات خرید دین" page.
    // The autocomplete searches the full list (about 135 items), not only DebtDocument rows.
    const archiveRecords = await prisma.bayeganiRecord.findMany({
      where: { facilityNumber: { startsWith: facilityPrefix } },
      orderBy: [{ facilityNumber: "asc" }, { id: "asc" }],
      select: { facilityNumber: true, facilityTitle: true },
    });

    const unique = new Map<string, string>();
    for (const record of archiveRecords) {
      const number = record.facilityNumber?.trim();
      const name = record.facilityTitle?.trim();
      if (!number || !name) continue;
      if (!unique.has(number)) unique.set(number, name);
    }

    const grouped = new Map<string, Set<string>>();
    for (const [number, name] of unique) {
      if (query && !name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) continue;
      if (!grouped.has(name)) grouped.set(name, new Set());
      grouped.get(name)!.add(number);
    }

    const people = Array.from(grouped, ([name, numbers]) => ({
      name,
      facilityNumbers: Array.from(numbers).sort((a, b) => a.localeCompare(b, "fa", { numeric: true })),
    })).sort((a, b) => a.name.localeCompare(b.name, "fa"));

    return NextResponse.json({ success: true, people });
  } catch (error) {
    console.error("DebtDiscountingFacilities autocomplete error:", error);
    return NextResponse.json({ success: false, error: "جست‌وجوی نام و تسهیلات ناموفق بود." }, { status: 500 });
  }
}
