"use client";

import { ChangeEvent, FormEvent, useState } from "react";

type CleanupSummary = {
  originalRows: number;
  removedRows: number;
  removedPairs: number;
  remainingRows: number;
  sheetName: string;
};

export default function DailyReportCleanupPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [summary, setSummary] = useState<CleanupSummary | null>(null);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setError("");
    setSummary(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSummary(null);

    if (!file) {
      setError("ابتدا فایل گزارش روزانه را انتخاب کنید.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/debt-documents/daily-report-cleanup", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "پاکسازی فایل ناموفق بود.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const disposition = response.headers.get("Content-Disposition") || "";
      const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
      const fileName = encodedName ? decodeURIComponent(encodedName) : "گزارش-روزانه-پاکسازی.xlsx";
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);

      setSummary({
        originalRows: Number(response.headers.get("X-Original-Rows") || 0),
        removedRows: Number(response.headers.get("X-Removed-Rows") || 0),
        removedPairs: Number(response.headers.get("X-Removed-Pairs") || 0),
        remainingRows: Number(response.headers.get("X-Remaining-Rows") || 0),
        sheetName: decodeURIComponent(response.headers.get("X-Cleanup-Sheet") || ""),
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "خطا در پاکسازی فایل.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">پاکسازی گزارش روزانه</h1>
        <p className="mt-2 text-sm text-slate-500">
          فایل گزارش روزانه را بارگذاری کنید تا مبالغ یکسان در ستون‌های «واریز» و «برداشت» به‌صورت جفت شناسایی و ردیف‌های متناظر حذف شوند.
        </p>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <label htmlFor="dailyReportFile" className="block text-sm font-semibold text-slate-700">
            فایل گزارش روزانه (Excel)
          </label>
          <input
            id="dailyReportFile"
            type="file"
            accept=".xls,.xlsx"
            onChange={handleFileChange}
            className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm text-slate-700 file:ml-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:font-semibold file:text-blue-700"
          />
          {file && <p className="text-xs text-slate-500">فایل انتخاب‌شده: {file.name}</p>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button
            type="submit"
            disabled={!file || loading}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "در حال تحلیل و پاکسازی..." : "تحلیل، پاکسازی و دریافت فایل خروجی"}
          </button>
        </form>
      </section>

      {summary && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-bold text-emerald-900">پاکسازی با موفقیت انجام شد</h2>
          <p className="mt-1 text-sm text-emerald-800">فایل خروجی اکسل دانلود شد. نام برگه پردازش‌شده: {summary.sheetName}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">ردیف‌های اولیه</p><p className="mt-1 text-xl font-bold text-slate-900">{summary.originalRows.toLocaleString("fa-IR")}</p></div>
            <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">جفت مبالغ تطبیق‌یافته</p><p className="mt-1 text-xl font-bold text-slate-900">{summary.removedPairs.toLocaleString("fa-IR")}</p></div>
            <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">ردیف‌های حذف‌شده</p><p className="mt-1 text-xl font-bold text-slate-900">{summary.removedRows.toLocaleString("fa-IR")}</p></div>
            <div className="rounded-xl bg-white p-3"><p className="text-xs text-slate-500">ردیف‌های باقی‌مانده</p><p className="mt-1 text-xl font-bold text-slate-900">{summary.remainingRows.toLocaleString("fa-IR")}</p></div>
          </div>
        </section>
      )}
    </div>
  );
}
