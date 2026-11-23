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

function normalizeJalaliDate(value: string | null): string | null {
  if (!value) return null;
  const ascii = value.trim().replace(/[۰-۹٠-٩]/g, digit => {
    const persian = "۰۱۲۳۴۵۶۷۸۹";
    const arabic = "٠١٢٣٤٥٦٧٨٩";
    const index = persian.indexOf(digit);
    return String(index >= 0 ? index : arabic.indexOf(digit));
  });
  const match = ascii.match(/^(\\d{4})[./-](\\d{1,2})[./-](\\d{1,2})$/);
  if (!match) return ascii.replace(/[.-]/g, "/");
  return `${match[1]}/${match[2].padStart(2, "0")}/${match[3].padStart(2, "0")}`;
}

function addOneDayToJalaliDate(year: number, month: number, day: number): string {
  const target = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const formatter = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
    timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit",
  });
  const formatted = (date: Date) => {
    const parts = formatter.formatToParts(date);
    const part = (type: Intl.DateTimeFormatPartTypes) => parts.find(item => item.type === type)?.value ?? "";
    return `${part("year")}-${part("month")}-${part("day")}`;
  };
  const start = Date.UTC(year + 621, 0, 1, 12);
  for (let offset = 0; offset < 400; offset += 1) {
    const date = new Date(start + offset * 86_400_000);
    if (formatted(date) === target) return formatted(new Date(date.getTime() + 86_400_000));
  }
  return target;
}

function textCsvCell(input: string): string {
  return /[",\\r\\n]/.test(input) ? `"${input.replace(/"/g, '""')}"` : input;
}

function shamsiFileDate(): string {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
    timeZone: "Asia/Tehran", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(new Date());
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}


export async function GET() {
  try {
    const records = await prisma.debtDiscountingRecord.findMany({
      where: { sheetName: { in: ["ثبت دستی", "تنزیل چک (خرید دین)"] } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        checkNumber: true,
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
      facilityName?: string;
      baseDate?: string;
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
      const facilityName = clean(body.facilityName);
      const baseDate = clean(body.baseDate);
      const rows = Array.isArray(body.records) ? body.records : [];
      if (!counterLabel || !facilityNumber || !facilityName || !baseDate || rows.length === 0) {
        return NextResponse.json({ success: false, error: "باجه، کد تسهیلات و حداقل یک چک انتخاب‌شده الزامی است." }, { status: 400 });
      }

      const sourceFile = `تنزیل چک-${new Date().toISOString()}`;
      const created: Array<{ id: number; checkNumber: string; administrativeNumber: string }> = [];
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
        if (!checkNumber || !amount || !serial || !bankCode || !bankName || !accountNumber ||
            !Number.isInteger(day) || !Number.isInteger(month) || !Number.isInteger(year)) {
          return NextResponse.json({ success: false, error: `اطلاعات چک ردیف ${index + 1} کامل نیست.` }, { status: 400 });
        }
        const dueDate = normalizeJalaliDate(addOneDayToJalaliDate(year, month, day));
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
            serial: checkNumber,
            administrativeNumber: serial,
            checkStatus: "درراه",
            dueDate,
            paidAmount: amount.replace(/,/g, ""),
            bankAgent: `${bankCode}-${bankName}`,
            checkBranch: branchCode || null,
            description: bankName,
            rawData: {
              "شماره چک": checkNumber,
              "مبلغ چک": amount,
              "سری چک": serial,
              "تاریخ سررسید": dueDate,
              "کد بانک": bankCode,
              "نام بانک": bankName,
              "کد شعبه": branchCode || "",
              "شماره حساب": accountNumber,
              "تعداد روز": Number(row.days) || 0,
              "مبلغ کسر شده": Number(row.deduction) || 0,
              "مبلغ پرداختی": Number(row.payment) || 0,
            } satisfies Prisma.InputJsonObject,
          },
          select: { id: true, checkNumber: true },
        });
        created.push({ ...record, administrativeNumber: serial });
      }

      const createdPairs = new Set(created.map(record => JSON.stringify([record.checkNumber, record.administrativeNumber])));
      const savedRows = rows.filter(row => {
        const checkNumber = clean(row.checkNumber);
        const serial = clean(row.serial);
        if (!checkNumber || !serial) return false;
        const pair = JSON.stringify([checkNumber, serial]);
        if (!createdPairs.has(pair)) return false;
        createdPairs.delete(pair);
        return true;
      });
      const textContent = savedRows.map(row => {
        const year = Number(row.year), month = Number(row.month), day = Number(row.day);
        const dueDate = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
        const nextDate = addOneDayToJalaliDate(year, month, day);
        const serial = clean(row.serial) || "0";
        const cells = [
          clean(row.checkNumber) || "0",
          String(Math.round(Number(clean(row.amount)?.replace(/,/g, "")) || 0)),
          serial,
          dueDate,
          "L",
          "0",
          nextDate,
          "0",
          "0",
          "17",
          "8881",
          "TRUE",
          clean(row.accountNumber) || "0",
          serial,
        ];
        return cells.map(textCsvCell).join(",");
      }).join("\r\n") + (savedRows.length ? "\r\n" : "");
      const safeFilePart = (value: string) => value.replace(/[<>:"/\\\\|?*\\x00-\\x1F]/g, "_").trim();
      const safeFacility = safeFilePart(facilityNumber);
      const safeName = safeFilePart(facilityName);
      const safeDate = safeFilePart(baseDate.replace(/[/.]/g, "-"));

      return NextResponse.json({
        success: true,
        createdCount: created.length,
        duplicateCheckNumbers: duplicates,
        records: created,
        textContent,
        textFileName: `${safeFacility}-${safeName}-${safeDate}.txt`,
      });
    }



    const counterLabel = clean(body.counterLabel);
    const facilityNumber = clean(body.facilityNumber);
    const serial = clean(body.serial);
    const dueDate = normalizeJalaliDate(clean(body.dueDate));
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


export async function DELETE(request: NextRequest) {
  try {
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id <= 0) {
      return NextResponse.json({ success: false, error: "شناسه چک معتبر نیست." }, { status: 400 });
    }
    const record = await prisma.debtDiscountingRecord.findFirst({
      where: { id, sheetName: { in: ["ثبت دستی", "تنزیل چک (خرید دین)"] } },
      select: { id: true },
    });
    if (!record) {
      return NextResponse.json({ success: false, error: "چک موردنظر پیدا نشد." }, { status: 404 });
    }
    await prisma.debtDiscountingRecord.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Manual debt check deletion error:", error);
    return NextResponse.json({ success: false, error: "حذف چک ناموفق بود." }, { status: 500 });
  }
}
