import Link from "next/link";
import { prisma } from "@/lib/prisma";

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

export default async function ContractsPage() {
  const contracts = await prisma.customer.findMany({
    orderBy: {
      createdAt: "desc",
    },
    select: {
      id: true,
      type: true,
      name: true,
      companyName: true,

      contractType: true,
      loanType: true,

      contractCode: true,
      contractNumber: true,
      contractDate: true,

      createdAt: true,
    },
  });

  const totalContracts = contracts.length;

  const morabahaCount = contracts.filter(
    (contract) =>
      contract.contractType === "MORABAHA",
  ).length;

  const creditCardCount = contracts.filter(
    (contract) =>
      contract.contractType === "CREDIT_CARD",
  ).length;

  const maturityCount = contracts.filter(
    (contract) =>
      contract.loanType === "MATURITY",
  ).length;

  const installmentCount = contracts.filter(
    (contract) =>
      contract.loanType === "INSTALLMENT",
  ).length;

  return (
    <div
      dir="rtl"
      className="min-h-screen"
    >
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            قراردادها
          </h1>

          <p className="mt-1 text-sm text-gray-500">
            مشاهده و مدیریت قراردادهای ثبت‌شده
          </p>
        </div>

        <Link
          href="/dashboard/upload"
          className="rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
        >
          + ثبت قرارداد جدید
        </Link>
      </div>

      {/* Statistics */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            کل قراردادها
          </p>

          <p className="mt-2 text-3xl font-bold text-gray-900">
            {totalContracts}
          </p>
        </div>

        {/* Morabaha */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            مرابحه
          </p>

          <p className="mt-2 text-3xl font-bold text-blue-600">
            {morabahaCount}
          </p>
        </div>

        {/* Credit card */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            مرابحه کارت اعتباری
          </p>

          <p className="mt-2 text-3xl font-bold text-purple-600">
            {creditCardCount}
          </p>
        </div>

        {/* Maturity */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            سررسیدی
          </p>

          <p className="mt-2 text-3xl font-bold text-green-600">
            {maturityCount}
          </p>
        </div>

        {/* Installment */}
        <div className="rounded-xl border bg-white p-5 shadow-sm">
          <p className="text-sm text-gray-500">
            اقساط
          </p>

          <p className="mt-2 text-3xl font-bold text-orange-600">
            {installmentCount}
          </p>
        </div>
      </div>

      {/* Contracts table */}
      <div className="overflow-hidden rounded-xl border bg-white shadow-sm">
        <div className="border-b px-5 py-4">
          <h2 className="font-semibold text-gray-900">
            لیست قراردادها
          </h2>

          <p className="mt-1 text-xs text-gray-500">
            تعداد: {totalContracts} قرارداد
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="border-b bg-gray-50">
              <tr>
                <th className="px-5 py-4 text-right font-semibold text-gray-700">
                  #
                </th>

                <th className="px-5 py-4 text-right font-semibold text-gray-700">
                  شماره قرارداد
                </th>

                <th className="px-5 py-4 text-right font-semibold text-gray-700">
                  کد قرارداد
                </th>

                <th className="px-5 py-4 text-right font-semibold text-gray-700">
                  متقاضی
                </th>

                <th className="px-5 py-4 text-right font-semibold text-gray-700">
                  نوع قرارداد
                </th>

                <th className="px-5 py-4 text-right font-semibold text-gray-700">
                  نوع تسهیلات
                </th>

                <th className="px-5 py-4 text-right font-semibold text-gray-700">
                  تاریخ قرارداد
                </th>

                <th className="px-5 py-4 text-right font-semibold text-gray-700">
                  عملیات
                </th>
              </tr>
            </thead>

            <tbody className="divide-y">
              {contracts.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-16 text-center"
                  >
                    <div className="flex flex-col items-center">
                      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100 text-2xl">
                        📄
                      </div>

                      <h3 className="font-semibold text-gray-900">
                        قراردادی وجود ندارد
                      </h3>

                      <p className="mt-1 text-sm text-gray-500">
                        برای شروع، یک فایل Excel آپلود کنید.
                      </p>

                      <Link
                        href="/dashboard/upload"
                        className="mt-5 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700"
                      >
                        ثبت قرارداد
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                contracts.map((contract, index) => (
                  <tr
                    key={contract.id}
                    className="transition hover:bg-gray-50"
                  >
                    {/* Row */}
                    <td className="px-5 py-4 text-gray-400">
                      {index + 1}
                    </td>

                    {/* Contract number */}
                    <td className="whitespace-nowrap px-5 py-4 font-medium text-gray-900">
                      {contract.contractNumber || "-"}
                    </td>

                    {/* Contract code */}
                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {contract.contractCode || "-"}
                    </td>

                    {/* Applicant */}
                    <td className="px-5 py-4 font-medium text-gray-700">
                      {getApplicantName(contract)}
                    </td>

                    {/* Contract type */}
                    <td className="px-5 py-4">
                      <span
                        className={
                          contract.contractType ===
                          "MORABAHA"
                            ? "rounded-full bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700"
                            : "rounded-full bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700"
                        }
                      >
                        {getContractTypeTitle(
                          contract.contractType,
                        )}
                      </span>
                    </td>

                    {/* Loan type */}
                    <td className="px-5 py-4">
                      {contract.loanType ? (
                        <span
                          className={
                            contract.loanType ===
                            "MATURITY"
                              ? "rounded-full bg-green-50 px-3 py-1 text-xs font-medium text-green-700"
                              : "rounded-full bg-orange-50 px-3 py-1 text-xs font-medium text-orange-700"
                          }
                        >
                          {getLoanTypeTitle(
                            contract.loanType,
                          )}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>

                    {/* Date */}
                    <td className="whitespace-nowrap px-5 py-4 text-gray-600">
                      {contract.contractDate || "-"}
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/template/${contract.id}`}
                          className="rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 transition hover:bg-gray-100"
                        >
                          مشاهده
                        </Link>

                        <Link
                          href={`/template/${contract.id}/contract`}
                          className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-medium text-white transition hover:bg-blue-700"
                        >
                          قرارداد
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}