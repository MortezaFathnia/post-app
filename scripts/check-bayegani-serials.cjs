const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalizeSerial(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[\u200e\u200f\u0640]/g, "")
    .trim();
}

function getSerial(record) {
  const raw = record.rawData && typeof record.rawData === "object" && !Array.isArray(record.rawData)
    ? record.rawData
    : {};
  return normalizeSerial(record.serial || raw["سریال"] || raw["سریال2"]);
}

async function main() {
  const records = await prisma.bayeganiRecord.findMany({
    select: { id: true, serial: true, sourceFile: true, sheetName: true, sourceRow: true, rawData: true },
  });

  const bySerial = new Map();
  const nonNumeric = [];
  const blank = [];

  for (const record of records) {
    const serial = getSerial(record);
    if (!serial) {
      blank.push(record);
      continue;
    }
    if (!/^\d+$/.test(serial)) {
      nonNumeric.push({ id: record.id, serial, sourceFile: record.sourceFile, sourceRow: record.sourceRow });
      continue;
    }
    const number = BigInt(serial);
    const key = number.toString();
    if (!bySerial.has(key)) bySerial.set(key, []);
    bySerial.get(key).push({ ...record, normalizedSerial: key });
  }

  const serialNumbers = [...bySerial.keys()].map(BigInt).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const duplicates = [...bySerial.entries()].filter(([, group]) => group.length > 1);
  const gaps = [];

  for (let i = 1; i < serialNumbers.length; i++) {
    const previous = serialNumbers[i - 1];
    const current = serialNumbers[i];
    if (current > previous + 1n) {
      gaps.push({
        from: (previous + 1n).toString(),
        to: (current - 1n).toString(),
        missingCount: (current - previous - 1n).toString(),
      });
    }
  }

  console.log("بررسی پشت‌سرهم بودن سریال‌ها (فقط گزارش؛ بدون تغییر داده)");
  console.log("------------------------------------------------------");
  console.log(\`کل رکوردها: \${records.length}\`);
  console.log(\`سریال‌های عددی یکتا: \${serialNumbers.length}\`);
  console.log(\`بازه موجود: \${serialNumbers.length ? serialNumbers[0].toString() + " تا " + serialNumbers[serialNumbers.length - 1].toString() : "بدون سریال عددی"}\`);
  console.log(\`گروه‌های سریال تکراری: \${duplicates.length}\`);
  console.log(\`بازه‌های دارای پرش: \${gaps.length}\`);
  console.log(\`رکوردهای بدون سریال: \${blank.length}\`);
  console.log(\`سریال‌های غیرعددی: \${nonNumeric.length}\`);

  if (gaps.length) {
    console.log("\\nپرش‌ها / سریال‌های جاافتاده:");
    console.table(gaps.map((gap) => ({
      missingFrom: gap.from,
      missingTo: gap.to,
      missingCount: gap.missingCount,
    })));
  } else if (serialNumbers.length) {
    console.log("\\nدر بازه سریال‌های عددی موجود، هیچ عددی جا نیفتاده است.");
  }

  if (duplicates.length) {
    console.log("\\nسریال‌های تکراری:");
    console.table(duplicates.map(([serial, group]) => ({
      serial,
      count: group.length,
      recordIds: group.map((record) => record.id).join(", "),
    })));
  }

  if (nonNumeric.length) {
    console.log("\\nمقادیر سریال غیرعددی (برای بررسی دستی):");
    console.table(nonNumeric);
  }

  if (blank.length) {
    console.log("\\nتعداد رکوردهای بدون سریال: " + blank.length + " (این رکوردها برای بررسی پیوستگی قابل ارزیابی نیستند)");
  }
}

main()
  .catch((error) => {
    console.error("خطا در بررسی سریال‌ها:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
