import Link from "next/link";
import { prisma } from "@/lib/prisma";

function getContractTypeTitle(contractType: string) {
  switch (contractType) {
    case "MORABAHA": return "مرابحه";
    case "CREDIT_CARD": return "مرابحه کارت اعتباری";
    case "DEBT_DISCOUNTING": return "خرید دین";
    default: return "نامشخص";
  }
}

function getLoanTypeTitle(loanType: string | null) {
  switch (loanType) {
    case "MATURITY": return "سررسیدی";
    case "INSTALLMENT": return "اقساط";
    default: return "—";
  }
}

function getApplicantName(customer: { type: string; name: string | null; companyName: string | null }) {
  return customer.type === "COMPANY" ? customer.companyName || "—" : customer.name || "—";
}

function formatCount(value: number) {
  return new Intl.NumberFormat("fa-IR").format(value);
}

export default async function DashboardPage() {
  const [totalContracts, morabahaContracts, creditCardContracts, debtDiscountingContracts, maturityContracts, installmentContracts, recentContracts] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({ where: { contractType: "MORABAHA" } }),
    prisma.customer.count({ where: { contractType: "CREDIT_CARD" } }),
    prisma.customer.count({ where: { contractType: "DEBT_DISCOUNTING" } }),
    prisma.customer.count({ where: { loanType: "MATURITY" } }),
    prisma.customer.count({ where: { loanType: "INSTALLMENT" } }),
    prisma.customer.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: {
        id: true,
        type: true,
        name: true,
        companyName: true,
        contractType: true,
        loanType: true,
        contractNumber: true,
        contractDate: true,
      },
    }),
  ]);

  const stats = [
    { title: "کل قراردادها", value: totalContracts, icon: "▤", tone: "blue" },
    { title: "قرارداد مرابحه", value: morabahaContracts, icon: "◈", tone: "indigo" },
    { title: "مرابحه کارت اعتباری", value: creditCardContracts, icon: "▣", tone: "violet" },
    { title: "قرارداد خرید دین", value: debtDiscountingContracts, icon: "⇄", tone: "cyan" },
    { title: "تسهیلات سررسیدی", value: maturityContracts, icon: "◷", tone: "emerald" },
    { title: "تسهیلات اقساط", value: installmentContracts, icon: "≋", tone: "amber" },
  ];

  const iconTone: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700",
    indigo: "bg-indigo-50 text-indigo-700",
    violet: "bg-violet-50 text-violet-700",
    cyan: "bg-cyan-50 text-cyan-700",
    emerald: "bg-emerald-50 text-emerald-700",
    amber: "bg-amber-50 text-amber-700",
  };

  return (
    <div className="space-y-8" dir="rtl">
      <section className="flex flex-col justify-between gap-4 rounded-2xl bg-gradient-to-l from-slate-900 to-blue-900 p-6 text-white shadow-sm sm:flex-row sm:items-center sm:p-8">
        <div>
          <p className="text-sm font-medium text-blue-200">پنل مدیریت</p>
          <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">داشبورد قراردادها</h1>
          <p className="mt-2 text-sm leading-6 text-slate-300">نمای کلی قراردادها، تسهیلات و آخرین ثبت‌های سامانه</p>
        </div>
        <Link href="/dashboard/upload" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-bold text-blue-800 transition hover:bg-blue-50">
          <span className="text-lg" aria-hidden="true">＋</span> ثبت قرارداد جدید
        </Link>
      </section>

      <section aria-label="آمار قراردادها" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.title}</p>
                <p className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{formatCount(stat.value)}</p>
              </div>
              <span className={`flex h-12 w-12 items-center justify-center rounded-2xl text-xl ${iconTone[stat.tone]}`} aria-hidden="true">{stat.icon}</span>
            </div>
          </div>
        ))}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">آخرین قراردادها</h2>
            <p className="mt-1 text-sm text-slate-500">آخرین ۸ قرارداد ثبت‌شده در سامانه</p>
          </div>
          <Link href="/dashboard/contracts" className="text-sm font-bold text-blue-700 hover:text-blue-800">مشاهده همه قراردادها ←</Link>
        </div>

        {recentContracts.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl" aria-hidden="true">▤</div>
            <h3 className="mt-4 font-bold text-slate-900">هنوز قراردادی ثبت نشده است</h3>
            <p className="mt-2 text-sm text-slate-500">برای شروع، فایل Excel قرارداد را بارگذاری کنید.</p>
            <Link href="/dashboard/upload" className="mt-5 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-blue-700">ثبت اولین قرارداد</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-4 text-right font-semibold">شماره قرارداد</th>
                  <th className="px-5 py-4 text-right font-semibold">نام مدیون / شرکت</th>
                  <th className="px-5 py-4 text-right font-semibold">نوع قرارداد</th>
                  <th className="px-5 py-4 text-right font-semibold">نوع تسهیلات</th>
                  <th className="px-5 py-4 text-right font-semibold">تاریخ قرارداد</th>
                  <th className="px-5 py-4 text-right font-semibold">عملیات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentContracts.map((contract) => (
                  <tr key={contract.id} className="transition hover:bg-slate-50/80">
                    <td className="whitespace-nowrap px-5 py-4 font-bold text-slate-800">{contract.contractNumber || "—"}</td>
                    <td className="px-5 py-4 text-slate-700">{getApplicantName(contract)}</td>
                    <td className="px-5 py-4"><span className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">{getContractTypeTitle(contract.contractType)}</span></td>
                    <td className="px-5 py-4 text-slate-600">{getLoanTypeTitle(contract.loanType)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-600">{contract.contractDate || "—"}</td>
                    <td className="px-5 py-4"><Link href={`/template/${contract.id}`} className="inline-flex rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700">مشاهده</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-4 text-lg font-bold text-slate-900">دسترسی سریع</h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Link href="/dashboard/contracts" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl text-blue-700" aria-hidden="true">▤</span>
            <h3 className="mt-4 font-bold text-slate-900">مدیریت قراردادها</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">مشاهده فهرست و جزئیات قراردادهای ثبت‌شده</p>
            <span className="mt-4 block text-sm font-bold text-blue-700">ورود به بخش قراردادها ←</span>
          </Link>
          <Link href="/dashboard/upload" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-xl text-emerald-700" aria-hidden="true">＋</span>
            <h3 className="mt-4 font-bold text-slate-900">ثبت قرارداد</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">بارگذاری Excel و ایجاد قرارداد از ردیف انتخاب‌شده</p>
            <span className="mt-4 block text-sm font-bold text-blue-700">شروع ثبت ←</span>
          </Link>
          <Link href="/dashboard/debt-documents/upload" className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200 hover:shadow-md">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-xl text-violet-700" aria-hidden="true">⇧</span>
            <h3 className="mt-4 font-bold text-slate-900">اسناد خرید دین</h3>
            <p className="mt-2 text-sm leading-6 text-slate-500">بارگذاری و ثبت اطلاعات اسناد مربوط به خرید دین</p>
            <span className="mt-4 block text-sm font-bold text-blue-700">بارگذاری اسناد ←</span>
          </Link>
        </div>
      </section>
    </div>
  );
}
