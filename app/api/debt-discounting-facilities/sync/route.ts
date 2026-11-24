import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
const facilityPrefix = "1538.340.";

export async function POST() {
  try {
    const sourceRows = await prisma.bayeganiRecord.findMany({
      where: { facilityNumber: { startsWith: facilityPrefix } },
      orderBy: [{ facilityNumber: "asc" }, { id: "asc" }],
      select: { id: true, facilityNumber: true, facilityTitle: true, counterLabel: true, serial: true, status: true, startDate: true, endDate: true },
    });

    // Deduplicate by facilityNumber, preferring a source row with a serial.
    const sourceByFacility = new Map<string, (typeof sourceRows)[number]>();
    for (const row of sourceRows) {
      const number = row.facilityNumber;
      if (!number?.startsWith(facilityPrefix)) continue;
      const current = sourceByFacility.get(number);
      if (!current || (!current.serial && row.serial)) sourceByFacility.set(number, row);
    }
    const facilityNumbers = [...sourceByFacility.keys()];
    if (!facilityNumbers.length) {
      return NextResponse.json({ success: true, created: 0, updated: 0, skipped: sourceRows.length, total: 0, message: "هیچ تسهیلاتی با پیش‌شماره 1538.340. در بایگانی پیدا نشد." });
    }

    // Reconcile by facilityNumber (not solely contractId) to keep sync idempotent.
    const existingDocs = await prisma.debtDocument.findMany({
      where: { facilityNumber: { in: facilityNumbers } },
      orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
    });
    const docByFacility = new Map<string, (typeof existingDocs)[number]>();
    for (const doc of existingDocs) if (doc.facilityNumber && !docByFacility.has(doc.facilityNumber)) docByFacility.set(doc.facilityNumber, doc);

    let created = 0;
    let updated = 0;
    await prisma.$transaction(async (tx) => {
      for (const source of sourceByFacility.values()) {
        const number = source.facilityNumber;
        if (!number) continue;
        const data = { facilityNumber: number, facilityTitle: source.facilityTitle, counterLabel: source.counterLabel, serial: source.serial, startDate: source.startDate || "", endDate: source.endDate || "" };
        const existing = docByFacility.get(number);
        if (existing) {
          // Preserve status users may have set to "تسویه شده".
          await tx.debtDocument.update({ where: { id: existing.id }, data });
          updated++;
          continue;
        }
        const byContract = await tx.debtDocument.findUnique({ where: { contractId: source.id }, select: { id: true } });
        if (byContract) {
          await tx.debtDocument.update({ where: { id: byContract.id }, data });
          updated++;
        } else {
          await tx.debtDocument.create({ data: { ...data, contractId: source.id, status: source.status || "فعال" } });
          created++;
        }
      }
    });

    return NextResponse.json({ success: true, created, updated, skipped: sourceRows.length - sourceByFacility.size, total: sourceByFacility.size, message: "تمام تسهیلات 1538.340. با بایگانی تطبیق داده و در دیتابیس ذخیره شدند." });
  } catch (error) {
    console.error("Debt discounting facilities sync error:", error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "همگام‌سازی اطلاعات تسهیلات خرید دین ناموفق بود." }, { status: 500 });
  }
}
