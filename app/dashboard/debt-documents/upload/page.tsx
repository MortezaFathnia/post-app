"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import UploadLoadingOverlay from "@/components/UploadLoadingOverlay";

type CounterOption = { id: number; code: string; name: string };

type DebtUploadTableRecord = {
  id: number;
  counterLabel: string;
  facilityNumber: string;
  customerNumber: string | null;
  serial: string | null;
  dueDate: string | null;
  paidAmount: string | null;
  administrativeNumber: string | null;
  checkStatus: string | null;
};

type ApiResult = {
  success: boolean;
  error?: string;
  count?: number;
  records?: DebtUploadTableRecord[];
};

export default function DebtDocumentsUploadPage() {
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
  const [tableRecords, setTableRecords] = useState<DebtUploadTableRecord[]>([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState("");

  async function loadRecords() {
    setTableLoading(true);
    setTableError("");
    try {
      const response = await fetch(
        "/api/debt-documents/upload?page=1&pageSize=100&sortBy=createdAt&sortOrder=desc",
        { cache: "no-store" },
      );
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "دریافت فهرست اسناد ناموفق بود.");
      }
      setTableRecords(Array.isArray(result.records) ? result.records : []);
    } catch (loadError) {
      setTableError(loadError instanceof Error ? loadError.message : "دریافت فهرست اسناد ناموفق بود.");
    } finally {
      setTableLoading(false);
    }
  }

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
    void loadRecords();
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    setFile(event.target.files?.[0] ?? null);
    setError("");
    setSuccess("");
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

      setSuccess(`${result.count ?? 0} ردیف با موفقیت در جدول اسناد خرید دین ثبت شد.`);
      await loadRecords();
      setFile(null);
      const fileInput = document.getElementById("debtExcelFile") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "خطا در بارگذاری فایل");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <UploadLoadingOverlay
        open={loading}
        title="در حال بارگذاری اسناد خرید دین..."
        description="فایل Excel در حال پردازش و ردیف‌ها در پایگاه داده ثبت می‌شوند."
      />
      <div dir="rtl" className="space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">بارگذاری اسناد جدید خرید دین</h1>
          <p className="mt-2 text-sm text-slate-600">
            فایل اکسل را همراه با کد باجه و کد تسهیلات خرید دین ثبت کنید.
          </p>
          <Link href="/dashboard/debt-documents" className="mt-3 inline-flex rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50">
            مشاهده بایگانی اسناد خرید دین
          </Link>
        </div>

        <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label htmlFor="counterLabel" className="mb-2 block text-sm font-semibold text-slate-700">
                کدباجه - نام باجه
              </label>
              <div className="relative">
                <input
                  id="counterLabel"
                  role="combobox"
                  aria-autocomplete="list"
                  aria-expanded={counterOpen}
                  aria-controls="debt-counter-options"
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
                    id="debt-counter-options"
                    role="listbox"
                    className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
                  >
                    {counterLoading ? (
                      <p className="px-3 py-4 text-center text-sm text-slate-500">در حال دریافت فهرست باجه‌ها...</p>
                    ) : counterError ? (
                      <div className="px-3 py-3 text-sm text-red-600">
                        <p>{counterError}</p>
                        <button
                          type="button"
                          onClick={() => void loadCounters()}
                          className="mt-2 font-semibold text-blue-600 hover:underline"
                        >
                          تلاش مجدد
                        </button>
                      </div>
                    ) : counters.length === 0 ? (
                      <p className="px-3 py-4 text-center text-sm text-slate-500">
                        هیچ باجه‌ای در فهرست ثبت نشده است.
                      </p>
                    ) : (
                      counters
                      .filter((counter) => {
                        const query = counterLabel.trim().toLocaleLowerCase();
                        return !query || `${counter.code} ${counter.name}`.toLocaleLowerCase().includes(query)
                          || `${counter.code}-${counter.name}`.toLocaleLowerCase().includes(query);
                      })
                      .slice(0, 50)
                      .map((counter) => (
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
                      )))}
                    {counters.length > 0 && counters.filter((counter) => {
                      const query = counterLabel.trim().toLocaleLowerCase();
                      return !query || `${counter.code} ${counter.name}`.toLocaleLowerCase().includes(query)
                        || `${counter.code}-${counter.name}`.toLocaleLowerCase().includes(query);
                    }).length === 0 && (
                      <p className="px-3 py-4 text-center text-sm text-slate-500">موردی پیدا نشد.</p>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div>
              <label htmlFor="facilityNumber" className="mb-2 block text-sm font-semibold text-slate-700">
                کد تسهیلات خرید دین
              </label>
              <input
                id="facilityNumber"
                value={facilityNumber}
                onChange={(event) => setFacilityNumber(event.target.value)}
                disabled={loading}
                placeholder="کد تسهیلات را وارد کنید"
                className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div className="md:col-span-2">
              <label htmlFor="debtExcelFile" className="mb-2 block text-sm font-semibold text-slate-700">
                فایل Excel خرید دین
              </label>
              <input
                id="debtExcelFile"
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

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-slate-900">اسناد بارگذاری‌شده</h2>
              <p className="mt-1 text-xs text-slate-500">نمایش آخرین ۱۰۰ رکورد ثبت‌شده در این بخش</p>
            </div>
            <button
              type="button"
              onClick={() => void loadRecords()}
              disabled={tableLoading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {tableLoading ? "در حال به‌روزرسانی..." : "به‌روزرسانی"}
            </button>
          </div>

          {tableError && (
            <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {tableError}
            </div>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full border-collapse text-right text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  {[
                    "کدباجه - نام باجه",
                    "کد تسهیلات خرید دین",
                    "شماره مشتری",
                    "سریال سفته / چک",
                    "تاریخ سررسید",
                    "پرداخت شده",
                    "شماره انتظامی",
                    "وضعیت سفته / چک",
                  ].map((label) => (
                    <th key={label} className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold">
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tableLoading && tableRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      در حال دریافت اطلاعات...
                    </td>
                  </tr>
                ) : tableRecords.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-slate-500">
                      هنوز رکوردی ثبت نشده است.
                    </td>
                  </tr>
                ) : (
                  tableRecords.map((record) => (
                    <tr key={record.id} className="odd:bg-white even:bg-slate-50">
                      {[
                        record.counterLabel,
                        record.facilityNumber,
                        record.customerNumber,
                        record.serial,
                        record.dueDate,
                        record.paidAmount,
                        record.administrativeNumber,
                        record.checkStatus,
                      ].map((cell, index) => (
                        <td key={index} className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700">
                          {cell || "—"}
                        </td>
                      ))}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </>
  );
}
