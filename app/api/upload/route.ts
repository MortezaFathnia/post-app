import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import * as XLSX from "xlsx";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { mapDbExcelRow } from "@/lib/excel/mappping";
import type { DbExcelRow } from "@/lib/excel/types";
import { mapBayeganiExcelRow } from "@/lib/excel/map-bayegani-record";

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
      data: mapDbExcelRow(values),
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
      .filter(({ data }) => !data.name || !data.nationalCode || data.nationalCode === "0")
      .map(({ rowNumber }) => rowNumber);

    if (invalidRows.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: "نام یا کد ملی معتبر مدیون در بعضی از ردیف‌های جدول اول خالی است.",
          rows: invalidRows,
        },
        { status: 400 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const createdCustomers = [];

      for (const { data } of customers) {
        const customerData = {
          name: data.name,
          lastName: data.lastName,
          nationalCode: data.nationalCode!,
          postalCode: data.postalCode,
          birthCertificateNumber: data.birthCertificateNumber,
          birthCertificateSerial: data.birthCertificateSerial,
          birthDate: data.birthDate,
          fatherName: data.fatherName,
          birthPlace: data.birthPlace,
          residence: data.residence,
          address: data.address,
          workAddress: data.workAddress,
          landline: data.landline,
          workPhone: data.workPhone,
          mobile: data.mobile,
          occupation: data.occupation,
          accountNumber: data.debtorAccountNumber,
          accountOpeningDate: data.debtorAccountOpeningDate,
          longTermDepositNumber: data.debtorLongTermDepositNumber,
          longTermDepositAmount: data.debtorLongTermDepositAmount,
          customerNumber: data.debtorCustomerNumber,
        };

        const savedCustomer = await tx.customer.upsert({
          where: { nationalCode: customerData.nationalCode },
          create: customerData,
          update: customerData,
        });
        createdCustomers.push(savedCustomer);
      }

      const firstCustomer = createdCustomers[0];
      const firstData = customers[0].data;

      // facilityNumber is the same identifier used by BayeganiRecord.facilityNumber.
      const internalFacilityNumber = contractNumber;

      const contractPayload = {
        facilityNumber: internalFacilityNumber,
        contractReference: resolvedContractCode,
        contractNumber,
        contractType: firstData.contractType,
        loanType: firstData.loanType,
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

      const contract = await tx.contractDetails.upsert({
        where: { facilityNumber: internalFacilityNumber },
        create: contractPayload,
        update: contractPayload,
      });

      // Link the debtor to the contract using the association model.
      await tx.contractCustomer.deleteMany({
        where: { facilityNumber: internalFacilityNumber, role: "BORROWER" },
      });
      await tx.contractCustomer.create({
        data: {
          facilityNumber: internalFacilityNumber,
          nationalCode: firstCustomer.nationalCode,
          role: "BORROWER",
        },
      });

      const guarantors = [
        {
          role: "GUARANTOR_1" as const,
          name: firstData.guarantor1Name,
          nationalCode: firstData.guarantor1NationalCode,
          postalCode: firstData.guarantor1PostalCode,
          birthCertificateNumber: firstData.guarantor1BirthCertificate,
          birthCertificateSerial: firstData.guarantor1BirthCertificateSerial,
          birthDate: firstData.guarantor1BirthDate,
          fatherName: firstData.guarantor1FatherName,
          birthPlace: firstData.guarantor1BirthPlace,
          residence: firstData.guarantor1Residence,
          address: firstData.guarantor1Address,
          workAddress: firstData.guarantor1WorkAddress,
          landline: firstData.guarantor1Landline,
          workPhone: firstData.guarantor1WorkPhone,
          mobile: firstData.guarantor1Mobile,
          occupation: firstData.guarantor1Occupation,
          accountNumber: firstData.guarantor1AccountNumber,
          accountOpeningDate: firstData.guarantor1AccountOpeningDate,
          longTermDepositNumber: firstData.guarantor1LongTermDepositNumber,
          longTermDepositAmount: firstData.guarantor1LongTermDepositAmount,
          customerNumber: firstData.guarantor1CustomerNumber,
        },
        {
          role: "GUARANTOR_2" as const,
          name: firstData.guarantor2Name,
          nationalCode: firstData.guarantor2NationalCode,
          postalCode: firstData.guarantor2PostalCode,
          birthCertificateNumber: firstData.guarantor2BirthCertificate,
          birthCertificateSerial: firstData.guarantor2BirthCertificateSerial,
          birthDate: firstData.guarantor2BirthDate,
          fatherName: firstData.guarantor2FatherName,
          birthPlace: firstData.guarantor2BirthPlace,
          residence: firstData.guarantor2Residence,
          address: firstData.guarantor2Address,
          workAddress: firstData.guarantor2WorkAddress,
          landline: firstData.guarantor2Landline,
          workPhone: firstData.guarantor2WorkPhone,
          mobile: firstData.guarantor2Mobile,
          occupation: firstData.guarantor2Occupation,
          accountNumber: firstData.guarantor2AccountNumber,
          accountOpeningDate: firstData.guarantor2AccountOpeningDate,
          longTermDepositNumber: firstData.guarantor2LongTermDepositNumber,
          longTermDepositAmount: firstData.guarantor2LongTermDepositAmount,
          customerNumber: firstData.guarantor2CustomerNumber,
        },
        {
          role: "GUARANTOR_3" as const,
          name: firstData.guarantor3Name,
          nationalCode: firstData.guarantor3NationalCode,
          postalCode: firstData.guarantor3PostalCode,
          birthCertificateNumber: firstData.guarantor3BirthCertificate,
          birthCertificateSerial: firstData.guarantor3BirthCertificateSerial,
          birthDate: firstData.guarantor3BirthDate,
          fatherName: firstData.guarantor3FatherName,
          birthPlace: firstData.guarantor3BirthPlace,
          residence: firstData.guarantor3Residence,
          address: firstData.guarantor3Address,
          workAddress: firstData.guarantor3WorkAddress,
          landline: firstData.guarantor3Landline,
          workPhone: firstData.guarantor3WorkPhone,
          mobile: firstData.guarantor3Mobile,
          occupation: firstData.guarantor3Occupation,
          accountNumber: firstData.guarantor3AccountNumber,
          accountOpeningDate: firstData.guarantor3AccountOpeningDate,
          longTermDepositNumber: firstData.guarantor3LongTermDepositNumber,
          longTermDepositAmount: firstData.guarantor3LongTermDepositAmount,
          customerNumber: firstData.guarantor3CustomerNumber,
        },
      ];

      const linkedNationalCodes = new Set([firstCustomer.nationalCode]);
      for (const guarantor of guarantors) {
        const nationalCode = guarantor.nationalCode?.trim();
        if (!guarantor.name?.trim() || !nationalCode || nationalCode === "0" || linkedNationalCodes.has(nationalCode)) {
          continue;
        }

        const { role, ...guarantorData } = guarantor;
        const guarantorNameParts = guarantorData.name!.trim().split(/\s+/).filter(Boolean);
        const guarantorFirstName = guarantorNameParts.shift() ?? null;
        const guarantorLastName = guarantorNameParts.join(" ") || null;
        const customerData = {
          ...guarantorData,
          name: guarantorFirstName,
          lastName: guarantorLastName,
          nationalCode,
        };
        await tx.customer.upsert({
          where: { nationalCode },
          create: customerData,
          update: customerData,
        });

        await tx.contractCustomer.deleteMany({
          where: { facilityNumber: internalFacilityNumber, role },
        });
        await tx.contractCustomer.create({
          data: { facilityNumber: internalFacilityNumber, nationalCode, role },
        });
        linkedNationalCodes.add(nationalCode);
      }

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
      const uploadId = randomUUID();
      // Make each upload a distinct source batch so re-uploading the same
      // Excel filename always appends new archive rows instead of updating old ones.
      const uploadSourceFile = `${file.name}::${uploadId}`;

      // Determine the highest existing serial for this facility. serialSort is
      // preferred, with a digit-normalized serial fallback for older rows.
      // Serial numbers are global across the archive, not scoped to the
      // newly entered facility number. A new facility must continue after
      // the highest serial already present anywhere in BayeganiRecord.
      const previousSerials = await tx.bayeganiRecord.findMany({
        where: { serial: { not: null } },
        select: { id: true, facilityNumber: true, serial: true, serialSort: true, createdAt: true },
      });

      const toSerialNumber = (value: string | null | undefined): bigint | null => {
        if (!value) return null;
        const normalized = value
          .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
          .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
          .replace(/[^0-9]/g, "");
        return normalized ? BigInt(normalized) : null;
      };

      const getRecordSerial = (record: (typeof previousSerials)[number]) =>
        record.serialSort ?? toSerialNumber(record.serial);

      let highestSerial: bigint | null = null;
      for (const existing of previousSerials) {
        const candidate = getRecordSerial(existing);
        if (candidate !== null && (highestSerial === null || candidate > highestSerial)) {
          highestSerial = candidate;
        }
      }

      // If this exact facility already exists, reuse its own highest serial.
      // Otherwise the first row starts at the archive-wide highest + 1.
      const existingFacilityRecords = previousSerials
        .filter((record) => record.facilityNumber === internalFacilityNumber)
        .sort((left, right) => {
          const leftSerial = getRecordSerial(left) ?? -1n;
          const rightSerial = getRecordSerial(right) ?? -1n;
          if (leftSerial !== rightSerial) return leftSerial > rightSerial ? -1 : 1;
          return right.createdAt.getTime() - left.createdAt.getTime() || right.id - left.id;
        });
      const existingLastRecord = existingFacilityRecords[0] ?? null;

      let createdBayeganiRecords = 0;
      for (const [index, { rowNumber, values }] of customers.entries()) {
        const mappedRecordData = mapBayeganiExcelRow(
          values,
          values as Prisma.InputJsonObject,
        );
        const matchedFacilityCode = mappedRecordData.facilityCode
          ? await tx.facilityCode.findUnique({
              where: { code: mappedRecordData.facilityCode },
              select: { code: true },
            })
          : null;

        // Reuse the last serial already stored for this exact facility.
        // For a new facility, continue the global archive serial sequence.
        const reuseExistingFacilitySerial = index === 0 ? existingLastRecord : null;
        const rowSerial = reuseExistingFacilitySerial
          ? getRecordSerial(reuseExistingFacilitySerial)
          : (highestSerial ?? 0n) + 1n;

        if (rowSerial === null) {
          throw new Error(`سریال معتبر برای شماره تسهیلات ${internalFacilityNumber} پیدا نشد.`);
        }
        highestSerial = rowSerial;

        const recordData = {
          ...mappedRecordData,
          facilityCode: matchedFacilityCode?.code ?? null,
          facilityNumber: internalFacilityNumber,
          serial: rowSerial.toString(),
          serialSort: rowSerial,
        };

        if (reuseExistingFacilitySerial) {
          // The facility already has a serial (e.g. 3548). Update that archive
          // row in place so the serial remains exactly the value from the DB
          // and the [facilityNumber, serial] unique key is not duplicated.
          const record = await tx.bayeganiRecord.update({
            where: { id: reuseExistingFacilitySerial.id },
            data: recordData,
          });
          bayeganiRecords.push(record);
        } else {
          const record = await tx.bayeganiRecord.create({
            data: {
              sourceFile: uploadSourceFile,
              sheetName: "DB",
              sourceRow: rowNumber,
              ...recordData,
            },
          });
          bayeganiRecords.push(record);
          createdBayeganiRecords++;
        }
      }

      const lastSerial = highestSerial?.toString() ?? null;

      return {
        createdCustomers,
        firstCustomer,
        contract,
        bayeganiRecords,
        createdBayeganiRecords,
        lastSerial,
      };
    });

    const { createdCustomers, firstCustomer, contract, bayeganiRecords, createdBayeganiRecords, lastSerial } = result;

    return NextResponse.json(
      {
        success: true,
        message: `${createdCustomers.length} رکورد مشتری ذخیره شد؛ ${createdBayeganiRecords} رکورد جدید بایگانی اضافه شد.`,
        count: createdCustomers.length,
        contractDetailsId: contract.id,
        bankDetailsSaved: true,
        bayeganiRecordCount: bayeganiRecords.length,
        id: firstCustomer.id,
        ids: createdCustomers.map((customer) => customer.id),
        contractNumber: contract.contractNumber,
        lastSerial,
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
