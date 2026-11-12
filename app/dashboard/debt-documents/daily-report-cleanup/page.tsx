"use client";

import { ChangeEvent, FormEvent, useState } from "react";

type OutputResult = {
  label: string;
  rows: number;
  fileName: string;
};

const outputModes = [
  { mode: "fee", label: "فایل کارمزد" },
  { mode: "stamp", label: "فایل تمبر" },
  { mode: "clean", label: "فایل پاکسازی واریز و برداشت" },
] as const;

function getDownloadName(disposition: string, fallback: string) {
  const encodedName = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  return encodedName ? decodeURIComponent(encodedName) : fallback;
}

async function requestOutput(file: File, mode: (typeof outputModes)[number]["mode"]) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("mode", mode);

  const response = await fetch("/api/debt-documents/daily-report-cleanup", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null);
    throw new Error(result?.error || "ساخت یکی از فایل‌های خروجی ناموفق بود.");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const fallback = mode === "fee" ? "کارمزد.xlsx" : mode === "stamp" ? "تمبر.xlsx" : "پاکسازی-واریز-برداشت.xlsx";
  const fileName = getDownloadName(response.headers.get("Content-Disposition") || "", fallback);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);

  return {
    label: outputModes.find((item) => item.mode === mode)?.label || mode,
    rows: Number(response.headers.get(mode === "clean" ? "X-Remaining-Rows" : "X-Matched-Rows") || 0),
    fileName,
  } satisfies OutputResult;
}

export default function DailyReportCleanupPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<OutputResult[]>([]);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setError("");
    setResults([]);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setResults([]);

    if (!file) {
      setError("ابتدا فایل گزارش روزانه را انتخاب کنید.");
      return;
    }

    setLoading(true);
    const completed: OutputResult[] = [];
    try {
      for (const item of outputModes) {
        const result = await requestOutput(file, item.mode);
        completed.push(result);
        setResults([...completed]);
      }
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "خطا در پردازش فایل Excel.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">پاکسازی گزارش روزانه</h1>
        <p className="mt-2 text-sm leading-7 text-slate-500">
          فایل گزارش روزانه را بارگذاری کنید تا سه خروجی جداگانه دریافت کنید: ردیف‌هایی که مقدار «شناسه مرجع» آن‌ها دقیقاً «کارمزد» است، ردیف‌هایی که مقدار آن دقیقاً «تمبر» است، و فایل پاکسازی‌شده بر اساس مبالغ متناظر ستون‌های «واریز» و «برداشت».
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
          {error && (
            <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={!file || loading}
            className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "در حال تحلیل و ساخت فایل‌ها..." : "تحلیل و دریافت هر سه فایل خروجی"}
          </button>
        </form>
      </section>

      {results.length > 0 && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-bold text-emerald-900">فایل‌های خروجی آماده شدند</h2>
          <p className="mt-1 text-sm text-emerald-800">
            هر فایل پس از آماده‌شدن به‌صورت جداگانه دانلود می‌شود.
          </p>
          <div className="mt-4 space-y-2">
            {results.map((result) => (
              <div key={result.fileName} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white p-3">
                <span className="text-sm font-semibold text-slate-800">{result.label}</span>
                <span className="text-sm text-slate-600">
                  {result.rows.toLocaleString("fa-IR")} ردیف
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
