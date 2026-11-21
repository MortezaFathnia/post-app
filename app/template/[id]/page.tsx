import Link from "next/link";
import { notFound } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import { prisma } from "@/lib/prisma";
import { getContractTemplateSet } from "@/lib/templates/contract-templates";
import { getTodayDateJalali, sumDatesJalali } from "@/lib/date/jalali";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};


type ClassificationRule = { classification: number; facilityType: string | null; duration: string | null; };

function normalizeClassificationDigits(value: unknown): string {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}
function normalizeClassificationText(value: unknown): string {
  return normalizeClassificationDigits(value).replace(/[يى]/g, "ی").replace(/ك/g, "ک")
    .replace(/[\u200c\s]+/g, " ").trim().replace(/^\d+\s*[-–]\s*/, "").toLocaleLowerCase();
}
function resolveArchiveClassification(rules: ClassificationRule[], facilityType: unknown, duration: unknown): string {
  const normalizedType = normalizeClassificationText(facilityType);
  const typeRule = normalizedType ? rules.find((rule) => normalizeClassificationText(rule.facilityType) === normalizedType) : undefined;
  if (typeRule) return String(typeRule.classification);
  const durationText = normalizeClassificationDigits(duration).trim();
  const monthsText = durationText.replace(/[^0-9.]/g, "");
  const months = Number(monthsText);
  if (!monthsText || !Number.isFinite(months)) return "";
  for (const rule of rules) {
    const range = normalizeClassificationDigits(rule.duration).trim().replace(/\s/g, "");
    if (!range) continue;
    const between = range.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
    if (between && months >= Number(between[1]) && months <= Number(between[2])) return String(rule.classification);
    const greaterThan = range.match(/^>\s*(\d+(?:\.\d+)?)$/);
    if (greaterThan && months > Number(greaterThan[1])) return String(rule.classification);
    const atLeast = range.match(/^>=\s*(\d+(?:\.\d+)?)$/);
    if (atLeast && months >= Number(atLeast[1])) return String(rule.classification);
    const exact = range.match(/^\d+(?:\.\d+)?$/);
    if (exact && months === Number(range)) return String(rule.classification);
  }
  return "";
}

function getUploadedArchiveTitle(rawData: unknown, fallbackApplicantName: string): string {
  if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) return fallbackApplicantName;
  const data = rawData as Record<string, unknown>;
  const normalize = (value: string) => value
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\s]+/g, " ")
    .trim()
    .toLocaleLowerCase();
  const values = new Map(Object.entries(data).map(([key, value]) => [normalize(key), value]));
  const read = (...headers: string[]) => {
    for (const header of headers) {
      const value = values.get(normalize(header));
      if (value !== undefined && value !== null && String(value).trim()) return String(value).trim();
    }
    return "";
  };

  const facilityType = read(
    "نوع تسهیلات",
    "نوع تسهیلات(انتخاب شود)",
    "نوع وام",
    "عنوان تسهیلات",
  );
  const fullApplicantName = read(
    "نام و نام خانوادگی متقاضی",
    "نام و نام خانوادگی مدیون",
    "نام و نام خانوادگی مشتری",
    "نام مدیون",
    "نام متقاضی",
  );
  const firstName = read("نام متقاضی", "نام مدیون", "نام مشتری", "نام");
  const lastName = read("نام خانوادگی متقاضی", "نام خانوادگی مدیون", "نام خانوادگی مشتری", "نام خانوادگی");
  const applicantName = fullApplicantName || [firstName, lastName].filter(Boolean).join(" ") || fallbackApplicantName;
  return [facilityType, applicantName].filter(Boolean).join(" ") || "—";
}


function getLoanTypeTitle(loanType: string | null) {
  switch (loanType) {
    case "MATURITY":
      return "سررسیدی";
    case "INSTALLMENT":
      return "اقساط";
    default:
      return "—";
  }
}

function getArchiveInstallmentCount(
  loanType: string | null,
  duration: unknown,
  fallback: string | null,
): string {
  if (loanType === "INSTALLMENT") {
    const months = String(duration ?? "").trim();
    return months || fallback || "—";
  }
  if (loanType === "MATURITY") return "1";
  return fallback || "—";
}

function getApplicantName(customer: {
  name: string | null;
  lastName: string | null;
  companyName: string | null;
} | null) {
  if (!customer) return "—";
  if (customer.companyName) return customer.companyName;
  return [customer.name, customer.lastName].filter(Boolean).join(" ") || "—";
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-2 break-words text-sm font-bold text-slate-800">
        {value || "—"}
      </p>
    </div>
  );
}

