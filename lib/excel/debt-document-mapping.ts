import type { Prisma } from "@prisma/client";
import { getValue, nullable } from "./excel-utils";

export type DebtDocumentExcelRow = Record<string, unknown>;

export function mapDebtDocumentRow(
  row: DebtDocumentExcelRow,
): Omit<Prisma.DebtDocumentCreateInput, "customer"> {
  return {
    documentType: nullable(
      getValue(row, "نوع سند"),
    ),

    dueDate: nullable(
      getValue(row, "تاریخ سررسید"),
    ),

    serialNumber: nullable(
      getValue(row, "شماره سریال"),
    ),

    nominalAmount: nullable(
      getValue(row, "مبلغ اسمی سند"),
    ),

    nominalAmountWords: nullable(
      getValue(row, "مبلغ اسمی به حروف"),
    ),

    paidAmount: nullable(
      getValue(row, "مبلغ پرداختی"),
    ),

    paidAmountWords: nullable(
      getValue(row, "مبلغ پرداختی به حروف"),
    ),

    obligorName: nullable(
      getValue(row, "متعهد"),
    ),

    description: nullable(
      getValue(row, "توضیحات"),
    ),
  };
}