"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import UploadLoadingOverlay from "@/components/UploadLoadingOverlay";

type DebtDiscountingRecord = {
  id: number;
  counterLabel: string;
  facilityNumber: string;
  serial: string | null;
  checkNumber: string | null;
  checkStatus: string | null;
  dueDate: string | null;
  paidAmount: string | null;
  unpaidAmount: string | null;
  embeddedProfit: string | null;
  delayDays: string | null;
  delayPenalty: string | null;
  bankAgent: string | null;
  administrativeNumber: string | null;
  sourceFile: string;
  createdAt: string;
};

type CounterOption = { name: string; code: string };

type ApiResult = {
  success: boolean;
  error?: string;
  count?: number;
  records?: DebtDiscountingRecord[];
};

const columns: { key: keyof DebtDiscountingRecord; label: string }[] = [
  { key: "serial", label: "سریال سفته / چک" },
  { key: "checkNumber", label: "شماره سفته / چک" },
  { key: "checkStatus", label: "وضعیت سفته / چک" },
  { key: "dueDate", label: "تاریخ سررسید" },
  { key: "paidAmount", label: "پرداخت شده" },
  { key: "unpaidAmount", label: "پرداخت نشده" },
  { key: "embeddedProfit", label: "سود / کارمزد مستتر" },
  { key: "delayDays", label: "مدت تأخیر (روز)" },
  { key: "delayPenalty", label: "جریمه تأخیر" },
  { key: "bankAgent", label: "بانک عامل" },
  { key: "administrativeNumber", label: "شماره انتظامی" },
];

export default function DebtDocumentsUploadPage() {
  const [counterLabel, setCounterLabel] = useState("");
  const [counters, setCounters] = useState<CounterOption[]>([]);
  const [counterOpen, setCounterOpen] = useState(false);
  const [facilityNumber, setFacilityNumber] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [records, setRecords] = useState<DebtDiscountingRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function loadRecords() {
    setListLoading(true);
    try {
      const response = await fetch("/api/debt-documents/upload", { cache: "no-store" });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) throw new Error(result.error ?? "خطا در دریافت اطلاعات");
      setRecords(result.records ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "خطا در دریافت اطلاعات");
    } finally {
      setListLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
    let active = true;
    fetch("/api/bayegani/counters", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error("دریافت فهرست باجه‌ها ناموفق بود.");
        if (active) setCounters(Array.isArray(result.counters) ? result.counters : []);
      })
      .catch(() => { /* Keep manual entry available if counter options cannot load. */ });
    return () => { active = false; };
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
      setFile(null);
      const fileInput = document.getElementById("debtExcelFile") as HTMLInputElement | null;
      if (fileInput) fileInput.value = "";
      await loadRecords();
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
          <h1 className="text-2xl font-bold text-slate-900">اسناد خرید دین</h1>
          <p className="mt-2 text-sm text-slate-600">
            فایل اکسل را همراه با کد باجه و کد تسهیلات خرید دین ثبت کنید.
          </p>
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
                  onFocus={() => setCounterOpen(true)}
                  onChange={(event) => {
                    setCounterLabel(event.target.value);
                    setCounterOpen(true);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape") setCounterOpen(false);
                    if (event.key === "Enter" && counterOpen) {
                      const first = counters.find((counter) =>
                        `${counter.code} ${counter.name}`.toLocaleLowerCase().includes(counterLabel.trim().toLocaleLowerCase())
                        || `${counter.code}-${counter.name}`.toLocaleLowerCase().includes(counterLabel.trim().toLocaleLowerCase())
                      );
                      if (first) {
                        event.preventDefault();
                        setCounterLabel(`${first.code}-${first.name}`);
                        setCounterOpen(false);
                      }
                    }
                  }}
                  disabled={loading}
                  autoComplete="off"
                  placeholder="کد یا نام باجه را جستجو کنید..."
                  className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                {counterOpen && !loading && (
                  <div id="debt-counter-options" role="listbox" className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                    {counters.filter((counter) => {
                      const query = counterLabel.trim().toLocaleLowerCase();
                      return !query || `${counter.code} ${counter.name}`.toLocaleLowerCase().includes(query)
                        || `${counter.code}-${counter.name}`.toLocaleLowerCase().includes(query);
                    }).slice(0, 50).map((counter) => (
                      <button
                        key={`${counter.code}-${counter.name}`}
                        type="button"
                        role="option"
                        aria-selected={counterLabel === `${counter.code}-${counter.name}`}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setCounterLabel(`${counter.code}-${counter.name}`);
                          setCounterOpen(false);
                        }}
                        className="flex w-full items-center rounded-lg px-3 py-2.5 text-right text-sm text-slate-700 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                      >
                        <span className="font-medium">{counter.code}-{counter.name}</span>
                      </button>
                    ))}
                    {counters.filter((counter) => {
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
            <button type="button" onClick={() => void loadRecords()} disabled={listLoading || loading} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              به‌روزرسانی جدول
            </button>
          </div>
        </form>

        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-4">
            <div>
              <h2 className="font-bold text-slate-900">جدول اسناد خرید دین</h2>
              <p className="mt-1 text-xs text-slate-500">اطلاعات بارگذاری‌شده به همراه کد باجه و کد تسهیلات</p>
            </div>
            <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-700">
              {records.length.toLocaleString("fa-IR")} ردیف
            </span>
          </div>

          {listLoading ? (
            <div className="p-10 text-center text-sm text-slate-500">در حال دریافت اطلاعات...</div>
          ) : records.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-500">هنوز سندی بارگذاری نشده است.</div>
          ) : (
            <div className="max-h-[70vh] overflow-auto">
              <table className="min-w-[1700px] w-full border-collapse text-right text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 text-slate-700">
                  <tr>
                    <th className="whitespace-nowrap border-b border-l border-slate-200 px-3 py-3">ردیف</th>
                    <th className="whitespace-nowrap border-b border-l border-slate-200 px-3 py-3">کدباجه - نام باجه</th>
                    <th className="whitespace-nowrap border-b border-l border-slate-200 px-3 py-3">کد تسهیلات خرید دین</th>
                    {columns.map((column) => (
                      <th key={column.key} className="whitespace-nowrap border-b border-l border-slate-200 px-3 py-3">{column.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((record, index) => (
                    <tr key={record.id} className="odd:bg-white even:bg-slate-50 hover:bg-blue-50/50">
                      <td className="border-b border-l border-slate-100 px-3 py-3">{(index + 1).toLocaleString("fa-IR")}</td>
                      <td className="whitespace-nowrap border-b border-l border-slate-100 px-3 py-3 font-medium">{record.counterLabel}</td>
                      <td className="whitespace-nowrap border-b border-l border-slate-100 px-3 py-3 font-medium">{record.facilityNumber}</td>
                      {columns.map((column) => (
                        <td key={column.key} className="whitespace-nowrap border-b border-l border-slate-100 px-3 py-3">
                          {String(record[column.key] ?? "—")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
