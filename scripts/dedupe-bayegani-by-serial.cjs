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

function populatedFieldCount(record) {
  const raw = record.rawData && typeof record.rawData === "object" && !Array.isArray(record.rawData)
    ? record.rawData
    : {};
  return Object.values(raw).filter((value) => value !== null && value !== undefined && String(value).trim() !== "").length;
}

async function main() {
  const records = await prisma.bayeganiRecord.findMany({
    select: {
      id: true,
      serial: true,
      sourceFile: true,
      sheetName: true,
      sourceRow: true,
      rawData: true,
      facilityNumber: true,
      customerNumber: true,
      archiveCode: true,
      facilityTitle: true,
    },
    orderBy: [{ id: "asc" }],
  });

  const groups = new Map();
  let skippedBlankSerial = 0;

  for (const record of records) {
    const serial = normalizeSerial(
      record.serial ||
      (record.rawData && typeof record.rawData === "object" && !Array.isArray(record.rawData)
        ? record.rawData["سریال"] ?? record.rawData["سریال2"]
        : ""),
    );

    // Never treat blank serials as duplicates.
    if (!serial) {
      skippedBlankSerial++;
      continue;
    }

    if (!groups.has(serial)) groups.set(serial, []);
    groups.get(serial).push(record);
  }

  const duplicateGroups = [...groups.entries()]
    .filter(([, group]) => group.length > 1)
    .map(([serial, group]) => {
      // Keep the most complete row; break ties by keeping the oldest (lowest ID).
      const ranked = [...group].sort((a, b) =>
        populatedFieldCount(b) - populatedFieldCount(a) || a.id - b.id
      );
      return { serial, keep: ranked[0], remove: ranked.slice(1) };
    });

  const deleteIds = duplicateGroups.flatMap((group) => group.remove.map((record) => record.id));

  console.log(APPLY ? "حذف رکوردهای تکراری بر اساس سریال" : "پیش‌نمایش حذف رکوردهای تکراری (بدون تغییر داده)");
  console.log("------------------------------------------------");
  console.log(`کل رکوردها: ${records.length}`);
  console.log(`گروه‌های دارای سریال تکراری: ${duplicateGroups.length}`);
  console.log(`رکوردهایی که برای حذف شناسایی شدند: ${deleteIds.length}`);
  console.log(`رکوردهای بدون سریال که دست‌نخورده می‌مانند: ${skippedBlankSerial}`);

  for (const group of duplicateGroups) {
    console.log(`\nسریال ${group.serial}: نگهداری ID ${group.keep.id}`);
    console.table([
      {
        action: "KEEP",
        id: group.keep.id,
        sourceFile: group.keep.sourceFile,
        sheetName: group.keep.sheetName,
        sourceRow: group.keep.sourceRow,
        facilityNumber: group.keep.facilityNumber ?? "",
        archiveCode: group.keep.archiveCode ?? "",
        populatedFields: populatedFieldCount(group.keep),
      },
      ...group.remove.map((record) => ({
        action: APPLY ? "DELETE" : "WOULD DELETE",
        id: record.id,
        sourceFile: record.sourceFile,
        sheetName: record.sheetName,
        sourceRow: record.sourceRow,
        facilityNumber: record.facilityNumber ?? "",
        archiveCode: record.archiveCode ?? "",
        populatedFields: populatedFieldCount(record),
      })),
    ]);
  }

  if (!APPLY) {
    console.log("\nهیچ رکوردی حذف نشد.");
    console.log("پس از بررسی گزارش، برای اجرای حذف واقعی دستور زیر را اجرا کنید:");
    console.log("npm run dedupe:bayegani -- --apply");
    return;
  }

  if (!deleteIds.length) {
    console.log("\nرکورد تکراری برای حذف وجود ندارد.");
    return;
  }

  // Delete only the extra rows selected above. Kept rows and blank-serial rows remain unchanged.
  const result = await prisma.bayeganiRecord.deleteMany({
    where: { id: { in: deleteIds } },
  });

  console.log(`\nحذف انجام شد. تعداد رکوردهای حذف‌شده: ${result.count}`);
}

main()
  .catch((error) => {
    console.error("خطا در حذف رکوردهای تکراری:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
