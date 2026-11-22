import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import path from "path";

import { prisma } from "@/lib/prisma";
import { getContractTemplate } from "@/lib/templates/contract-templates";
import { getTemplateData } from "@/lib/templates/template-data";
import { sumDatesJalali } from "@/lib/date/jalali";

import TemplateToolbar from "./TemplateToolbar";

type PageProps = {
  params: Promise<{
    id: string;
    template: string;
  }>;
};

function getTemplateFolder(contractType: string): string {
  switch (contractType) {
    case "MORABAHA":
      return "morabaha";
    case "CREDIT_CARD":
      return "credit-card";
    case "DEBT_DISCOUNTING":
      return "debt-discounting";
    case "QARD_AL_HASAN":
      return "interest-free-loan";
    default:
      throw new Error(`Unsupported contract type: ${contractType}`);
  }
}

type ClassificationRule = {
  classification: number;
  facilityType: string | null;
  duration: string | null;
};

function normalizeDigits(value: unknown): string {
  return String(value ?? "")
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function normalizeClassificationText(value: unknown): string {
  return normalizeDigits(value)
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\s]+/g, " ")
    .trim()
    .replace(/^\d+\s*[-–]\s*/, "")
    .toLocaleLowerCase();
}

function resolveArchiveClassification(
  rules: ClassificationRule[],
  facilityType: string,
  duration: string,
): string {
  const normalizedType = normalizeClassificationText(facilityType);
  const monthsText = normalizeDigits(duration).replace(/[^0-9.]/g, "");
  const months = Number(monthsText);

  // Prefer an exact facility-type rule from FacilityClassification.
  const typeRule = normalizedType
    ? rules.find((rule) => normalizeClassificationText(rule.facilityType) === normalizedType)
    : undefined;
  if (typeRule) return String(typeRule.classification);

  // If no type rule matches, use the duration range configured in FacilityClassification.
  if (!monthsText || !Number.isFinite(months)) return "";
  for (const rule of rules) {
    const range = normalizeDigits(rule.duration).trim().replace(/\s/g, "");
    if (!range) continue;

    const between = range.match(/^(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)$/);
    if (between && months >= Number(between[1]) && months <= Number(between[2])) {
      return String(rule.classification);
    }

    const greaterThan = range.match(/^>\s*(\d+(?:\.\d+)?)$/);
    if (greaterThan && months > Number(greaterThan[1])) {
      return String(rule.classification);
    }

    const atLeast = range.match(/^>=\s*(\d+(?:\.\d+)?)$/);
    if (atLeast && months >= Number(atLeast[1])) {
      return String(rule.classification);
    }

    const exact = range.match(/^\d+(?:\.\d+)?$/);
    if (exact && months === Number(range)) {
      return String(rule.classification);
    }
  }
  return "";
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function replaceTemplate(html: string, data: Record<string, unknown>): string {
  return html.replace(/{{\s*([^{}]+?)\s*}}/g, (_, key: string) => {
    const value = data[key.trim()];
    if (value === null || value === undefined || typeof value === "object") {
      return "";
    }
    return escapeHtml(String(value));
  });
}

export default async function TemplatePage({ params }: PageProps) {
  const { id, template } = await params;
  const contractId = Number(id);

  if (!Number.isInteger(contractId) || contractId <= 0) {
    notFound();
  }

  // The URL ID is ContractDetails.id (the same ID used by the selection page),
  // not Customer.id. Customer information is loaded through ContractCustomer.
  const contract = await prisma.contractDetails.findUnique({
    where: { id: contractId },
    include: {
      customerLinks: {
        where: { role: "BORROWER" },
        include: { customer: true },
        take: 1,
      },
    },
  });

  if (!contract) {
    notFound();
  }

  // The contract code is the facility number used by BayeganiRecord.
  // Select the highest serial belonging to this facility only.
  const [archiveRecords, classificationRules] = await Promise.all([
    prisma.bayeganiRecord.findMany({
      where: contract.facilityNumber
        ? {
            facilityNumber: contract.facilityNumber,
          }
        : { id: -1 },
      orderBy: [
        { serialSort: { sort: "desc", nulls: "last" } },
        { createdAt: "desc" },
      ],
      select: {
        id: true,
        facilityNumber: true,
        serial: true,
        archiveCode: true,
        facilityTitle: true,
        classification: true,
        counterName: true,
        counterCode: true,
        counterLabel: true,
        status: true,
        startDate: true,
        endDate: true,
        duration: true,
        installmentCount: true,
        approvedAmount: true,
        remainingAmount: true,
        rawData: true,
      },
    }),
    prisma.facilityClassification.findMany({
      orderBy: { classification: "asc" },
      select: { classification: true, facilityType: true, duration: true },
    }),
  ]);

  const latestArchiveRecord = archiveRecords[0] ?? null;
  const archiveRawData = latestArchiveRecord?.rawData
    && typeof latestArchiveRecord.rawData === "object"
    && !Array.isArray(latestArchiveRecord.rawData)
      ? latestArchiveRecord.rawData as unknown as Record<string, unknown>
      : {};
  const archiveFacilityType = String(
    archiveRawData["نوع تسهیلات"]
      ?? latestArchiveRecord?.facilityTitle
      ?? archiveRawData["عنوان تسهیلات"]
      ?? "",
  );
  const archiveDuration = String(
    latestArchiveRecord?.duration
      ?? archiveRawData["مدت"]
      ?? archiveRawData["مدت تسهیلات(به ماه)"]
      ?? "",
  );
  const resolvedClassification = resolveArchiveClassification(
    classificationRules,
    archiveFacilityType,
    archiveDuration,
  ) || latestArchiveRecord?.classification || "";

  const templateDefinition = getContractTemplate(contract.contractType, template);
  if (!templateDefinition) {
    notFound();
  }

  const folder = getTemplateFolder(contract.contractType);
  const templatePath = path.join(
    process.cwd(),
    "templates",
    folder,
    templateDefinition.file,
  );

  let templateHtml: string;
  try {
    templateHtml = await readFile(templatePath, "utf8");
  } catch {
    throw new Error(`Template file not found: ${templatePath}`);
  }

  const borrower = contract.customerLinks[0]?.customer;
  const templateSource = {
    ...(borrower ?? {}),
    ...contract,
    ...archiveRawData,
    // Fill template placeholders from the latest BayeganiRecord for this facility.
    facilityNumber: latestArchiveRecord?.facilityNumber ?? contract.facilityNumber ?? "",
    "شماره تسهیلات": latestArchiveRecord?.facilityNumber ?? contract.facilityNumber ?? "",
    lastSerial: latestArchiveRecord?.serial ?? "",
    serial: latestArchiveRecord?.serial ?? "",
    "سریال": latestArchiveRecord?.serial ?? "",
    archiveCode: latestArchiveRecord?.archiveCode ?? "",
    "کد بایگانی": latestArchiveRecord?.archiveCode ?? "",
    facilityTitle: latestArchiveRecord?.facilityTitle ?? archiveFacilityType,
    facilityType: archiveFacilityType,
    "نوع تسهیلات": archiveFacilityType,
    duration: archiveDuration,
    "مدت": archiveDuration,
    classification: resolvedClassification,
    class: resolvedClassification,
    "طبقه": resolvedClassification,
    counterName: latestArchiveRecord?.counterName ?? "",
    counterCode: latestArchiveRecord?.counterCode ?? "",
    counterLabel: latestArchiveRecord?.counterLabel ?? "",
    status: latestArchiveRecord?.status ?? "",
    startDate: latestArchiveRecord?.startDate ?? "",
    endDate: sumDatesJalali(
      latestArchiveRecord?.startDate
        ?? archiveRawData["تاریخ شروع"]
        ?? archiveRawData["تاریخ شروع قرارداد"]
        ?? "",
      latestArchiveRecord?.duration
        ?? archiveRawData["مدت"]
        ?? archiveRawData["مدت تسهیلات(به ماه)"]
        ?? "",
    ) || latestArchiveRecord?.endDate || "",
    installmentCount: latestArchiveRecord?.installmentCount ?? "",
    approvedAmount: latestArchiveRecord?.approvedAmount ?? "",
    remainingAmount: latestArchiveRecord?.remainingAmount ?? "",
    // Customer no longer stores contract type/loan type; those belong to
    // ContractDetails. Derive the customer kind from the available company data.
    type: borrower?.companyName ? "COMPANY" : "INDIVIDUAL",
  };
  const templateData = getTemplateData(templateSource);

  const replacedHtml = replaceTemplate(templateHtml, templateData);
  const sharedStylePath = path.join(
    process.cwd(),
    "templates",
    "shared",
    "template.css",
  );
  const sharedStyles = await readFile(sharedStylePath, "utf8");
  const sharedStyleTag = `<style id="shared-template-styles">${sharedStyles}</style>`;
  const generatedHtml = /<\/head\s*>/i.test(replacedHtml)
    ? replacedHtml.replace(/<\/head\s*>/i, `${sharedStyleTag}</head>`)
    : /<html[\s>]/i.test(replacedHtml)
      ? replacedHtml.replace(/<body\b/i, `${sharedStyleTag}<body`)
      : `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">${sharedStyleTag}</head><body>${replacedHtml}</body></html>`;

  return (
    <div style={{ minHeight: "100vh", background: "#f3f4f6" }}>
      <TemplateToolbar backUrl={`/template/${contract.id}`} />
      <main style={{ padding: "20px" }}>
        <iframe
          title={templateDefinition.title}
          srcDoc={generatedHtml}
          className="template-preview-frame"
          style={{
            display: "block",
            width: "100%",
            height: "calc(100vh - 90px)",
            minHeight: "900px",
            border: "none",
            background: "white",
          }}
        />
      </main>
    </div>
  );
}
