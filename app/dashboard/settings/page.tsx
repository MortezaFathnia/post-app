"use client";

import { useEffect, useMemo, useState } from "react";

type Counter = { code: string; name: string };

export default function SettingsPage() {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadCounters() {
      try {
        setLoading(true);
        setError("");
        const response = await fetch("/api/bayegani/counters", {
          signal: controller.signal,
          cache: "no-store",
        });
        const data: { success?: boolean; counters?: Counter[]; error?: string } =
          await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || "دریافت فهرست باجه‌ها ناموفق بود.");
        }

        setCounters(data.counters ?? []);
      } catch (err) {
        if (err instanceof Error && err.name !== "AbortError") {
          setError(err.message || "خطا در دریافت اطلاعات.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    void loadCounters();
    return () => controller.abort();
  }, []);

  const filteredCounters = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fa");
    if (!term) return counters;
    return counters.filter(({ code, name }) =>
      `${code} ${name}`.toLocaleLowerCase("fa").includes(term),
    );
  }, [counters, search]);

  return (
    <main dir="rtl" className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <p className="text-sm font-medium text-blue-600">مدیریت سامانه</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">
          تنظیمات
        </h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
          مشاهده فهرست باجه‌ها و کدهای ثبت‌شده در سامانه.
        </p>
      </div>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              فهرست باجه‌ها
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {loading ? "در حال دریافت اطلاعات..." : `تعداد باجه‌ها: ${counters.length.toLocaleString("fa-IR")}`}
            </p>
          </div>
          <label className="w-full sm:max-w-xs">
            <span className="sr-only">جست‌وجو در فهرست باجه‌ها</span>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="جست‌وجو بر اساس کد یا نام باجه..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
            />
          </label>
        </div>

        {error && (
          <div role="alert" className="m-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th scope="col" className="w-20 px-5 py-3 font-bold">ردیف</th>
                <th scope="col" className="px-5 py-3 font-bold">کد باجه</th>
                <th scope="col" className="px-5 py-3 font-bold">نام باجه</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={3} className="px-5 py-12 text-center text-slate-500">
                    <span className="inline-flex items-center gap-3">
                      <span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                      در حال بارگذاری فهرست باجه‌ها...
                    </span>
                  </td>
                </tr>
              ) : !error && filteredCounters.length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-5 py-12 text-center text-slate-500 dark:text-slate-400">
                    {search ? "موردی مطابق جست‌وجو پیدا نشد." : "هنوز باجه‌ای ثبت نشده است."}
                  </td>
                </tr>
              ) : (
                filteredCounters.map((counter, index) => (
                  <tr key={`${counter.code}-${counter.name}`} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{(index + 1).toLocaleString("fa-IR")}</td>
                    <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-100">{counter.code}</td>
                    <td className="px-5 py-3.5 text-slate-700 dark:text-slate-200">{counter.name}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {!loading && !error && search && (
          <div className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {filteredCounters.length.toLocaleString("fa-IR")} نتیجه از {counters.length.toLocaleString("fa-IR")} باجه
          </div>
        )}
      </section>
    </main>
  );
}
