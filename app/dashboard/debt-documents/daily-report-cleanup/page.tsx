"use client";

import { ChangeEvent, FormEvent, useState } from "react";

type OutputResult = {
  mode: string;
  label: string;
  rows: number;
  fileName: string;
  url: string;
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

async function requestOutput(file: File, mode: (typeof outputModes)[number]["mode"]): Promise<OutputResult> {
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

  return {
    mode,
    label: outputModes.find((item) => item.mode === mode)?.label || mode,
    rows: Number(response.headers.get(mode === "clean" ? "X-Remaining-Rows" : "X-Matched-Rows") || 0),
    fileName,
    url,
  };
}

export default function DailyReportCleanupPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<OutputResult[]>([]);

  function clearResults() {
    results.forEach((result) => URL.revokeObjectURL(result.url));
    setResults([]);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    clearResults();
    setFile(event.target.files?.[0] ?? null);
    setError("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearResults();
    setError("");

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
          فایل گزارش روزانه را بارگذاری کنید تا سه خروجی جداگانه دریافت کنید: ردیف‌هایی که مقدار «کد مرجع» آن‌ها دقیقاً «کارمزد» است، ردیف‌هایی که مقدار آن دقیقاً «تمبر» است، و فایل پاکسازی‌شده بر اساس مبالغ متناظر ستون‌های «واریز» و «برداشت».
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
            {loading ? "در حال تحلیل و ساخت فایل‌ها..." : "تحلیل و ساخت هر سه فایل خروجی"}
          </button>
        </form>
      </section>

      {results.length > 0 && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <h2 className="font-bold text-emerald-900">فایل‌های خروجی آماده دانلود هستند</h2>
          <p className="mt-1 text-sm text-emerald-800">
            برای دریافت هر فایل، لینک مربوط به آن را جداگانه انتخاب کنید.
          </p>
          <div className="mt-4 space-y-2">
            {results.map((result) => (
              <div key={result.mode} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800">{result.label}</p>
                  <p className="mt-1 text-xs text-slate-500">{result.rows.toLocaleString("fa-IR")} ردیف</p>
                </div>
                <a
                  href={result.url}
                  download={result.fileName}
                  className="rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                >
                  دانلود فایل
                </a>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
