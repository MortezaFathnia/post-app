import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";

import { prisma } from "@/lib/prisma";
import {
  mapDebtDocumentRow,
  type DebtDocumentExcelRow,
} from "@/lib/excel/debt-document-mapping";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const customerIdValue = String(
      formData.get("customerId") ?? "",
    ).trim();

    if (!customerIdValue) {
      return NextResponse.json(
        {
          success: false,
          error: "قرارداد الزامی است.",
        },
        { status: 400 },
      );
    }

    const customerId = Number(customerIdValue);

    if (!Number.isInteger(customerId) || customerId <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: "شناسه قرارداد نامعتبر است.",
        },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          error: "فایل Excel ارسال نشده است.",
        },
        { status: 400 },
      );
    }

    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!customer) {
      return NextResponse.json(
        {
          success: false,
          error: "قرارداد پیدا نشد.",
        },
        { status: 404 },
      );
    }

    if (customer.contractType !== "DEBT_DISCOUNTING") {
      return NextResponse.json(
        {
          success: false,
          error:
            "بارگذاری اسناد خرید دین فقط برای قراردادهای خرید دین امکان‌پذیر است.",
        },
        { status: 400 },
      );
    }

    const buffer = await file.arrayBuffer();

    const workbook = XLSX.read(buffer, {
      type: "array",
      raw: false,
    });

    if (!workbook.SheetNames.length) {
      return NextResponse.json(
        {
          success: false,
          error: "فایل Excel فاقد Sheet است.",
        },
        { status: 400 },
      );
    }

    const worksheet =
      workbook.Sheets[workbook.SheetNames[0]];

    const rows = XLSX.utils.sheet_to_json<DebtDocumentExcelRow>(
      worksheet,
      {
        defval: "",
        raw: false,
      },
    );

    if (!rows.length) {
      return NextResponse.json(
        {
          success: false,
          error: "فایل Excel فاقد اطلاعات است.",
        },
        { status: 400 },
      );
    }

    const documents = rows.map((row) =>
      mapDebtDocumentRow(row),
    );

    await prisma.$transaction(
      documents.map((document) =>
        prisma.debtDocument.create({
          data: {
            ...document,
            customerId,
          },
        }),
      ),
    );

    return NextResponse.json({
      success: true,
      customerId,
      count: documents.length,
    });
  } catch (error) {
    console.error(
      "Debt documents upload error:",
      error,
    );

    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "خطا در پردازش فایل Excel",
      },
      { status: 500 },
    );
  }
}