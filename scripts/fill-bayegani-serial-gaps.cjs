const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const APPLY = process.argv.includes("--apply");

function normalizeSerial(value) {
  return String(value ?? "")
    .normalize("NFC")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[\u200e\u200f\u0640]/g, "")
    .trim();
}

function getRawData(record) {
  return record.rawData && typeof record.rawData === "object" && !Array.isArray(record.rawData)
    ? record.rawData
    : {};
}

function getSerial(record) {
  const raw = getRawData(record);
  return normalizeSerial(record.serial || raw["سریال"] || raw["سریال2"]);
}

function compareRecords(a, b) {
  return String(a.sourceFile).localeCompare(String(b.sourceFile))
    || String(a.sheetName).localeCompare(String(b.sheetName))
    || a.sourceRow - b.sourceRow
    || a.id - b.id;
}

async function main() {
  const records = await prisma.bayeganiRecord.findMany({
    select: { id: true, serial: true, sourceFile: true, sheetName: true, sourceRow: true, rawData: true },
    orderBy: [{ id: "asc" }],
  });

  const usedSerials = new Map();
  const blankRecords = [];
  const nonNumeric = [];

  for (const record of records) {
    const serial = getSerial(record);
    if (!serial) {
      blankRecords.push(record);
      continue;
    }
    if (!/^\d+$/.test(serial)) {
      nonNumeric.push({ id: record.id, serial });
      continue;
    }
    const normalized = BigInt(serial).toString();
    if (!usedSerials.has(normalized)) usedSerials.set(normalized, []);
    usedSerials.get(normalized).push(record);
  }

  const duplicates = [...usedSerials.entries()].filter(([, group]) => group.length > 1);
  const numbers = [...usedSerials.keys()].map(BigInt).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  const missing = [];

  for (let i = 1; i < numbers.length; i++) {
    for (let n = numbers[i - 1] + 1n; n < numbers[i]; n++) {
      missing.push(n.toString());
    }
  }

  console.log(APPLY
    ? "اجرای تخصیص سریال‌های جاافتاده به رکوردهای بدون سریال"
    : "پیش‌نمایش تخصیص سریال‌های جاافتاده (بدون تغییر داده)");
  console.log("--------------------------------------------------");
  console.log("کل رکوردها: " + records.length);
  console.log("شماره‌های سریال جاافتاده در بازه موجود: " + missing.length);
  console.log("رکوردهای بدون سریال: " + blankRecords.length);
  console.log("گروه‌های سریال تکراری: " + duplicates.length);
  console.log("سریال‌های غیرعددی: " + nonNumeric.length);

  if (duplicates.length) {
    console.error("\nتوقف: سریال تکراری وجود دارد. ابتدا تکراری‌ها را بررسی و اصلاح کنید؛ هیچ تغییری انجام نشد.");
    console.table(duplicates.map(([serial, group]) => ({
      serial, count: group.length, ids: group.map((record) => record.id).join(", "),
    })));
    process.exitCode = 2;
    return;
  }

  if (missing.length === 0) {
    console.log("\nدر بازه سریال‌های موجود، شماره جاافتاده‌ای وجود ندارد.");
    return;
  }

  if (blankRecords.length < missing.length) {
    console.error("\nتوقف: " + missing.length + " شماره جاافتاده است اما فقط " + blankRecords.length + " رکورد بدون سریال وجود دارد.");
    console.error("برای حفظ سریال‌های فعلی، نمی‌توان تمام فاصله‌ها را با رکوردهای خالی پر کرد. هیچ تغییری انجام نشد.");
    return;
  }

  const targets = [...blankRecords].sort(compareRecords).slice(0, missing.length);
  const plan = targets.map((record, index) => ({
    id: record.id,
    sourceFile: record.sourceFile,
    sheetName: record.sheetName,
    sourceRow: record.sourceRow,
    assignedSerial: missing[index],
  }));

  console.log("\nبرنامه تخصیص:");
  console.table(plan);

  if (!APPLY) {
    console.log("\nپیش‌نمایش است؛ هیچ داده‌ای تغییر نکرده است.");
    console.log("پس از بررسی برنامه، برای اعمال تغییرات اجرا کنید:");
    console.log("npm run fill:bayegani-serial-gaps -- --apply");
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (let index = 0; index < targets.length; index++) {
      const record = targets[index];
      const serial = missing[index];
      const raw = { ...getRawData(record) };

      if (Object.prototype.hasOwnProperty.call(raw, "سریال2") &&
          !Object.prototype.hasOwnProperty.call(raw, "سریال")) {
        raw["سریال2"] = serial;
      } else {
        raw["سریال"] = serial;
      }

      const result = await tx.bayeganiRecord.updateMany({
        where: { id: record.id, serial: record.serial },
        data: { serial, rawData: raw },
      });

      if (result.count !== 1) {
        throw new Error("رکورد ID " + record.id + " تغییر کرده یا قابل به‌روزرسانی نیست؛ تراکنش لغو شد.");
      }
    }
  });

  const verifyRecords = await prisma.bayeganiRecord.findMany({
    select: { id: true, serial: true, rawData: true },
  });
  const verified = new Map();

  for (const record of verifyRecords) {
    const serial = getSerial(record);
    if (!serial || !/^\d+$/.test(serial)) continue;
    const key = BigInt(serial).toString();
    if (!verified.has(key)) verified.set(key, []);
    verified.get(key).push(record.id);
  }

  const duplicateAfter = [...verified.entries()].filter(([, ids]) => ids.length > 1);
  const values = [...verified.keys()].map(BigInt).sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
  let gapsAfter = 0n;
  for (let i = 1; i < values.length; i++) {
    gapsAfter += values[i] - values[i - 1] - 1n;
  }

  console.log("\nتعداد رکوردهای به‌روزرسانی‌شده: " + targets.length);
  console.log("گروه‌های تکراری پس از به‌روزرسانی: " + duplicateAfter.length);
  console.log("تعداد شماره‌های جاافتاده باقی‌مانده در بازه: " + gapsAfter.toString());
}

main()
  .catch((error) => {
    console.error("خطا در پر کردن سریال‌های جاافتاده:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