export default async function TemplateSelectionPage({ params }: PageProps) {
  const { id } = await params;
  const contractId = Number(id);

  if (!Number.isInteger(contractId) || contractId <= 0) {
    notFound();
  }

  const contract = await prisma.contractDetails.findUnique({
    where: { id: contractId },
    include: {
      customerLinks: {
        where: { role: "BORROWER" },
        include: {
          customer: {
            select: {
              name: true,
              lastName: true,
              companyName: true,
            },
          },
        },
        take: 1,
      },
    },
  });

  if (!contract) {
    notFound();
  }

  // Resolve the archive record by the exact facility code first.
  // Example: facilityNumber "1538.123.3232132.10" must display its stored serial "3548".
  const facilityCode = contract.facilityNumber?.trim() || contract.contractNumber?.trim() || "";
  const archiveSelect = {
    id: true, sourceFile: true, sourceRow: true, serialSort: true, facilityNumber: true,
    customerNumber: true, archiveCode: true, facilityTitle: true,
    serial: true, classification: true, counterCode: true, counterLabel: true, status: true, startDate: true,
    endDate: true, duration: true, installmentCount: true, approvedAmount: true,
    remainingAmount: true, rawData: true,
  } as const;

  const [bayeganiRecords, classificationRules] = await Promise.all([
    (async () => {
      if (facilityCode) {
        const exactFacilityRecord = await prisma.bayeganiRecord.findFirst({
          where: { facilityNumber: facilityCode },
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          select: archiveSelect,
        });
        if (exactFacilityRecord) return [exactFacilityRecord];
      }

      // Fallback only when no exact facilityNumber match exists.
      return prisma.bayeganiRecord.findMany({
        where: { OR: [
          ...(contract.facilityNumber ? [{ facilityNumber: contract.facilityNumber }] : []),
          ...(contract.contractNumber ? [{ facilityNumber: contract.contractNumber }] : []),
        ] },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 1,
        select: archiveSelect,
      });
    })(),
    prisma.facilityClassification.findMany({
      orderBy: { classification: "asc" },
      select: { classification: true, facilityType: true, duration: true },
    }),
  ]);

  const templateSet = getContractTemplateSet(contract.contractType);

  if (!templateSet) {
    notFound();
  }

  const applicantName = getApplicantName(
    contract.customerLinks[0]?.customer ?? null,
  );
  const todayPersianDate = getTodayDateJalali();
  const hasUsableDate = (value: string | null | undefined) =>
    Boolean(value?.trim()) && !["0", "٠", "۰", "—", "-"].includes(value!.trim());

  const archiveStartDate = bayeganiRecords.find((record) =>
    hasUsableDate(record.startDate),
  )?.startDate;
  const displayedStartDate = hasUsableDate(archiveStartDate)
    ? archiveStartDate!
    : todayPersianDate;

  // Persist the exact values shown in "اطلاعات بایگانی تسهیلات" so the
  // BayeganiRecord table and the template-selection page stay in sync.
  // Serial is intentionally excluded: it remains the latest serial already
  // stored in BayeganiRecord and is never replaced from rawData here.
  const archiveFieldUpdates = bayeganiRecords.map((record) => {
    const rawData = record.rawData && typeof record.rawData === "object" && !Array.isArray(record.rawData)
      ? record.rawData as Record<string, unknown>
      : {};
    const facilityType = rawData["نوع تسهیلات"] ?? record.facilityTitle ?? rawData["عنوان تسهیلات"] ?? "";
    const duration = [
      record.duration,
      rawData["مدت"],
      rawData["مدت تسهیلات(به ماه)"],
      rawData["مدت تسهیلات (به ماه)"],
      rawData["مدت تسهیلات به ماه"],
      rawData["مدت قرارداد"],
    ].find((value) => value !== null && value !== undefined && String(value).trim() && !["0", "۰", "٠"].includes(String(value).trim())) ?? "";
    const rawStartDate = [
      record.startDate,
      rawData["تاریخ شروع"],
      rawData["تاریخ شروع قرارداد"],
      rawData["تاریخ آغاز"],
    ].find((value) => hasUsableDate(value));
    const startDate = hasUsableDate(rawStartDate) ? String(rawStartDate).trim() : todayPersianDate;
    const installmentCount = getArchiveInstallmentCount(contract.loanType, duration, record.installmentCount);
    const calculatedEndDate = sumDatesJalali(startDate, duration);
    const endDate = calculatedEndDate || (hasUsableDate(record.endDate) ? record.endDate! : "");
    const classification = resolveArchiveClassification(classificationRules, facilityType, duration) || record.classification || "";
    const rawCounterCode = Object.entries(rawData).find(([key, value]) =>
      ["کد باجه", "کد باجه عامل"].includes(key.replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[\u200c\s]+/g, " ").trim()) &&
      value !== null && value !== undefined && String(value).trim()
    )?.[1];
    const counterCode = record.counterCode || (rawCounterCode ? String(rawCounterCode).trim() : "") ||
      record.counterLabel?.match(/^(\d+)\s*-/)?.[1] || "";
    const rawCounterName = Object.entries(rawData).find(([key, value]) =>
      ["نام باجه", "نام باجه عامل"].includes(key.replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[\u200c\s]+/g, " ").trim()) &&
      value !== null && value !== undefined && String(value).trim()
    )?.[1];
    const counterName = record.counterLabel?.match(/^\d+\s*-(.*)$/)?.[1]?.trim() ||
      (rawCounterName ? String(rawCounterName).trim() : "");
    const counterLabel = record.counterLabel || (counterCode && counterName ? `${counterCode}-${counterName}` : "");
    const archiveCode = [counterCode, classification, record.serial || ""].every(Boolean)
      ? [counterCode, classification, record.serial].join("-")
      : record.archiveCode || "";

    return {
      where: { id: record.id },
      data: {
        facilityTitle: getUploadedArchiveTitle(rawData, applicantName),
        archiveCode,
        counterCode: counterCode || null,
        counterName: counterName || null,
        counterLabel: counterLabel || null,
        classification: classification || null,
        startDate,
        endDate: endDate || null,
        duration: String(duration || "") || null,
        installmentCount: installmentCount === "—" ? null : installmentCount,
      },
    };
  });

  if (archiveFieldUpdates.length > 0) {
    await prisma.$transaction(
      archiveFieldUpdates.map(({ where, data }) =>
        prisma.bayeganiRecord.update({ where, data }),
      ),
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />

      <main className="min-h-screen px-4 pb-8 pt-20 sm:px-6 lg:mr-64 lg:px-8 lg:pt-8">
        <div className="mx-auto w-full max-w-[1600px] space-y-6">
          <section className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-l from-slate-900 to-blue-900 p-6 text-white shadow-sm sm:flex-row sm:items-center sm:p-8">
            <div>
              <p className="text-sm font-medium text-blue-200">
                مدیریت قراردادها
              </p>
              <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">
                اسناد قرارداد
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                انتخاب و مشاهده اسناد مربوط به قرارداد شماره{" "}
                <span className="font-bold text-white">
                  {contract.contractNumber || "—"}
                </span>
              </p>
            </div>

            <Link
              href="/dashboard/contracts"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-bold text-white transition hover:bg-white/20"
            >
              <span aria-hidden="true">→</span>
              بازگشت به قراردادها
            </Link>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-lg text-blue-700" aria-hidden="true">
                  ▤
                </span>
                <div>
                  <h2 className="font-bold text-slate-900">
                    اطلاعات بایگانی تسهیلات
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    رکوردهای بایگانی مرتبط با این قرارداد
                  </p>
                </div>
              </div>
            </div>

            {bayeganiRecords.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-500">
                هیچ رکورد بایگانی مرتبط با این قرارداد ثبت نشده است.
              </p>
            ) : (
              <div className="space-y-4 p-5 sm:p-6">
                {bayeganiRecords.map((record, index) => {
                  const rawData = record.rawData && typeof record.rawData === "object" && !Array.isArray(record.rawData)
                    ? record.rawData as Record<string, unknown> : {};
                  const facilityType = rawData["نوع تسهیلات"] ?? record.facilityTitle ?? rawData["عنوان تسهیلات"] ?? "";
                  const duration = [
                    record.duration,
                    rawData["مدت"],
                    rawData["مدت تسهیلات(به ماه)"],
                    rawData["مدت تسهیلات (به ماه)"],
                    rawData["مدت تسهیلات به ماه"],
                    rawData["مدت قرارداد"],
                  ].find((value) => value !== null && value !== undefined && String(value).trim() && !["0", "۰", "٠"].includes(String(value).trim())) ?? "";
                  const rawStartDate = [
                    record.startDate,
                    rawData["تاریخ شروع"],
                    rawData["تاریخ شروع قرارداد"],
                    rawData["تاریخ آغاز"],
                  ].find((value) => hasUsableDate(value));
                  const displayedArchiveStartDate = hasUsableDate(rawStartDate) ? String(rawStartDate).trim() : todayPersianDate;
                  const displayedInstallmentCount = getArchiveInstallmentCount(
                    contract.loanType,
                    duration,
                    record.installmentCount,
                  );
                  const calculatedEndDate = sumDatesJalali(displayedArchiveStartDate, duration);
                  const displayedEndDate = calculatedEndDate || (hasUsableDate(record.endDate) ? record.endDate! : "—");
                  const classification = resolveArchiveClassification(classificationRules, facilityType, duration) || record.classification || "—";
                  const rawCounterCode = Object.entries(rawData).find(([key, value]) =>
                    ["کد باجه", "کد باجه عامل"].includes(key.replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[\u200c\s]+/g, " ").trim()) &&
                    value !== null && value !== undefined && String(value).trim()
                  )?.[1];
                  const counterCode = record.counterCode || (rawCounterCode ? String(rawCounterCode).trim() : "") ||
                    record.counterLabel?.match(/^(\d+)\s*-/)?.[1] || "";
                  const generatedArchiveCode = [counterCode, classification !== "—" ? classification : "", record.serial || ""]
                    .every(Boolean)
                    ? [counterCode, classification, record.serial].join("-")
                    : "";
                  const displayedArchiveCode = generatedArchiveCode || record.archiveCode || "—";

                  return (
                    <article key={record.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
                      <div className="flex flex-col gap-2 border-b border-slate-100 bg-slate-50 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                        <h3 className="font-bold text-slate-800">
                          اطلاعات رکورد بایگانی
                        </h3>
                        <p className="break-all text-xs text-slate-500">
                          {record.sourceFile || "نام فایل ثبت نشده"}
                        </p>
                      </div>
                      <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                        <InfoItem label="شماره تسهیلات" value={record.facilityNumber} />
                        <InfoItem label="کد بایگانی" value={displayedArchiveCode} />
                        <InfoItem label="سریال" value={record.serial} />
                        <InfoItem label="عنوان تسهیلات" value={getUploadedArchiveTitle(rawData, applicantName)} />
                        <InfoItem label="کد و نام باجه" value={record.counterLabel} />
                        <InfoItem label="طبقه" value={classification} />
                        <InfoItem label="وضعیت" value={record.status} />
                        <InfoItem label="تاریخ شروع" value={displayedArchiveStartDate} />
                        <InfoItem label="تاریخ پایان" value={displayedEndDate} />
                        <InfoItem label="مدت" value={String(duration || "—")} />
                        <InfoItem label="تعداد اقساط" value={displayedInstallmentCount} />
                        <InfoItem label="مبلغ مصوب" value={record.approvedAmount} />
                        <InfoItem label="مانده" value={record.remainingAmount} />
                        <InfoItem label="ردیف فایل" value={record.sourceRow === null ? "—" : String(record.sourceRow)} />
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <h2 className="text-lg font-bold text-slate-900">انتخاب سند</h2>
              <p className="mt-1 text-sm text-slate-500">
                برای مشاهده یا چاپ، سند مورد نظر را انتخاب کنید.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-4 p-5 sm:grid-cols-2 lg:grid-cols-3 sm:p-6">
              {templateSet.templates.map((template, index) => (
                <article
                  key={template.id}
                  className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-xl text-blue-700">
                    {template.id === "request"
                      ? "▧"
                      : template.id === "contract"
                        ? "▤"
                        : "✎"}
                  </div>

                  <p className="mt-4 text-xs font-semibold text-slate-400">
                    سند {new Intl.NumberFormat("fa-IR").format(index + 1)}
                  </p>
                  <h3 className="mt-1 text-lg font-extrabold text-slate-900">
                    {template.title}
                  </h3>
                  <p className="mt-2 flex-1 text-sm leading-7 text-slate-500">
                    {template.description}
                  </p>

                  <Link
                    href={`/template/${contract.id}/${template.id}`}
                    className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700"
                  >
                    مشاهده سند
                    <span aria-hidden="true">←</span>
                  </Link>
                </article>
              ))}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
