import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const facilityPrefix = "1538.340.";

export async function POST() {
  try {
    // Pull ALL facilities with the requested prefix directly from BayeganiRecord.
    // DebtDiscountingRecord is intentionally not used as a gate for this sync.
    const bayeganiRecords = await prisma.bayeganiRecord.findMany({
      where: { facilityNumber: { startsWith: facilityPrefix } },
      orderBy: [{ facilityNumber: "asc" }, { id: "asc" }],
      select: {
        id: true,
        facilityNumber: true,
        facilityTitle: true,
        counterLabel: true,
        serial: true,
        status: true,
        startDate: true,
        endDate: true,
      },
    });

    const primaryByFacility = new Map<string, (typeof bayeganiRecords)[number]>();
    for (const source of bayeganiRecords) {
      const number = source.facilityNumber;
      if (!number?.startsWith(facilityPrefix)) continue;
      const current = primaryByFacility.get(number);
      // Prefer the row with serial populated; otherwise retain the first source row.
      if (!current || (!current.serial && source.serial)) primaryByFacility.set(number, source);
    }

    let created = 0;
    let updated = 0;

    await prisma.$transaction(async (tx) => {
      for (const source of primaryByFacility.values()) {
        if (!source.facilityNumber) continue;
        const data = {
          facilityNumber: source.facilityNumber,
          facilityTitle: source.facilityTitle,
          counterLabel: source.counterLabel,
          serial: source.serial,
          status: source.status || "فعال",
          startDate: source.startDate || "",
          endDate: source.endDate || "",
        };

        const existing = await tx.debtDocument.findUnique({
          where: { contractId: source.id },
          select: { id: true },
        });

        if (existing) {
          await tx.debtDocument.update({ where: { id: existing.id }, data });
          updated++;
        } else {
          await tx.debtDocument.create({ data: { ...data, contractId: source.id } });
          created++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped: 0,
      total: primaryByFacility.size,
      message: "تمام تسهیلات با پیش‌شماره 1538.340. از جدول بایگانی تسهیلات همگام‌سازی شدند.",
    });
  } catch (error) {
    console.error("DebtDocument facilities sync error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "همگام‌سازی اطلاعات تسهیلات خرید دین ناموفق بود." },
      { status: 500 },
    );
  }
}
