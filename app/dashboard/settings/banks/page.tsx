"use client";

import { useEffect, useState } from "react";

type Bank = { id: number; name: string; bankId: string };

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export default function BanksPage() {
  const [banks, setBanks] = useState<Bank[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function loadBanks() {
      try {
        const response = await fetch("/api/banks", { cache: "no-store" });
        const data: { success?: boolean; banks?: Bank[]; error?: string } = await response.json();
        if (!response.ok || !data.success) throw new Error(data.error || "دریافت فهرست بانک‌ها ناموفق بود.");
        if (active) setBanks(data.banks ?? []);
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات بانک‌ها.");
      } finally {
        if (active) setLoading(false);
      }
    }
    void loadBanks();
    return () => { active = false; };
  }, []);

  const normalizedSearch = search.trim().toLocaleLowerCase("fa");
  const filteredBanks = banks.filter((bank) =>
    `${bank.name} ${bank.bankId}`.toLocaleLowerCase("fa").includes(normalizedSearch),
  );

  return (
    <main dir="rtl" className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-sm font-medium text-blue-600">مدیریت سامانه</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">فهرست بانک‌ها</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">جدول مرجع نام بانک و شناسه بانک</p>
      </header>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">اطلاعات بانک‌ها</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{loading ? "در حال دریافت اطلاعات..." : `تعداد بانک‌ها: ${banks.length.toLocaleString("fa-IR")}`}</p>
          </div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجو بر اساس نام یا شناسه بانک..." aria-label="جست‌وجو در فهرست بانک‌ها" className={inputClass + " sm:max-w-sm"} />
        </div>
        {error && <p role="alert" className="px-5 py-4 text-sm text-red-600">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="w-24 px-5 py-3 font-bold">ردیف</th>
                <th className="px-5 py-3 font-bold">نام بانک</th>
                <th className="px-5 py-3 font-bold">شناسه بانک</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? <tr><td colSpan={3} className="px-5 py-12 text-center text-slate-500">در حال بارگذاری فهرست بانک‌ها...</td></tr>
                : filteredBanks.length === 0 ? <tr><td colSpan={3} className="px-5 py-12 text-center text-slate-500">موردی پیدا نشد.</td></tr>
                : filteredBanks.map((bank, index) => (
                  <tr key={bank.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-5 py-3.5 text-slate-500">{(index + 1).toLocaleString("fa-IR")}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-100">{bank.name}</td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-200">{bank.bankId}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
