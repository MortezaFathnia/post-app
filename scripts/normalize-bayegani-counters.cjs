const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const REMOVED_FIELDS = new Set(["column1", "column3", "column23", "column24"]);

function normalizeText(value) {
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

function normalizeName(value) {
  const normalized = normalizeText(value);
  const aliases = {
    "باغ اسیا": "باغ آسیا",
    "اسیا": "آسیا",
    "زيبد": "زیبد",
    "دلويي": "دلویی",
  };
  return aliases[normalized] ?? normalized;
}

function splitCombined(value) {
  const match = normalizeText(value).match(/^(\d+)\s*-\s*(.*)$/);
  return match ? { code: match[1], name: match[2].trim() } : null;
}

function normalizeRawData(source) {
  const raw = {};
  for (const [originalKey, originalValue] of Object.entries(source ?? {})) {
    const key = normalizeText(originalKey);
    if (REMOVED_FIELDS.has(key.toLowerCase())) continue;
    const targetKey = key === "تیک" ? "توضیحات" : key;
    const value = typeof originalValue === "string" ? normalizeText(originalValue) : originalValue;
    if (targetKey === "توضیحات") {
      // Prefer an existing توضیحات value; use the old تیک value only as a fallback.
      if (raw[targetKey] == null || String(raw[targetKey]).trim() === "") raw[targetKey] = value;
    } else {
      raw[targetKey] = value;
    }
  }
  return raw;
}

function findValue(raw, ...keys) {
  for (const key of keys) {
    const value = normalizeText(raw[key]);
    if (value) return value;
  }
  return "";
}

function customerNumberFromFacility(value) {
  const parts = normalizeText(value).split(".");
  return parts.length >= 3 ? parts[2] : "";
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
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push({ code, name });
  }

  const records = await prisma.bayeganiRecord.findMany({
    select: {
      id: true, rawData: true, facilityNumber: true, customerNumber: true,
      archiveCode: true, facilityTitle: true, serial: true, classification: true,
      counterCode: true, counterName: true, counterLabel: true, status: true,
      startDate: true, endDate: true, duration: true, approvedAmount: true,
      remainingAmount: true, nationalId: true,
    },
  });

  let updated = 0;
  let unchanged = 0;
  let unmatchedCounters = 0;
  let renamedTickFields = 0;

  for (const record of records) {
    const originalRaw = record.rawData && typeof record.rawData === "object" && !Array.isArray(record.rawData)
      ? record.rawData
      : {};
    const raw = normalizeRawData(originalRaw);
    if (Object.prototype.hasOwnProperty.call(originalRaw, "تیک")) renamedTickFields++;

    let code = normalizeText(raw["کد باجه"] || raw["باجه"] || record.counterCode || "");
    let name = normalizeName(raw["نام باجه"] || record.counterName || "");

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
    if (codeMatches.length === 1) canonical = codeMatches[0];
    else if (codeMatches.length > 1) canonical = codeMatches.find((item) => normalizeName(item.name) === name) ?? null;

    if (!canonical && name) {
      const nameMatches = byName.get(name) ?? [];
      if (nameMatches.length === 1) canonical = nameMatches[0];
      else if (nameMatches.length > 1) canonical = nameMatches.find((item) => item.code === code) ?? null;
    }

    if (canonical) {
      code = canonical.code;
      name = canonical.name;
    } else if (code || name) {
      unmatchedCounters++;
      // Keep a usable numeric code, but never store an incomplete combined label such as "1538-".
      if (!code && combinedName) code = combinedName.code;
    }

    const label = code && name ? `${code}-${name}` : "";
    raw["کد باجه"] = code;
    raw["نام باجه"] = name;
    raw["کد باجه-نام باجه"] = label;

    const facilityNumber = normalizeText(record.facilityNumber || findValue(raw, "شماره تسهیلات", "شماره تسهيلات"));
    const derivedCustomerNumber = customerNumberFromFacility(facilityNumber);
    const customerNumber = derivedCustomerNumber || normalizeText(record.customerNumber || findValue(raw, "شماره مشتری", "شماره مشتري"));
    if (facilityNumber) raw["شماره تسهیلات"] = facilityNumber;
    if (customerNumber) raw["شماره مشتری"] = customerNumber;

    const serial = findValue(raw, "سریال", "سریال2") || normalizeText(record.serial);
    const classification = findValue(raw, "طبقه", "طبقه بایگانی") || normalizeText(record.classification);
    const archiveCode = findValue(raw, "کد بایگانی جدید", "کد بایگانی", "شماره بایگانی") || normalizeText(record.archiveCode);
    const facilityTitle = findValue(raw, "عنوان تسهیلات", "عنوان تسهيلات") || normalizeText(record.facilityTitle);
    const status = findValue(raw, "وضعیت کنونی", "وضعيت کنونی") || normalizeText(record.status);
    const startDate = findValue(raw, "تاریخ شروع", "تاريخ شروع") || normalizeText(record.startDate);
    const endDate = findValue(raw, "پایان قرارداد", " پایان قرارداد", "تاریخ پایان قرارداد") || normalizeText(record.endDate);
    const duration = findValue(raw, "مدت") || normalizeText(record.duration);
    const approvedAmount = findValue(raw, "مبلغ مصوب", "مبلغ") || normalizeText(record.approvedAmount);
    const remainingAmount = findValue(raw, "مانده تسهیلات", "مانده تسهيلات") || normalizeText(record.remainingAmount);
    const nationalId = findValue(raw, "کد ملی", "کد ملي ", "کد ملي مشتري") || normalizeText(record.nationalId);

    const next = {
      rawData: raw,
      facilityNumber: facilityNumber || null,
      customerNumber: customerNumber || null,
      archiveCode: archiveCode || null,
      facilityTitle: facilityTitle || null,
      serial: serial || null,
      classification: classification || null,
      counterName: name || null,
      counterCode: code || null,
      counterLabel: label || null,
      status: status || null,
      startDate: startDate || null,
      endDate: endDate || null,
      duration: duration || null,
      approvedAmount: approvedAmount || null,
      remainingAmount: remainingAmount || null,
      nationalId: nationalId || null,
    };

    const changed = JSON.stringify(originalRaw) !== JSON.stringify(raw) ||
      normalizeText(record.facilityNumber) !== facilityNumber ||
      normalizeText(record.customerNumber) !== customerNumber ||
      normalizeText(record.archiveCode) !== archiveCode ||
      normalizeText(record.facilityTitle) !== facilityTitle ||
      normalizeText(record.serial) !== serial ||
      normalizeText(record.classification) !== classification ||
      normalizeText(record.counterName) !== name ||
      normalizeText(record.counterCode) !== code ||
      normalizeText(record.counterLabel) !== label ||
      normalizeText(record.status) !== status ||
      normalizeText(record.startDate) !== startDate ||
      normalizeText(record.endDate) !== endDate ||
      normalizeText(record.duration) !== duration ||
      normalizeText(record.approvedAmount) !== approvedAmount ||
      normalizeText(record.remainingAmount) !== remainingAmount ||
      normalizeText(record.nationalId) !== nationalId;

    if (!changed) {
      unchanged++;
      continue;
    }

    await prisma.bayeganiRecord.update({ where: { id: record.id }, data: next });
    updated++;
  }

  console.log("پاک‌سازی و یکسان‌سازی اطلاعات بایگانی انجام شد.");
  console.log(`رکوردهای اصلاح‌شده: ${updated}`);
  console.log(`رکوردهای بدون تغییر: ${unchanged}`);
  console.log(`فیلدهای «تیک» منتقل‌شده به «توضیحات»: ${renamedTickFields}`);
  console.log(`رکوردهای باجه بدون تطبیق با جدول مرجع: ${unmatchedCounters}`);
  console.log("هیچ رکوردی حذف نشده است.");
}

main()
  .catch((error) => {
    console.error("خطا در پاک‌سازی اطلاعات بایگانی:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
