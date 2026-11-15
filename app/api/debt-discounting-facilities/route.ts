import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const facilityPrefix = "1538.340.";

export async function GET() {
  try {
    // BayeganiRecord is the primary source. DebtDiscountingRecord is used only
    // to confirm that the facility has a matching debt-discounting record.
    const [bayeganiRecords, debtRecords] = await Promise.all([
      prisma.bayeganiRecord.findMany({
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
      }),
      prisma.debtDiscountingRecord.findMany({
        where: { facilityNumber: { startsWith: facilityPrefix } },
        distinct: ["facilityNumber"],
        select: { facilityNumber: true },
      }),
    ]);

    const matchedNumbers = new Set(debtRecords.map((item) => item.facilityNumber));

    // Count unique facilities in BayeganiRecord that have no exact facilityNumber
    // match in DebtDiscountingRecord. Duplicate archive rows count as one facility.
    const allBayeganiByFacility = new Map<string, (typeof bayeganiRecords)[number]>();
    for (const source of bayeganiRecords) {
      const number = source.facilityNumber;
      if (!number) continue;
      const current = allBayeganiByFacility.get(number);
      if (!current || (!current.serial && source.serial)) {
        allBayeganiByFacility.set(number, source);
      }
    }

    const missingDebtDiscountingCount = Array.from(allBayeganiByFacility.keys())
      .filter((number) => !matchedNumbers.has(number)).length;
    const totalBayeganiFacilities = allBayeganiByFacility.size;
    const allFacilityNumbers = Array.from(allBayeganiByFacility.keys());

    const documents = allFacilityNumbers.length
      ? await prisma.debtDocument.findMany({
          where: { facilityNumber: { in: allFacilityNumbers } },
          orderBy: { updatedAt: "desc" },
        })
      : [];
    const documentByFacility = new Map<string, (typeof documents)[number]>();
    for (const document of documents) {
      if (document.facilityNumber && !documentByFacility.has(document.facilityNumber)) {
        documentByFacility.set(document.facilityNumber, document);
      }
    }

    const records = Array.from(allBayeganiByFacility.values()).map((source) => {
      const document = source.facilityNumber
        ? documentByFacility.get(source.facilityNumber)
        : undefined;
      return {
        id: source.id,
        contractId: source.id,
        documentId: document?.id ?? null,
        facilityNumber: source.facilityNumber,
        facilityTitle: source.facilityTitle,
        counterLabel: source.counterLabel,
        serial: source.serial,
        status: source.status || "فعال",
        hasDebtDiscountingRecord: Boolean(source.facilityNumber && matchedNumbers.has(source.facilityNumber)),
        startDate: document?.startDate || source.startDate || "",
        endDate: document?.endDate || source.endDate || "",
        contract: {
          id: source.id,
          facilityNumber: source.facilityNumber,
          facilityTitle: source.facilityTitle,
          customerNumber: null,
        },
      };
    });

    return NextResponse.json({
      success: true,
      records,
      totalBayeganiFacilities,
      missingDebtDiscountingCount,
    });
  } catch (error) {
    console.error("Debt discounting facilities list error:", error);
    return NextResponse.json(
      { success: false, error: "خطا در دریافت فهرست تسهیلات خرید دین" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as {
      contractId?: number | string;
      status?: string;
      startDate?: string;
      endDate?: string;
    };
    const contractId = Number(body.contractId);
    const status = body.status || "فعال";
    const startDate = String(body.startDate || "").trim();
    const endDate = String(body.endDate || "").trim();

    if (!Number.isInteger(contractId) || contractId <= 0 ||
        !allowedStatuses.includes(status) || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "رکورد بایگانی، وضعیت و تاریخ شروع و پایان را بررسی کنید." },
        { status: 400 },
      );
    }

    const source = await prisma.bayeganiRecord.findUnique({
      where: { id: contractId },
      select: { facilityNumber: true, facilityTitle: true, counterLabel: true, serial: true },
    });
    if (!source) {
      return NextResponse.json({ success: false, error: "رکورد بایگانی پیدا نشد." }, { status: 404 });
    }

    const record = await prisma.debtDocument.upsert({
      where: { contractId },
      create: {
        contractId,
        facilityNumber: source.facilityNumber,
        facilityTitle: source.facilityTitle,
        counterLabel: source.counterLabel,
        serial: source.serial,
        status,
        startDate,
        endDate,
      },
      update: { status, startDate, endDate },
    });
    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Debt discounting facility create error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "ثبت تسهیلات خرید دین ناموفق بود." },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json() as { id?: number | string; contractId?: number | string; status?: string };
    const contractId = Number(body.contractId ?? body.id);
    if (!Number.isInteger(contractId) || contractId <= 0 || !body.status || !allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: "شناسه یا وضعیت تسهیلات معتبر نیست." },
        { status: 400 },
      );
    }

    const source = await prisma.bayeganiRecord.findUnique({
      where: { id: contractId },
      select: {
        facilityNumber: true,
        facilityTitle: true,
        counterLabel: true,
        serial: true,
        startDate: true,
        endDate: true,
      },
    });
    if (!source?.facilityNumber?.startsWith(facilityPrefix)) {
      return NextResponse.json({ success: false, error: "تسهیلات موردنظر در بایگانی پیدا نشد." }, { status: 404 });
    }

    const record = await prisma.debtDocument.upsert({
      where: { contractId },
      create: {
        contractId,
        facilityNumber: source.facilityNumber,
        facilityTitle: source.facilityTitle,
        counterLabel: source.counterLabel,
        serial: source.serial,
        status: body.status,
        startDate: source.startDate || "",
        endDate: source.endDate || "",
      },
      update: { status: body.status },
      select: { id: true, status: true },
    });
    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Debt discounting facility status update error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "تغییر وضعیت ناموفق بود." },
      { status: 500 },
    );
  }
}
