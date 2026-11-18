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


export async function GET() {
  try {
    const records = await prisma.debtDiscountingRecord.findMany({
      where: { sheetName: "ثبت دستی" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        counterLabel: true,
        facilityNumber: true,
        serial: true,
        dueDate: true,
        bankAgent: true,
        checkBranch: true,
        description: true,
        paidAmount: true,
        administrativeNumber: true,
        checkStatus: true,
      },
    });
    return NextResponse.json({ success: true, records });
  } catch (error) {
    console.error("Manual debt checks list error:", error);
    return NextResponse.json(
      { success: false, error: "دریافت فهرست چک‌های ثبت‌شده ناموفق بود." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      mode?: string;
      records?: Array<{
        checkNumber?: string;
        amount?: string;
        day?: number | string;
        month?: number | string;
        year?: number | string;
        serial?: string;
        bankCode?: string;
        bankName?: string;
        branchCode?: string;
        accountNumber?: string;
        days?: number;
        deduction?: number;
        payment?: number;
      }>;
      counterLabel?: string;
      facilityNumber?: string;
      serial?: string;
      dueDate?: string;
      bankAgent?: string;
      checkBranch?: string;
      description?: string;
      amount?: string;
      administrativeNumber?: string;
    };
    if (body.mode === "discount-calculator") {
      const counterLabel = clean(body.counterLabel);
      const facilityNumber = clean(body.facilityNumber);
      const rows = Array.isArray(body.records) ? body.records : [];
      if (!counterLabel || !facilityNumber || rows.length === 0) {
        return NextResponse.json({ success: false, error: "باجه، کد تسهیلات و حداقل یک چک انتخاب‌شده الزامی است." }, { status: 400 });
      }

      const sourceFile = `تنزیل چک-${new Date().toISOString()}`;
      const created: Array<{ id: number; checkNumber: string }> = [];
      const duplicates: string[] = [];
      for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const checkNumber = clean(row.checkNumber);
        const amount = clean(row.amount);
        const serial = clean(row.serial);
        const bankCode = clean(row.bankCode);
        const bankName = clean(row.bankName);
        const branchCode = clean(row.branchCode);
        const accountNumber = clean(row.accountNumber);
        const day = Number(row.day);
        const month = Number(row.month);
        const year = Number(row.year);
        if (!checkNumber || !amount || !serial || !bankCode || !bankName || !branchCode ||
            !Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
          return NextResponse.json({ success: false, error: `اطلاعات چک ردیف ${index + 1} کامل نیست.` }, { status: 400 });
        }
        const dueDate = `${year}/${String(month).padStart(2, "0")}/${String(day).padStart(2, "0")}`;
        const existing = await prisma.debtDiscountingRecord.findFirst({
          where: { checkNumber, administrativeNumber: serial },
          select: { id: true },
        });
        if (existing) {
          duplicates.push(checkNumber);
          continue;
        }
        const record = await prisma.debtDiscountingRecord.create({
          data: {
            sourceFile,
            sheetName: "تنزیل چک (خرید دین)",
            sourceRow: index + 1,
            counterLabel,
            facilityNumber,
            customerNumber: customerNumberFromFacility(facilityNumber),
            checkNumber,
            serial,
            administrativeNumber: serial,
            checkStatus: "درراه",
            dueDate,
            paidAmount: amount.replace(/,/g, ""),
            bankAgent: `${bankCode}-${bankName}`,
            checkBranch: branchCode,
            description: accountNumber || null,
            rawData: {
              "شماره چک": checkNumber,
              "مبلغ چک": amount,
              "سری چک": serial,
              "تاریخ سررسید": dueDate,
              "کد بانک": bankCode,
              "نام بانک": bankName,
              "کد شعبه": branchCode,
              "شماره حساب": accountNumber,
              "تعداد روز": Number(row.days) || 0,
              "مبلغ کسر شده": Number(row.deduction) || 0,
              "مبلغ پرداختی": Number(row.payment) || 0,
            } satisfies Prisma.InputJsonObject,
          },
          select: { id: true, checkNumber: true },
        });
        created.push(record);
      }

      return NextResponse.json({
        success: true,
        createdCount: created.length,
        duplicateCheckNumbers: duplicates,
        records: created,
      });
    }



    const counterLabel = clean(body.counterLabel);
    const facilityNumber = clean(body.facilityNumber);
    const serial = clean(body.serial);
    const dueDate = clean(body.dueDate);
    const bankAgent = clean(body.bankAgent);
    const checkBranch = clean(body.checkBranch);
    const description = clean(body.description);
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
        checkBranch,
        description,
        administrativeNumber,
        rawData: {
          "شعبه چک": checkBranch,
          "توضیحات": description,
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
