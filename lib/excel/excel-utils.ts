export type ExcelRow = Record<string, unknown>;

export function getValue(
  row: ExcelRow,
  key: string
): string {
  const value = row[key];

  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

export function nullable(value: string): string | null {
  const trimmed = value.trim();

  return trimmed === "" ? null : trimmed;
}