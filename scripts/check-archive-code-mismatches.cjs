const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

function normalize(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[\u064A\u0649]/g, "ی")
    .replace(/\u0643/g, "ک")
    .replace(/[\u0640\u200e\u200f]/g, "")
    .replace(/[\t\r\n ]+/g, " ")
    .trim();
}

function getRawValue(rawData, key) {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) return "";
  return String(rawData[key] ?? "");
}

async function main() {
  // Read-only audit: this script never updates or deletes records.
  const records = await prisma.bayeganiRecord.findMany({
    select: {
      id: true,
      serial: true,
      archiveCode: true,
      sourceFile: true,
      sheetName: true,
      sourceRow: true,
      rawData: true,
    },
    orderBy: [{ serial: "asc" }, { id: "asc" }],
  });

  const mismatches = [];
  let bothPresent = 0;
  let missingOldField = 0;
  let missingNewField = 0;
  let bothMissing = 0;

  for (const record of records) {
    const oldValue = getRawValue(record.rawData, "کد بایگانی");
    const newValue = getRawValue(record.rawData, "کد بایگانی جدید");
    const oldNormalized = normalize(oldValue);
    const newNormalized = normalize(newValue);

    if (!oldNormalized && !newNormalized) {
      bothMissing++;
      continue;
    }
    if (!oldNormalized) {
      missingOldField++;
      continue;
    }
    if (!newNormalized) {
      missingNewField++;
      continue;
    }

    bothPresent++;
    if (oldNormalized !== newNormalized) {
      mismatches.push({
        id: record.id,
        serial: record.serial ?? "",
        sourceFile: record.sourceFile,
        sheetName: record.sheetName,
        sourceRow: record.sourceRow,
        "کد بایگانی": oldValue,
        "کد بایگانی جدید": newValue,
        normalizedOld: oldNormalized,
        normalizedNew: newNormalized,
        databaseArchiveCode: record.archiveCode ?? "",
      });
    }
  }

  console.log("\nگزارش بررسی فقط‌خواندنی کدهای بایگانی");
  console.log("-------------------------------------");
  console.log(`تعداد کل رکوردها: ${records.length}`);
  console.log(`هر دو فیلد موجود: ${bothPresent}`);
  console.log(`مغایرت بین دو فیلد: ${mismatches.length}`);
  console.log(`فاقد «کد بایگانی»: ${missingOldField}`);
  console.log(`فاقد «کد بایگانی جدید»: ${missingNewField}`);
  console.log(`هر دو فیلد خالی یا ناموجود: ${bothMissing}`);

  if (mismatches.length) {
    console.log("\nرکوردهای دارای مغایرت:");
    console.table(mismatches);
    console.log("\nجزئیات کامل JSON:");
    console.log(JSON.stringify(mismatches, null, 2));
  } else {
    console.log("\nبین رکوردهایی که هر دو فیلد را دارند، مغایرتی پیدا نشد.");
  }

  console.log("\nتوجه: این گزارش فقط می‌خواند و هیچ داده‌ای را تغییر نمی‌دهد.");
}

main()
  .catch((error) => {
    console.error("خطا در بررسی کدهای بایگانی:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
