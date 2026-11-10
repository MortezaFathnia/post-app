import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const allowedStatuses = ["فعال", "تسویه شده"];

export async function GET() {
  try {
    const records = await prisma.debtDiscountingFacility.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        contract: {
          select: {
            id: true,
            facilityNumber: true,
            facilityTitle: true,
            customerNumber: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, records });
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

    const record = await prisma.debtDiscountingFacility.create({
      data: {
        contractId,
        facilityNumber: source.facilityNumber,
        facilityTitle: source.facilityTitle,
        counterLabel: source.counterLabel,
        serial: source.serial,
        status,
        startDate,
        endDate,
      },
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
    const body = await request.json() as { id?: number | string; status?: string };
    const id = Number(body.id);
    if (!Number.isInteger(id) || id <= 0 || !body.status || !allowedStatuses.includes(body.status)) {
      return NextResponse.json(
        { success: false, error: "شناسه یا وضعیت تسهیلات معتبر نیست." },
        { status: 400 },
      );
    }

    const record = await prisma.debtDiscountingFacility.update({
      where: { id },
      data: { status: body.status },
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
