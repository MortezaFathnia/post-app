const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalizeText(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[\u064A\u0649]/g, "ی")
    .replace(/\u0643/g, "ک")
    .replace(/[\u0640\u200c\u200e\u200f]/g, (character) =>
      character === "\u200c" ? "‌" : ""
    )
    .replace(/[\t\r\n ]+/g, " ")
    .trim();
}

function normalizeName(value) {
  const normalized = normalizeText(value);
  const aliases = {
    "باغ اسیا": "باغ آسیا",
    "اسیا": "آسیا",
  };
  return aliases[normalized] ?? normalized;
}

function splitCombined(value) {
  const match = normalizeText(value).match(/^(\d+)\s*-\s*(.*)$/);
  return match ? { code: match[1], name: match[2].trim() } : null;
}

async function main() {
  const referenceRows = await prisma.bajehCode.findMany({
    select: { code: true, name: true },
    orderBy: [{ code: "asc" }, { name: "asc" }],
  });

  if (!referenceRows.length) {
    throw new Error('جدول "bajehCode" خالی است. ابتدا node scripts/import-bajeh-code.cjs را اجرا کنید.');
  }

  const byCode = new Map();
  const byName = new Map();

  for (const row of referenceRows) {
    const code = normalizeText(row.code);
    const name = normalizeName(row.name);
    if (!code || !name) continue;

    if (!byCode.has(code)) byCode.set(code, []);
    byCode.get(code).push({ code, name });

    const key = name;
    if (!byName.has(key)) byName.set(key, []);
    byName.get(key).push({ code, name });
  }

  const records = await prisma.bayeganiRecord.findMany({
    select: {
      id: true,
      rawData: true,
      counterCode: true,
      counterName: true,
      counterLabel: true,
    },
  });

  let updated = 0;
  let unchanged = 0;
  let unmatched = 0;

  for (const record of records) {
    const rawData =
      record.rawData && typeof record.rawData === "object" && !Array.isArray(record.rawData)
        ? { ...record.rawData }
        : {};

    let code = normalizeText(rawData["کد باجه"] || record.counterCode || "");
    let name = normalizeName(rawData["نام باجه"] || record.counterName || "");

    const combinedName = splitCombined(name);
    if (combinedName) {
      if (!code) code = combinedName.code;
      name = combinedName.name;
    }

    const combinedCode = splitCombined(code);
    if (combinedCode) {
      code = combinedCode.code;
      if (!name) name = normalizeName(combinedCode.name);
    }

    let canonical = null;
    const codeMatches = byCode.get(code) ?? [];

    if (codeMatches.length === 1) {
      // The reference table is authoritative when the code is known.
      canonical = codeMatches[0];
    } else if (codeMatches.length > 1) {
      canonical = codeMatches.find((item) => normalizeName(item.name) === name) ?? null;
    }

    if (!canonical) {
      const nameMatches = byName.get(name) ?? [];
      if (nameMatches.length === 1) canonical = nameMatches[0];
      else if (nameMatches.length > 1) {
        canonical = nameMatches.find((item) => item.code === code) ?? null;
      }
    }

    if (!canonical) {
      unmatched += 1;
      continue;
    }

    const label = `${canonical.code}-${canonical.name}`;
    rawData["کد باجه"] = canonical.code;
    rawData["نام باجه"] = canonical.name;
    rawData["کد باجه-نام باجه"] = label;

    const changed =
      normalizeText(record.counterCode) !== canonical.code ||
      normalizeName(record.counterName) !== canonical.name ||
      normalizeText(record.counterLabel) !== label ||
      JSON.stringify(record.rawData) !== JSON.stringify(rawData);

    if (!changed) {
      unchanged += 1;
      continue;
    }

    await prisma.bayeganiRecord.update({
      where: { id: record.id },
      data: {
        counterCode: canonical.code,
        counterName: canonical.name,
        counterLabel: label,
        rawData,
      },
    });
    updated += 1;
  }

  console.log("یکسان‌سازی کد و نام باجه‌ها انجام شد.");
  console.log(`رکوردهای اصلاح‌شده: ${updated}`);
  console.log(`رکوردهای بدون تغییر: ${unchanged}`);
  console.log(`رکوردهای بدون تطبیق با جدول مرجع (بدون تغییر باقی ماندند): ${unmatched}`);
}

main()
  .catch((error) => {
    console.error("خطا در یکسان‌سازی اطلاعات باجه‌ها:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
