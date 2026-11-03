import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

function customerNumberFromFacility(facilityNumber: string): string | null {
  return facilityNumber.trim().split(".")[2]?.trim() || null;
}

function clean(value: unknown): string | null {
  if (value === undefined || value === null) return null;
  const result = String(value).trim();
  return result || null;
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      counterLabel?: string;
      facilityNumber?: string;
      serial?: string;
      dueDate?: string;
      bankAgent?: string;
      checkBranch?: string;
      amount?: string;
      administrativeNumber?: string;
    };

    const counterLabel = clean(body.counterLabel);
    const facilityNumber = clean(body.facilityNumber);
    const serial = clean(body.serial);
    const dueDate = clean(body.dueDate);
    const bankAgent = clean(body.bankAgent);
    const checkBranch = clean(body.checkBranch);
    const amount = clean(body.amount);
    const administrativeNumber = clean(body.administrativeNumber);

    const missing = [
      !counterLabel && "کدباجه - نام باجه",
      !facilityNumber && "کد تسهیلات خرید دین",
      !serial && "سریال چک",
      !dueDate && "تاریخ سررسید",
      !bankAgent && "بانک عامل",
      !checkBranch && "شعبه چک",
      !amount && "مبلغ چک",
      !administrativeNumber && "شماره انتظامی",
    ].filter((field): field is string => Boolean(field));

    if (missing.length) {
      return NextResponse.json(
        { success: false, error: `تکمیل این فیلدها الزامی است: ${missing.join("، ")}` },
        { status: 400 },
      );
    }

    const existing = await prisma.debtDiscountingRecord.findFirst({
      where: { serial, administrativeNumber },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json(
        { success: false, error: "این ترکیب سریال چک و شماره انتظامی قبلاً ثبت شده است." },
        { status: 409 },
      );
    }

    if (!counterLabel || !facilityNumber || !serial || !dueDate || !bankAgent || !checkBranch || !amount || !administrativeNumber) {
      return NextResponse.json({ success: false, error: "اطلاعات ارسالی ناقص است." }, { status: 400 });
    }

    const record = await prisma.debtDiscountingRecord.create({
      data: {
        sourceFile: `ثبت دستی-${new Date().toISOString()}`,
        sheetName: "ثبت دستی",
        sourceRow: 1,
        counterLabel,
        facilityNumber,
        customerNumber: customerNumberFromFacility(facilityNumber),
        serial,
        checkNumber: serial,
        checkStatus: "درراه",
        dueDate,
        paidAmount: amount,
        bankAgent,
        administrativeNumber,
        rawData: {
          "شعبه چک": checkBranch,
          "بانک عامل": bankAgent,
          "مبلغ چک": amount,
          "سریال چک": serial,
          "شماره انتظامی": administrativeNumber,
          "تاریخ سررسید": dueDate,
        } satisfies Prisma.InputJsonObject,
      },
      select: { id: true, checkStatus: true },
    });

    return NextResponse.json({ success: true, record });
  } catch (error) {
    console.error("Manual debt check creation error:", error);
    return NextResponse.json(
      { success: false, error: "ثبت چک جدید ناموفق بود. لطفاً دوباره تلاش کنید." },
      { status: 500 },
    );
  }
}
