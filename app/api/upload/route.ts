import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { mapDbExcelRow } from "@/lib/excel/mappping";
import type { DbExcelRow } from "@/lib/excel/types";

export const runtime = "nodejs";

function isEmptyRow(row: unknown[]): boolean {
  return row.every(
    (value) =>
      value === null ||
      value === undefined ||
      (typeof value === "string" && value.trim() === ""),
  );
}

function readFirstDbTable(buffer: ArrayBuffer): {
  headers: string[];
  rows: Array<{ rowNumber: number; values: DbExcelRow }>;
} {
  const workbook = XLSX.read(buffer, {
    type: "array",
    raw: false,
    cellDates: false,
  });

  const dbSheetName = workbook.SheetNames.find(
    (name) => name.trim().toLocaleLowerCase() === "db",
  );

  if (!dbSheetName) {
    throw new Error('صفحه‌ای با نام "DB" در فایل Excel پیدا نشد.');
  }

  const worksheet = workbook.Sheets[dbSheetName];

  if (!worksheet || !worksheet["!ref"]) {
    throw new Error('صفحه "DB" خالی است.');
  }

  // Convert the worksheet to a matrix so that blank rows remain visible.
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: true,
  });

  // The first non-empty row in DB is the first table's header row.
  const headerIndex = matrix.findIndex(
    (row) => Array.isArray(row) && !isEmptyRow(row),
  );

  if (headerIndex < 0) {
    throw new Error('هیچ جدولی در صفحه "DB" پیدا نشد.');
  }

  const rawHeaders = matrix[headerIndex] ?? [];
  let lastHeaderIndex = rawHeaders.length - 1;

  while (
    lastHeaderIndex >= 0 &&
    (rawHeaders[lastHeaderIndex] === null ||
      rawHeaders[lastHeaderIndex] === undefined ||
      String(rawHeaders[lastHeaderIndex]).trim() === "")
  ) {
    lastHeaderIndex--;
  }

  if (lastHeaderIndex < 0) {
    throw new Error('ردیف عنوان‌های جدول اول در صفحه "DB" خالی است.');
  }

  const headers = rawHeaders
    .slice(0, lastHeaderIndex + 1)
    .map((header, index) => {
      const value = String(header ?? "").trim();
      return value || `ستون بدون نام ${index + 1}`;
    });

  const rows: Array<{ rowNumber: number; values: DbExcelRow }> = [];

  // Read only the first contiguous data block under the first header row.
  // The blank row before the second table ends the first table.
  for (let index = headerIndex + 1; index < matrix.length; index++) {
    const sourceRow = (matrix[index] ?? []).slice(0, headers.length);

    if (isEmptyRow(sourceRow)) {
      if (rows.length > 0) break;
      continue;
    }

    const values: DbExcelRow = {};
    headers.forEach((header, columnIndex) => {
      const value = sourceRow[columnIndex];
      values[header] = value === null || value === undefined ? "" : String(value).trim();
    });

    rows.push({
      // Matrix indexes are zero-based; Excel row numbers are one-based.
      rowNumber: index + 1,
      values,
    });
  }

  if (rows.length === 0) {
    throw new Error('جدول اول صفحه "DB" هیچ ردیف اطلاعاتی ندارد.');
  }

  return { headers, rows };
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const contractNumber = String(formData.get("contractNumber") ?? "").trim();
    const contractCode = String(formData.get("contractCode") ?? "").trim();

    if (!contractNumber) {
      return NextResponse.json(
        { success: false, error: "شماره قرارداد الزامی است." },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "فایل Excel ارسال نشده است." },
        { status: 400 },
      );
    }

    const fileName = file.name.toLowerCase();
    if (!fileName.endsWith(".xlsx") && !fileName.endsWith(".xls")) {
      return NextResponse.json(
        {
          success: false,
          error: "فقط فایل‌های Excel با پسوند .xlsx یا .xls مجاز هستند.",
        },
        { status: 400 },
      );
    }

    const { rows } = readFirstDbTable(await file.arrayBuffer());

    // Map rows from the first table in DB using the existing Persian-header mapper.
    const customers = rows.map(({ values, rowNumber }) => ({
      data: mapDbExcelRow(values, file.name, rowNumber),
      rowNumber,
      values,
    }));

    const resolvedContractCode = contractCode || customers[0]?.data.contractCode || "";
    if (!resolvedContractCode) {
      return NextResponse.json(
        { success: false, error: "کد قرارداد الزامی است؛ آن را وارد کنید یا در فایل Excel قرار دهید." },
        { status: 400 },
      );
    }

    const invalidRows = customers
      .filter(({ data }) => !data.name)
      .map(({ rowNumber }) => rowNumber);

    if (invalidRows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "نام و نام خانوادگی مدیون در بعضی از ردیف‌های جدول اول خالی است.",
          rows: invalidRows,
        },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdCustomers = [];

      for (const { data } of customers) {
        const created = await tx.customer.create({
          data: {
            ...data,
            // Keep legacy fields populated while existing templates are migrated.
            contractNumber,
            contractCode: contractCode || data.contractCode || null,
          },
        });
        createdCustomers.push(created);
      }

      const firstCustomer = createdCustomers[0];
      const firstData = customers[0].data;

      const contractPayload = {
        customerId: firstCustomer.id,
        contractCode: resolvedContractCode,
        contractNumber,
        contractDate: firstData.contractDate,
        requestNumber: firstData.requestNumber,
        requestDate: firstData.requestDate,
        approvalNumber: firstData.approvalNumber,
        approvalDate: firstData.approvalDate,
        maturityDate: firstData.maturityDate,
        facilityDescription: firstData.facilityDescription,
        economicSector: firstData.economicSector,
        useOfFunds: firstData.useOfFunds,
        transactionDescription: firstData.transactionDescription,
        salePrice: firstData.salePrice,
        salePriceWords: firstData.salePriceWords,
        purchasePrice: firstData.purchasePrice,
        profitAmount: firstData.profitAmount,
        interestRate: firstData.interestRate,
        latePaymentBaseRate: firstData.latePaymentBaseRate,
        latePaymentRate: firstData.latePaymentRate,
        prepayment: firstData.prepayment,
        payableAmount: firstData.payableAmount,
        facilityAmount: firstData.facilityAmount,
        contractDuration: firstData.contractDuration,
        repaymentMethod: firstData.repaymentMethod,
        gracePeriod: firstData.gracePeriod,
        installmentCount: firstData.installmentCount,
        installmentInterval: firstData.installmentInterval,
        firstInstallmentDate: firstData.firstInstallmentDate,
        firstQardInstallmentDate: firstData.firstQardInstallmentDate,
        bankParticipationPercent: firstData.bankParticipationPercent,
        proposedPartnershipProfit: firstData.proposedPartnershipProfit,
        proposedMudarabahProfit: firstData.proposedMudarabahProfit,
        collateralType: firstData.collateralType,
        collateralDescription: firstData.collateralDescription,
        collateralValue: firstData.collateralValue,
      };

      const contract = resolvedContractCode
        ? await tx.contractDetails.upsert({
            where: { contractCode: resolvedContractCode },
            create: contractPayload,
            update: contractPayload,
          })
        : await tx.contractDetails.create({ data: contractPayload });

      const bankPayload = {
        contractDetailsId: contract.id,
        bankName: firstData.bankName,
        branchName: firstData.branchName,
        branchCode: firstData.branchCode,
        branchPostalCode: firstData.branchPostalCode,
        branchPhone: firstData.branchPhone,
        branchAddress: firstData.branchAddress,
        branchManager: firstData.branchManager,
        counterName: firstData.counterName,
        counterCode: firstData.counterCode,
        brokerName: firstData.brokerName,
        brokerCustomerCode: firstData.brokerCustomerCode,
        bankRepresentative: firstData.bankRepresentative,
      };

      await tx.bankDetails.upsert({
        where: { contractDetailsId: contract.id },
        create: bankPayload,
        update: bankPayload,
      });

      const bayeganiRecords = [];
      for (const { data, rowNumber, values } of customers) {
        const record = await tx.bayeganiRecord.create({
          data: {
            sourceFile: file.name,
            sheetName: "DB",
            sourceRow: rowNumber,
            contractCode: resolvedContractCode,
            nationalId: data.nationalCode,
            facilityTitle: data.facilityDescription,
            status: "فعال",
            rawData: values as Prisma.InputJsonObject,
          },
        });
        bayeganiRecords.push(record);
      }

      return { createdCustomers, firstCustomer, contract, bayeganiRecords };
    });

    const { createdCustomers, firstCustomer, contract, bayeganiRecords } = result;

    return NextResponse.json(
      {
        success: true,
        message: `${createdCustomers.length} رکورد از جدول اول صفحه DB با موفقیت ذخیره شد.`,
        count: createdCustomers.length,
        contractDetailsId: contract.id,
        bankDetailsSaved: true,
        bayeganiRecordCount: bayeganiRecords.length,
        id: firstCustomer.id,
        ids: createdCustomers.map((customer) => customer.id),
        contractNumber: firstCustomer.contractNumber,
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("UPLOAD API ERROR", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    );
  }
}
