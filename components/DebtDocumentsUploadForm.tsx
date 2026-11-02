"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import UploadLoadingOverlay from "@/components/UploadLoadingOverlay";

type CounterOption = { id: number; code: string; name: string };
type ApiResult = { success: boolean; error?: string; count?: number; textContent?: string; textFileName?: string };

type Props = { onUploaded?: () => void };

export default function DebtDocumentsUploadForm({ onUploaded }: Props) {
  const [counterLabel, setCounterLabel] = useState("");
  const [counters, setCounters] = useState<CounterOption[]>([]);
  const [counterOpen, setCounterOpen] = useState(false);
  const [counterLoading, setCounterLoading] = useState(false);
  const [counterError, setCounterError] = useState("");
  const [facilityNumber, setFacilityNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadCounters() {
    setCounterLoading(true);
    setCounterError("");
    try {
      const response = await fetch("/api/bayegani/counters", { cache: "no-store" });
      const result = (await response.json()) as {
        success?: boolean;
        counters?: CounterOption[];
        error?: string;
      };
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "دریافت فهرست باجه‌ها ناموفق بود.");
      }
      setCounters(Array.isArray(result.counters) ? result.counters : []);
    } catch (loadError) {
      setCounterError(loadError instanceof Error ? loadError.message : "دریافت فهرست باجه‌ها ناموفق بود.");
    } finally {
      setCounterLoading(false);
    }
  }

  useEffect(() => {
    void loadCounters();
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setError("");
    setSuccess("");
  }

  function downloadTextFile(textContent: string, fileName: string) {
    const blob = new Blob(["\uFEFF", textContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!counterLabel.trim() || !facilityNumber.trim()) {
      setError("کدباجه - نام باجه و کد تسهیلات خرید دین را وارد کنید.");
      return;
    }
    if (!file) {
      setError("فایل Excel را انتخاب کنید.");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("counterLabel", counterLabel.trim());
      formData.append("facilityNumber", facilityNumber.trim());
      formData.append("file", file);

      const response = await fetch("/api/debt-documents/upload", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "خطا در بارگذاری فایل");
      }

      if (result.textContent !== undefined) {
        downloadTextFile(result.textContent, result.textFileName || "اسناد-خرید-دین.txt");
        setSuccess(`${result.count ?? 0} ردیف ثبت شد و فایل متنی با موفقیت دریافت شد.`);
      } else {
        setSuccess(`${result.count ?? 0} ردیف با موفقیت در جدول اسناد خرید دین ثبت شد.`);
      }
      setFile(null);
      const fileInput = document.getElementById("debtArchiveExcelFile") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      onUploaded?.();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "خطا در بارگذاری فایل");
    } finally {
      setLoading(false);
    }
  }

  const filteredCounters = counters.filter((counter) => {
    const query = counterLabel.trim().toLocaleLowerCase();
    return !query || `${counter.code} ${counter.name}`.toLocaleLowerCase().includes(query)
      || `${counter.code}-${counter.name}`.toLocaleLowerCase().includes(query);
  });

  return (
    <>
      <UploadLoadingOverlay
        open={loading}
        title="در حال بارگذاری اسناد خرید دین..."
        description="فایل Excel در حال پردازش و ردیف‌ها در پایگاه داده ثبت می‌شوند."
      />
      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4">
          <h2 className="font-bold text-slate-900">بارگذاری اسناد جدید خرید دین</h2>
          <p className="mt-1 text-xs text-slate-500">فایل اکسل را همراه با کد باجه و کد تسهیلات خرید دین ثبت کنید. در قالب ۱۴ ستونی، فایل TXT نیز به‌صورت خودکار دریافت می‌شود.</p>
        </div>
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="debtArchiveCounterLabel" className="mb-2 block text-sm font-semibold text-slate-700">
              کدباجه - نام باجه
            </label>
            <div className="relative">
              <input
                id="debtArchiveCounterLabel"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={counterOpen}
                aria-controls="debt-archive-counter-options"
                value={counterLabel}
                onFocus={() => {
                  setCounterOpen(true);
                  if (counters.length === 0 && !counterLoading) void loadCounters();
                }}
                onChange={(event) => {
                  setCounterLabel(event.target.value);
                  setCounterOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setCounterOpen(false);
                  if (event.key === "Enter" && counterOpen) {
                    const query = counterLabel.trim().toLocaleLowerCase();
                    const first = counters.find((counter) =>
                      `${counter.code} ${counter.name}`.toLocaleLowerCase().includes(query)
                      || `${counter.code}-${counter.name}`.toLocaleLowerCase().includes(query)
                    );
                    if (first) {
                      event.preventDefault();
                      setCounterLabel(`${first.code}-${first.name}`);
                      setCounterOpen(false);
                    }
                  }
                }}
                disabled={loading}
                placeholder="کد یا نام باجه را جستجو کنید..."
                autoComplete="off"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
              {counterOpen && !loading && (
                <div
                  id="debt-archive-counter-options"
                  role="listbox"
                  className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
                >
                  {counterLoading ? (
                    <p className="px-3 py-4 text-center text-sm text-slate-500">در حال دریافت فهرست باجه‌ها...</p>
                  ) : counterError ? (
                    <div className="px-3 py-3 text-sm text-red-600">
                      <p>{counterError}</p>
                      <button type="button" onClick={() => void loadCounters()} className="mt-2 font-semibold text-blue-600 hover:underline">
                        تلاش مجدد
                      </button>
                    </div>
                  ) : counters.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-slate-500">هیچ باجه‌ای در فهرست ثبت نشده است.</p>
                  ) : (
                    filteredCounters.slice(0, 50).map((counter) => (
                      <button
                        key={counter.id}
                        type="button"
                        role="option"
                        aria-selected={counterLabel === `${counter.code}-${counter.name}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setCounterLabel(`${counter.code}-${counter.name}`);
                          setCounterOpen(false);
                        }}
                        className="w-full rounded-lg px-3 py-2.5 text-right text-sm text-slate-700 transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                      >
                        {counter.code}-{counter.name}
                      </button>
                    ))
                  )}
                  {!counterLoading && !counterError && counters.length > 0 && filteredCounters.length === 0 && (
                    <p className="px-3 py-4 text-center text-sm text-slate-500">موردی پیدا نشد.</p>
                  )}
                </div>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="debtArchiveFacilityNumber" className="mb-2 block text-sm font-semibold text-slate-700">
              کد تسهیلات خرید دین
            </label>
            <input
              id="debtArchiveFacilityNumber"
              value={facilityNumber}
              onChange={(event) => setFacilityNumber(event.target.value)}
              disabled={loading}
              placeholder="کد تسهیلات را وارد کنید"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="debtArchiveExcelFile" className="mb-2 block text-sm font-semibold text-slate-700">
              فایل Excel خرید دین
            </label>
            <input
              id="debtArchiveExcelFile"
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileChange}
              disabled={loading}
              className="block w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"
            />
            {file && <p className="mt-2 text-xs text-slate-500">فایل انتخاب‌شده: {file.name}</p>}
          </div>
        </div>
        {error && <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div>}
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="submit" disabled={loading} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">
            {loading ? "در حال ثبت..." : "بارگذاری و ثبت در جدول"}
          </button>
        </div>
      </form>
    </>
  );
}
