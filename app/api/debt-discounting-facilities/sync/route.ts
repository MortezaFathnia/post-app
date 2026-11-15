import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const facilityPrefix = "1538.340.";

export async function POST() {
  try {
    // Start with BayeganiRecord; DebtDiscountingRecord is only the matching
    // source that determines which Bayegani facilities belong in this list.
    const bayeganiRecords = await prisma.bayeganiRecord.findMany({
      where: { facilityNumber: { startsWith: facilityPrefix } },
      orderBy: [{ facilityNumber: "asc" }, { id: "asc" }],
      select: {
        id: true,
        facilityNumber: true,
        facilityTitle: true,
        counterLabel: true,
        serial: true,
        startDate: true,
        endDate: true,
      },
    });

    const facilityNumbers = Array.from(new Set(
      bayeganiRecords
        .map((item) => item.facilityNumber)
        .filter((item): item is string => Boolean(item)),
    ));

    if (facilityNumbers.length === 0) {
      return NextResponse.json({
        success: true, created: 0, updated: 0, skipped: 0,
        message: "هیچ تسهیلاتی با پیش‌شماره 1538.340. در جدول بایگانی پیدا نشد.",
      });
    }

    const debtRecords = await prisma.debtDiscountingRecord.findMany({
      where: { facilityNumber: { in: facilityNumbers } },
      distinct: ["facilityNumber"],
      select: { facilityNumber: true },
    });
    const matchedNumbers = new Set(debtRecords.map((item) => item.facilityNumber));

    const primaryByFacility = new Map<string, (typeof bayeganiRecords)[number]>();
    for (const source of bayeganiRecords) {
      const number = source.facilityNumber;
      if (!number || !matchedNumbers.has(number)) continue;
      const current = primaryByFacility.get(number);
      if (!current || (!current.serial && source.serial)) {
        primaryByFacility.set(number, source);
      }
    }

    let created = 0;
    let updated = 0;
    const skipped = facilityNumbers.filter((number) => !matchedNumbers.has(number)).length;

    await prisma.$transaction(async (tx) => {
      for (const source of primaryByFacility.values()) {
        if (!source.facilityNumber) continue;
        const data = {
          facilityNumber: source.facilityNumber,
          facilityTitle: source.facilityTitle,
          counterLabel: source.counterLabel,
          serial: source.serial,
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
      skipped,
      message: "همگام‌سازی تسهیلات بر اساس بایگانی و تطبیق با اسناد خرید دین انجام شد.",
    });
  } catch (error) {
    console.error("DebtDocument facilities sync error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "همگام‌سازی اطلاعات تسهیلات خرید دین ناموفق بود.",
      },
      { status: 500 },
    );
  }
}
