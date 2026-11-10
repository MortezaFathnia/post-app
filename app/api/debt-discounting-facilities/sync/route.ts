import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function POST() {
  try {
    const sourceFacilities = await prisma.debtDiscountingRecord.findMany({
      where: { facilityNumber: { not: "" } },
      distinct: ["facilityNumber"],
      select: { facilityNumber: true },
    });

    const facilityNumbers = sourceFacilities
      .map((item) => item.facilityNumber)
      .filter((value): value is string => Boolean(value));

    if (facilityNumbers.length === 0) {
      return NextResponse.json({
        success: true,
        created: 0,
        updated: 0,
        skipped: 0,
        message: "هیچ شماره تسهیلات مشترکی پیدا نشد.",
      });
    }

    const bayeganiRecords = await prisma.bayeganiRecord.findMany({
      where: { facilityNumber: { in: facilityNumbers } },
      select: {
        id: true,
        facilityNumber: true,
        customerNumber: true,
        counterLabel: true,
        serial: true,
        startDate: true,
        endDate: true,
      },
    });

    const customerNumbers = Array.from(
      new Set(
        bayeganiRecords
          .map((record) => record.customerNumber)
          .filter((value): value is string => Boolean(value))
      )
    );

    const customers = customerNumbers.length
      ? await prisma.customer.findMany({
          where: { debtorCustomerNumber: { in: customerNumbers } },
          select: {
            id: true,
            debtorCustomerNumber: true,
            name: true,
            companyName: true,
          },
        })
      : [];

    const customersByNumber = new Map<string, typeof customers>();
    for (const customer of customers) {
      if (!customer.debtorCustomerNumber) continue;
      const matches = customersByNumber.get(customer.debtorCustomerNumber) || [];
      matches.push(customer);
      customersByNumber.set(customer.debtorCustomerNumber, matches);
    }

    let created = 0;
    let updated = 0;
    let skipped = 0;

    await prisma.$transaction(async (tx) => {
      for (const source of bayeganiRecords) {
        if (!source.facilityNumber || !source.customerNumber) {
          skipped++;
          continue;
        }

        const matchingCustomers = customersByNumber.get(source.customerNumber) || [];
        if (matchingCustomers.length !== 1) {
          skipped++;
          continue;
        }

        const customer = matchingCustomers[0];
        const customerName = customer.name || customer.companyName || null;
        const data = {
          customerId: customer.id,
          customerName,
          facilityNumber: source.facilityNumber,
          counterLabel: source.counterLabel,
          serial: source.serial,
          startDate: source.startDate || "",
          endDate: source.endDate || "",
        };

        const existing = await tx.debtDiscountingFacility.findFirst({
          where: { contractId: source.id },
          select: { id: true },
        });

        if (existing) {
          await tx.debtDiscountingFacility.update({
            where: { id: existing.id },
            data,
          });
          updated++;
        } else {
          await tx.debtDiscountingFacility.create({
            data: {
              ...data,
              contractId: source.id,
            },
          });
          created++;
        }
      }
    });

    return NextResponse.json({
      success: true,
      created,
      updated,
      skipped,
      message: "همگام‌سازی اطلاعات تسهیلات خرید دین انجام شد.",
    });
  } catch (error) {
    console.error("Debt discounting facilities sync error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error
          ? error.message
          : "همگام‌سازی اطلاعات تسهیلات خرید دین ناموفق بود.",
      },
      { status: 500 },
    );
  }
}
