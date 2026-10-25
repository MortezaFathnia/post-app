export type DbExcelRow = Record<string, string>;

export type PreviewRow = {
  rowIndex: number; // zero-based index in the JSON array; Excel row number is rowIndex + 2
  excelRowNumber: number;
  borrowerName: string;
  nationalCode: string;
  contractNumber: string;
  loanType: string;
  values: DbExcelRow;
};

export type DbExcelPreview = {
  fileName: string;
  sheetName: string;
  headers: string[];
  rows: PreviewRow[];
};
