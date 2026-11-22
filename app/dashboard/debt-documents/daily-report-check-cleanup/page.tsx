"use client";

import { FormEvent, useState } from "react";

function downloadName(disposition: string) {
  const match = disposition.match(/filename\*=UTF-8''([^;]+)/i);
  return match ? decodeURIComponent(match[1]) : "گزارش-روزانه-پاکسازی-شده.xlsx";
}

export default function DailyReportCheckCleanupPage() {
  const [reportFile, setReportFile] = useState<File | null>(null);
  const [checksFile, setChecksFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ url: string; name: string; original: number; matched: number; remaining: number } | null>(null);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (result) URL.revokeObjectURL(result.url);
    setResult(null);
    if (!reportFile || !checksFile) {
      setError("هر دو فایل گزارش روزانه و خروجی اکسل بایگانی اسناد خرید دین را انتخاب کنید.");
      return;
    }

    setLoading(true);
    try {
      const form = new FormData();
      form.append("reportFile", reportFile);
      form.append("checksFile", checksFile);
      const response = await fetch("/api/debt-documents/daily-report-check-cleanup", { method: "POST", body: form });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error || "پردازش فایل‌ها ناموفق بود.");
      }
      const blob = await response.blob();
      setResult({
        url: URL.createObjectURL(blob),
        name: downloadName(response.headers.get("Content-Disposition") || ""),
        original: Number(response.headers.get("X-Original-Rows") || 0),
        matched: Number(response.headers.get("X-Matched-Rows") || 0),
        remaining: Number(response.headers.get("X-Remaining-Rows") || 0),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "خطا در پردازش فایل‌ها.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">پاکسازی چک های گزارش روزانه</h1>
        <p className="mt-2 max-w-4xl text-sm leading-7 text-slate-500">
          گزارش روزانه و خروجی اکسل بایگانی اسناد خرید دین را که در صفحه بایگانی با انتخاب بازه تاریخ تهیه کرده‌اید بارگذاری کنید. ردیف‌هایی از گزارش روزانه که شماره سریال و مبلغ آن‌ها با اطلاعات چک‌ها مطابقت داشته باشد حذف می‌شوند.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label htmlFor="daily-check-report" className="block text-sm font-semibold text-slate-700">۱. فایل گزارش روزانه (xls یا xlsx)</label>
            <input id="daily-check-report" type="file" accept=".xls,.xlsx" onChange={(event) => setReportFile(event.target.files?.[0] ?? null)} className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm file:ml-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700" />
            {reportFile && <p className="text-xs text-slate-500">{reportFile.name}</p>}
          </div>
          <div className="space-y-2">
            <label htmlFor="daily-check-archive" className="block text-sm font-semibold text-slate-700">۲. فایل خروجی اکسل بایگانی اسناد خرید دین (با فیلتر دو تاریخ)</label>
            <input id="daily-check-archive" type="file" accept=".xls,.xlsx" onChange={(event) => setChecksFile(event.target.files?.[0] ?? null)} className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm file:ml-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700" />
            {checksFile && <p className="text-xs text-slate-500">{checksFile.name}</p>}
            <p className="text-xs leading-6 text-slate-500">ابتدا در صفحه «بایگانی اسناد خرید دین» دو تاریخ را انتخاب و فایل «خروجی اکسل بازه انتخابی» را دریافت کنید.</p>
          </div>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={!reportFile || !checksFile || loading} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {loading ? "در حال تطبیق سریال و مبالغ..." : "تطبیق چک‌ها و ساخت فایل پاکسازی‌شده"}
          </button>
        </form>
      </section>

      {result && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-bold text-emerald-900">فایل پاکسازی‌شده آماده است</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">تعداد ردیف اولیه</p><p className="mt-1 text-lg font-bold text-slate-900">{result.original.toLocaleString("fa-IR")}</p></div>
            <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">ردیف‌های منطبق و حذف‌شده</p><p className="mt-1 text-lg font-bold text-slate-900">{result.matched.toLocaleString("fa-IR")}</p></div>
            <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">ردیف‌های باقی‌مانده</p><p className="mt-1 text-lg font-bold text-slate-900">{result.remaining.toLocaleString("fa-IR")}</p></div>
          </div>
          <a href={result.url} download={result.name} className="mt-4 inline-flex rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700">دانلود گزارش روزانه پاکسازی‌شده</a>
        </section>
      )}
    </div>
  );
}
