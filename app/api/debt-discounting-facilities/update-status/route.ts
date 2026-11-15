import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const facilityPrefix = "1538.340.";

export async function POST() {
  try {
    const sources = await prisma.bayeganiRecord.findMany({
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

    const byFacility = new Map<string, (typeof sources)[number]>();
    for (const source of sources) {
      if (!source.facilityNumber) continue;
      const current = byFacility.get(source.facilityNumber);
      if (!current || (!current.serial && source.serial)) byFacility.set(source.facilityNumber, source);
    }

    let updated = 0;
    await prisma.$transaction(async (tx) => {
      for (const source of byFacility.values()) {
        const status = source.status || "فعال";
        await tx.debtDocument.upsert({
          where: { contractId: source.id },
          create: {
            contractId: source.id,
            facilityNumber: source.facilityNumber,
            facilityTitle: source.facilityTitle,
            counterLabel: source.counterLabel,
            serial: source.serial,
            status,
            startDate: source.startDate || "",
            endDate: source.endDate || "",
          },
          update: { status },
        });
        updated++;
      }
    });

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    console.error("Debt discounting facility status sync error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "بروزرسانی وضعیت تسهیلات ناموفق بود." },
      { status: 500 },
    );
  }
}
