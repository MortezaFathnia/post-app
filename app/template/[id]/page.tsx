import Link from "next/link";
import { notFound } from "next/navigation";
import Sidebar from "@/components/Sidebar";
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
      return "نامشخص";
  }
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
      bayeganiRecords: {
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          facilityNumber: true,
          customerNumber: true,
          archiveCode: true,
          facilityTitle: true,
          serial: true,
          classification: true,
          counterLabel: true,
          status: true,
          startDate: true,
          endDate: true,
          duration: true,
          installmentCount: true,
          approvedAmount: true,
          remainingAmount: true,
        },
      },
    },
  });

  if (!contract) {
    notFound();
  }

  const templateSet = getContractTemplateSet(contract.contractType);

  if (!templateSet) {
    notFound();
  }

  const applicantName = getApplicantName(
    contract.customerLinks[0]?.customer ?? null,
  );

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
                    اطلاعات قرارداد
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    مشخصات قرارداد و متقاضی
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:p-6">
              <InfoItem label="شماره قرارداد" value={contract.contractNumber} />
              <InfoItem label="کد قرارداد" value={contract.contractCode} />
              <InfoItem label="متقاضی" value={applicantName} />
              <InfoItem
                label="نوع قرارداد"
                value={getContractTypeTitle(contract.contractType)}
              />
              <InfoItem
                label="نوع تسهیلات"
                value={getLoanTypeTitle(contract.loanType)}
              />
              <InfoItem label="تاریخ قرارداد" value={contract.contractDate} />
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-5 sm:px-6">
              <h2 className="text-lg font-bold text-slate-900">اطلاعات بایگانی تسهیلات</h2>
              <p className="mt-1 text-sm text-slate-500">
                رکوردهای بایگانی مرتبط با این قرارداد
              </p>
            </div>

            {contract.bayeganiRecords.length === 0 ? (
              <p className="px-6 py-8 text-center text-sm text-slate-500">
                هیچ رکورد بایگانی مرتبط با این قرارداد ثبت نشده است.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1100px] text-right text-sm">
                  <thead className="bg-slate-50 text-xs font-bold text-slate-500">
                    <tr>
                      <th className="whitespace-nowrap px-4 py-3">شماره تسهیلات</th>
                      <th className="whitespace-nowrap px-4 py-3">کد بایگانی</th>
                      <th className="whitespace-nowrap px-4 py-3">سریال</th>
                      <th className="whitespace-nowrap px-4 py-3">عنوان تسهیلات</th>
                      <th className="whitespace-nowrap px-4 py-3">کد و نام باجه</th>
                      <th className="whitespace-nowrap px-4 py-3">طبقه</th>
                      <th className="whitespace-nowrap px-4 py-3">وضعیت</th>
                      <th className="whitespace-nowrap px-4 py-3">تاریخ شروع</th>
                      <th className="whitespace-nowrap px-4 py-3">تاریخ پایان</th>
                      <th className="whitespace-nowrap px-4 py-3">مدت</th>
                      <th className="whitespace-nowrap px-4 py-3">تعداد اقساط</th>
                      <th className="whitespace-nowrap px-4 py-3">مبلغ مصوب</th>
                      <th className="whitespace-nowrap px-4 py-3">مانده</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {contract.bayeganiRecords.map((record) => (
                      <tr key={record.id} className="text-slate-700">
                        <td className="whitespace-nowrap px-4 py-3 font-semibold">{record.facilityNumber || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{record.archiveCode || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3 font-semibold">{record.serial || "—"}</td>
                        <td className="px-4 py-3">{record.facilityTitle || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{record.counterLabel || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{record.classification || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{record.status || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{record.startDate || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{record.endDate || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{record.duration || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{record.installmentCount || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{record.approvedAmount || "—"}</td>
                        <td className="whitespace-nowrap px-4 py-3">{record.remainingAmount || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
