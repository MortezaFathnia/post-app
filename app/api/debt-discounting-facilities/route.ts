import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const allowedStatuses = ["فعال", "تسویه شده"];

export async function GET(request: NextRequest) {
  try {
    const params = request.nextUrl.searchParams;
    const customerSearch = (params.get("customerSearch") || "").trim();
    const contractSearch = (params.get("contractSearch") || "").trim();

    const [records, customers, contracts] = await Promise.all([
      prisma.debtDiscountingFacility.findMany({
        orderBy: { createdAt: "desc" },
        take: 200,
        include: {
          customer: { select: { id: true, type: true, name: true, companyName: true, nationalCode: true } },
          contract: { select: { id: true, facilityNumber: true, facilityTitle: true, customerNumber: true } },
        },
      }),
      prisma.customer.findMany({
        where: customerSearch
          ? {
              OR: [
                { name: { contains: customerSearch, mode: "insensitive" } },
                { companyName: { contains: customerSearch, mode: "insensitive" } },
                { nationalCode: { contains: customerSearch, mode: "insensitive" } },
                { mobile: { contains: customerSearch, mode: "insensitive" } },
              ],
            }
          : undefined,
        orderBy: { id: "desc" },
        take: 30,
        select: { id: true, type: true, name: true, companyName: true, nationalCode: true },
      }),
      prisma.bayeganiRecord.findMany({
        where: contractSearch
          ? {
              OR: [
                { facilityNumber: { contains: contractSearch, mode: "insensitive" } },
                { facilityTitle: { contains: contractSearch, mode: "insensitive" } },
                { customerNumber: { contains: contractSearch, mode: "insensitive" } },
                { serial: { contains: contractSearch, mode: "insensitive" } },
              ],
            }
          : undefined,
        orderBy: { id: "desc" },
        take: 30,
        select: { id: true, facilityNumber: true, facilityTitle: true, customerNumber: true },
      }),
    ]);

    return NextResponse.json({ success: true, records, customers, contracts });
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
      customerId?: number | string;
      contractId?: number | string;
      status?: string;
      startDate?: string;
      endDate?: string;
    };
    const customerId = Number(body.customerId);
    const contractId = Number(body.contractId);
    const status = body.status || "فعال";
    const startDate = String(body.startDate || "").trim();
    const endDate = String(body.endDate || "").trim();

    if (!Number.isInteger(customerId) || customerId <= 0 ||
        !Number.isInteger(contractId) || contractId <= 0 ||
        !allowedStatuses.includes(status) || !startDate || !endDate) {
      return NextResponse.json(
        { success: false, error: "مشتری، رکورد بایگانی، وضعیت و تاریخ شروع و پایان را بررسی کنید." },
        { status: 400 },
      );
    }

    const record = await prisma.debtDiscountingFacility.create({
      data: { customerId, contractId, status, startDate, endDate },
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
