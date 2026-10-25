import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getContractTemplateSet } from "@/lib/templates/contract-templates";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function getContractTypeTitle(contractType: string) {
  switch (contractType) {
    case "MORABAHA":
      return "مرابحه";

    case "CREDIT_CARD":
      return "مرابحه کارت اعتباری";

    default:
      return "-";
  }
}

function getLoanTypeTitle(loanType: string | null) {
  switch (loanType) {
    case "MATURITY":
      return "سررسیدی";

    case "INSTALLMENT":
      return "اقساط";

    default:
      return "-";
  }
}

function getApplicantName(customer: {
  type: string;
  name: string | null;
  companyName: string | null;
}) {
  if (customer.type === "COMPANY") {
    return customer.companyName || "-";
  }

  return customer.name || "-";
}

export default async function TemplateSelectionPage({
  params,
}: PageProps) {
  const { id } = await params;

  const customerId = Number(id);

  if (!Number.isInteger(customerId)) {
    notFound();
  }

  const customer = await prisma.customer.findUnique({
    where: {
      id: customerId,
    },
  });

  if (!customer) {
    notFound();
  }

  const templateSet = getContractTemplateSet(
    customer.contractType,
  );

  if (!templateSet) {
    notFound();
  }

  const contractTypeTitle = getContractTypeTitle(
    customer.contractType,
  );

  const loanTypeTitle = getLoanTypeTitle(
    customer.loanType,
  );

  const applicantName = getApplicantName(customer);

  return (
    <div
      dir="rtl"
      className="min-h-screen bg-gray-100 p-6"
    >
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              اسناد قرارداد
            </h1>

            <p className="mt-2 text-sm text-gray-500">
              قرارداد شماره{" "}
              <span className="font-semibold text-gray-700">
                {customer.contractNumber || "-"}
              </span>
            </p>
          </div>

          <Link
            href="/dashboard/contracts"
            className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            بازگشت به قراردادها
          </Link>
        </div>

        {/* Contract information */}
        <div className="mb-6 rounded-xl border bg-white p-6 shadow-sm">
          <h2 className="mb-5 text-lg font-semibold text-gray-900">
            اطلاعات قرارداد
          </h2>

          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <p className="text-xs text-gray-500">
                شماره قرارداد
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {customer.contractNumber || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                کد قرارداد
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {customer.contractCode || "-"}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                متقاضی
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {applicantName}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                نوع قرارداد
              </p>

              <p className="mt-1 font-medium text-blue-700">
                {contractTypeTitle}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                نوع تسهیلات
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {loanTypeTitle}
              </p>
            </div>

            <div>
              <p className="text-xs text-gray-500">
                تاریخ قرارداد
              </p>

              <p className="mt-1 font-medium text-gray-900">
                {customer.contractDate || "-"}
              </p>
            </div>
          </div>
        </div>

        {/* Documents */}
        <div className="rounded-xl border bg-white p-6 shadow-sm">
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              اسناد
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              سند مورد نظر را انتخاب کنید.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {templateSet.templates.map((template) => (
              <div
                key={template.id}
                className="rounded-xl border border-gray-200 p-5 transition hover:border-blue-300 hover:shadow-md"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-50 text-xl">
                  {template.id === "request"
                    ? "📝"
                    : template.id === "contract"
                      ? "📄"
                      : "✍️"}
                </div>

                <h3 className="text-lg font-semibold text-gray-900">
                  {template.title}
                </h3>

                <p className="mt-2 min-h-10 text-sm leading-6 text-gray-500">
                  {template.description}
                </p>

                <Link
                  href={`/template/${customer.id}/${template.id}`}
                  className="mt-5 block rounded-lg bg-blue-600 px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700"
                >
                  مشاهده {template.title}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}