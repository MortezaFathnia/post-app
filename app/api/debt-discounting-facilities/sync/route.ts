import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  try {
    const sourceFacilities = await prisma.debtDiscountingRecord.findMany({
      where: { facilityNumber: { not: "" } },
      distinct: ["facilityNumber"],
      select: {
        facilityNumber: true,
        counterLabel: true,
        serial: true,
      },
    });

    const facilityNumbers = sourceFacilities
      .map((item) => item.facilityNumber)
      .filter(Boolean);

    if (facilityNumbers.length === 0) {
      return NextResponse.json({
        success: true, created: 0, updated: 0, skipped: 0,
        message: "هیچ شماره تسهیلاتی در جدول اسناد خرید دین وجود ندارد.",
      });
    }

    const sourceRecords = await prisma.bayeganiRecord.findMany({
      where: { facilityNumber: { in: facilityNumbers } },
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

    const matchedFacilityNumbers = new Set(
      sourceRecords.map((record) => record.facilityNumber).filter(Boolean),
    );
    const unmatchedFacilities = sourceFacilities.filter(
      (item) => item.facilityNumber && !matchedFacilityNumbers.has(item.facilityNumber),
    );

    let created = 0;
    let updated = 0;

    await prisma.$transaction(async (tx) => {
      for (const source of sourceRecords) {
        if (!source.facilityNumber) continue;

        const data = {
          facilityNumber: source.facilityNumber,
          facilityTitle: source.facilityTitle,
          counterLabel: source.counterLabel,
          serial: source.serial,
          startDate: source.startDate || "",
          endDate: source.endDate || "",
        };

        const existing = await tx.debtDocument.findFirst({
          where: { contractId: source.id },
          select: { id: true },
        });

        if (existing) {
          await tx.debtDocument.update({
            where: { id: existing.id },
            data,
          });
          updated++;
        } else {
          await tx.debtDocument.create({
            data: { ...data, contractId: source.id },
          });
          created++;
        }
      }

      // Some facility numbers exist in the debt-discounting records but have no
      // corresponding BayeganiRecord. Keep them in the facilities list using
      // the fields that are actually available from the source records.
      for (const source of unmatchedFacilities) {
        const data = {
          facilityNumber: source.facilityNumber,
          counterLabel: source.counterLabel || null,
          serial: source.serial || null,
        };

        const existing = await tx.debtDocument.findFirst({
          where: { facilityNumber: source.facilityNumber, contractId: null },
          select: { id: true },
        });

        if (existing) {
          await tx.debtDocument.update({
            where: { id: existing.id },
            data,
          });
          updated++;
        } else {
          await tx.debtDocument.create({ data });
          created++;
        }
      }
    });

    const skipped = 0;
    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped,
      message: "همگام‌سازی اطلاعات تسهیلات خرید دین انجام شد.",
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
