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
