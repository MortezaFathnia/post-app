/**
 * Normalizes Persian/Arabic character variants and a small, explicit set of
 * known counter-name spelling variants. Add aliases only when they are known
 * to refer to the same counter.
 */
export function normalizePersianText(input: string): string {
  return input
    .normalize("NFC")
    .replace(/[\u064A\u0649]/g, "ی")
    .replace(/\u0643/g, "ک")
    .replace(/[\u0640\u200c\u200e\u200f]/g, (character) =>
      character === "\u200c" ? "‌" : ""
    )
    .replace(/[\t\r\n ]+/g, " ")
    .trim();
}

const COUNTER_NAME_ALIASES: Record<string, string> = {
  "باغ اسیا": "باغ آسیا",
  "اسیا": "آسیا",
};

export function normalizeCounterName(input: string): string {
  const normalized = normalizePersianText(input);
  const alias = COUNTER_NAME_ALIASES[normalized];
  return alias ?? normalized;
}
