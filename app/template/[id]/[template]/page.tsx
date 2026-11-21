import { notFound } from "next/navigation";
import { readFile } from "fs/promises";
import path from "path";

import { prisma } from "@/lib/prisma";
import { getContractTemplate } from "@/lib/templates/contract-templates";
import { getTemplateData } from "@/lib/templates/template-data";

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

function resolveArchiveClassification(
  rules: ClassificationRule[],
  facilityType: string,
  duration: string,
): string {
  const normalizedType = facilityType.trim().replace(/^\\d+\\s*-\\s*/, "");
  const months = Number(normalizeDigits(duration).replace(/[^0-9.]/g, ""));
  const typeRule = rules.find(
    (rule) => rule.facilityType?.trim().replace(/^\\d+\\s*-\\s*/, "") === normalizedType
      && normalizedType !== "",
  );
  if (typeRule) return String(typeRule.classification);

  for (const rule of rules) {
    const range = rule.duration?.trim();
    if (!range || !Number.isFinite(months)) continue;
    const match = range.match(/^(\\d+)\\s*[-–]\\s*(\\d+)$/);
    if (match && months >= Number(match[1]) && months <= Number(match[2])) {
      return String(rule.classification);
    }
    const greaterThan = range.match(/^>\\s*(\\d+)$/);
    if (greaterThan && months > Number(greaterThan[1])) {
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
        where: contract.contractCode
        ? {
            OR: [
              { facilityNumber: contract.contractCode },
              { contractCode: contract.contractCode },
            ],
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
        serialSort: true,
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
      ? latestArchiveRecord.rawData as Record<string, unknown>
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

  const borrower = contract.customerLinks[0]?.customer;
  const templateSource = {
    ...(borrower ?? {}),
    ...contract,
    ...archiveRawData,
    // Fill template placeholders from the newest BayeganiRecord for this facility.
    facilityNumber: latestArchiveRecord?.facilityNumber ?? contract.contractCode ?? "",
    "شماره تسهیلات": latestArchiveRecord?.facilityNumber ?? contract.contractCode ?? "",
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
    endDate: latestArchiveRecord?.endDate ?? "",
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
