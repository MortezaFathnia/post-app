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
  checkNumber: string | null;
  checkStatus: string | null;
  domesticForeign: string | null;
  dueDate: string | null;
  paidAmount: string | null;
  unpaidAmount: string | null;
  embeddedProfit: string | null;
  delayDays: string | null;
  delayPenalty: string | null;
  bankAgent: string | null;
  administrativeNumber: string | null;
  rawData: Record<string, unknown> | null;
};

type ApiResult = {
  success: boolean;
  error?: string;
  count?: number;
  records?: DebtUploadTableRecord[];
  total?: number;
  textContent?: string;
  textFileName?: string;
};

const columns: { key: keyof DebtUploadTableRecord | "checkBranch"; label: string }[] = [
  { key: "counterLabel", label: "کدباجه - نام باجه" },
  { key: "facilityNumber", label: "کد تسهیلات خرید دین" },
  { key: "customerNumber", label: "شماره مشتری" },
  { key: "serial", label: "سریال سفته / چک" },
  { key: "dueDate", label: "تاریخ سررسید" },
  { key: "bankAgent", label: "بانک عامل" },
  { key: "checkBranch", label: "شعبه چک" },
  { key: "paidAmount", label: "مبلغ" },
  { key: "administrativeNumber", label: "شماره انتظامی" },
];

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
  const [tableTotal, setTableTotal] = useState(0);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState("");
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("counter");
  const [filterValue, setFilterValue] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [exportLoading, setExportLoading] = useState(false);
  const [outputFileUrl, setOutputFileUrl] = useState("");
  const [outputFileName, setOutputFileName] = useState("اسناد-خرید-دین.txt");
  const [outputFacilityNumber, setOutputFacilityNumber] = useState("");
  const [outputCustomerNumber, setOutputCustomerNumber] = useState("");

  const totalPages = Math.max(1, Math.ceil(tableTotal / pageSize));
  const firstRecord = tableTotal === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecord = Math.min(page * pageSize, tableTotal);
  const visiblePages = Array.from({ length: Math.min(3, totalPages) }, (_, index) => {
    const start = Math.max(1, Math.min(page - 1, totalPages - 2));
    return start + index;
  });
  const showLeadingEllipsis = visiblePages.length > 0 && visiblePages[0] > 2;
  const showTrailingEllipsis = visiblePages.length > 0 && visiblePages[visiblePages.length - 1] < totalPages - 1;

  async function loadRecords(signal?: AbortSignal) {
    setTableLoading(true);
    setTableError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
        filterType: filterValue.trim() ? filterType : "",
        filterValue: filterValue.trim(),
        sortBy,
        sortOrder,
      });
      const response = await fetch(`/api/debt-documents/upload?${params.toString()}`, {
        cache: "no-store",
        signal,
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "دریافت فهرست اسناد ناموفق بود.");
      }
      setTableRecords(Array.isArray(result.records) ? result.records : []);
      setTableTotal(result.total ?? 0);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") return;
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
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void loadRecords(controller.signal);
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [page, pageSize, search, filterType, filterValue, sortBy, sortOrder]);

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
      formData.append("format", "new");

      const response = await fetch("/api/debt-documents/upload", {
        method: "POST",
        body: formData,
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) {
        throw new Error(result.error ?? "خطا در بارگذاری فایل");
      }

      if (outputFileUrl) URL.revokeObjectURL(outputFileUrl);
      setOutputFileUrl("");
      setOutputFacilityNumber("");
      setOutputCustomerNumber("");

      if (result.textContent !== undefined) {
        // Normalize every line ending to Windows CRLF and include a UTF-8 BOM for Windows text editors.
const windowsText = result.textContent.replace(/\r\n|\r|\n/g, "\r\n");
const blob = new Blob(["\uFEFF", windowsText], { type: "text/plain;charset=utf-8" });
        setOutputFileUrl(URL.createObjectURL(blob));
        setOutputFileName(result.textFileName || "اسناد-خرید-دین.txt");
        setOutputFacilityNumber(facilityNumber.trim());
        setOutputCustomerNumber(facilityNumber.trim().split(".")[2]?.trim() || "—");
        setSuccess(`${result.count ?? 0} ردیف ثبت شد و فایل خروجی متنی آماده دریافت است.`);
      } else {
        setSuccess(`${result.count ?? 0} ردیف با موفقیت در جدول اسناد خرید دین ثبت شد. برای این قالب فایل خروجی متنی تولید نمی‌شود.`);
      }
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

  async function exportExcel() {
    setTableError("");
    setExportLoading(true);
    try {
      const response = await fetch("/api/debt-documents/export", { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "خروجی اکسل ناموفق بود.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "اسناد-خرید-دین.xlsx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (exportError) {
      setTableError(exportError instanceof Error ? exportError.message : "خطا در دریافت خروجی اکسل.");
    } finally {
      setExportLoading(false);
    }
  }



  function toggleSort(field: string) {
    if (sortBy === field) setSortOrder((current) => current === "asc" ? "desc" : "asc");
    else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  }

  function sortableHeader(label: string, field: string) {
    const active = sortBy === field;
    return (
      <th key={field} className="whitespace-nowrap px-4 py-3 font-semibold">
        <button type="button" onClick={() => toggleSort(field)} className="inline-flex items-center gap-1.5 hover:text-blue-700">
          {label}
          <span aria-hidden="true" className={active ? "text-blue-700" : "text-slate-400"}>
            {active ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}
          </span>
        </button>
      </th>
    );
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
            فقط فایل اکسل با قالب جدید ۱۴ ستونی چک‌ها را همراه با کد باجه و کد تسهیلات خرید دین بارگذاری کنید. قالب قدیمی ۱۱ ستونی از صفحه فهرست اسناد خرید دین پذیرفته می‌شود.
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

        <section className="overflow-hidden rounded-2xl border border-emerald-200 bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b border-emerald-100 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">اطلاعات فایل خروجی</h2>
              <p className="mt-1 text-xs text-slate-500">کد تسهیلات، شماره مشتری و لینک دریافت فایل خروجی</p>
            </div>
          </div>
          <div className="overflow-x-auto p-5">
            <table className="min-w-full border-collapse text-right text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-bold">کد تسهیلات</th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-bold">شماره مشتری</th>
                  <th className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-bold">فایل خروجی</th>
                </tr>
              </thead>
              <tbody>
                <tr className="bg-white">
                  <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700">{outputFacilityNumber || "—"}</td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3 text-slate-700">{outputCustomerNumber || "—"}</td>
                  <td className="whitespace-nowrap border-b border-slate-100 px-4 py-3">
                    {outputFileUrl ? (
                      <a
                        href={outputFileUrl}
                        download={outputFileName}
                        className="inline-flex items-center rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                      >
                        دریافت فایل TXT
                      </a>
                    ) : (
                      <span className="text-slate-400">فایلی بارگذاری نشده است</span>
                    )}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">فهرست اسناد جدید خرید دین بارگذاری شده</h2>
              <p className="mt-1 text-xs text-slate-500">تعداد نتایج: {tableTotal.toLocaleString("fa-IR")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={exportExcel} disabled={exportLoading} className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                {exportLoading ? "در حال تهیه فایل..." : "خروجی اکسل همه رکوردها"}
              </button>
              <button type="button" onClick={() => void loadRecords()} disabled={tableLoading} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
                به‌روزرسانی جدول
              </button>
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:flex-wrap sm:items-center">
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="جستجوی عمومی..." aria-label="جستجوی عمومی" className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:min-w-56 sm:flex-1" />
            <label htmlFor="debt-archive-filter" className="shrink-0 text-sm font-medium text-slate-700">فیلتر بر اساس</label>
            <select id="debt-archive-filter" value={filterType} onChange={(event) => { setFilterType(event.target.value); setPage(1); }} className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value="counter">باجه</option>
              <option value="facilityNumber">کد تسهیلات خرید دین</option>
              <option value="checkStatus">وضعیت سفته / چک</option>
              <option value="dueDate">تاریخ سررسید</option>
              <option value="bankAgent">بانک عامل</option>
            </select>
            <input value={filterValue} onChange={(event) => { setFilterValue(event.target.value); setPage(1); }} placeholder="مقدار موردنظر برای فیلتر..." aria-label="مقدار فیلتر" className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm" />
            <button type="button" onClick={() => { setFilterValue(""); setPage(1); }} className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100">پاک کردن</button>
          </div>
        </div>

        {tableError && <p className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{tableError}</p>}
        {tableLoading ? (
          <div className="p-10 text-center text-sm text-slate-500">در حال دریافت اطلاعات...</div>
        ) : tableRecords.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">رکوردی پیدا نشد. ابتدا اسناد را بارگذاری کنید یا فیلترها را تغییر دهید.</div>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[1050px] text-right text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">ردیف</th>
                  {columns.map((column) => column.key === "checkBranch" ? (
                  <th key={column.key} className="whitespace-nowrap px-4 py-3 font-semibold">{column.label}</th>
                ) : sortableHeader(column.label, column.key))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tableRecords.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3">{(firstRecord + index).toLocaleString("fa-IR")}</td>
                    {columns.map((column) => (
                      <td key={column.key} className="whitespace-nowrap px-4 py-3">
                        {column.key === "checkBranch"
                          ? String(record.rawData?.["شعبه چک"] ?? record.rawData?.["شعبه"] ?? "—")
                          : String(record[column.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="صفحه‌بندی اسناد خرید دین" className="flex flex-wrap items-center gap-1.5">
            <button type="button" onClick={() => setPage(1)} disabled={page <= 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">اولین</button>
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">قبلی</button>
            {totalPages > 3 && visiblePages[0] > 1 && <button type="button" onClick={() => setPage(1)} className="min-w-10 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">۱</button>}
            {showLeadingEllipsis && <span className="px-1 text-slate-500">…</span>}
            {visiblePages.map((pageNumber) => (
              <button key={pageNumber} type="button" aria-current={pageNumber === page ? "page" : undefined} onClick={() => setPage(pageNumber)} className={`min-w-10 rounded-lg border px-3 py-2 text-sm ${pageNumber === page ? "border-blue-600 bg-blue-600 font-semibold text-white" : "border-slate-300 hover:bg-slate-50"}`}>
                {pageNumber.toLocaleString("fa-IR")}
              </button>
            ))}
            {showTrailingEllipsis && <span className="px-1 text-slate-500">…</span>}
            {totalPages > 3 && visiblePages[visiblePages.length - 1] < totalPages && <button type="button" onClick={() => setPage(totalPages)} className="min-w-10 rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50">{totalPages.toLocaleString("fa-IR")}</button>}
            <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">بعدی</button>
            <button type="button" onClick={() => setPage(totalPages)} disabled={page >= totalPages} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">آخرین</button>
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} aria-label="تعداد رکورد در هر صفحه" className="rounded-xl border border-slate-300 px-3 py-2 text-sm">
              <option value={10}>۱۰ در صفحه</option><option value={20}>۲۰ در صفحه</option><option value={50}>۵۰ در صفحه</option><option value={100}>۱۰۰ در صفحه</option>
            </select>
          </nav>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600 sm:justify-end">
            <span>تعداد کل: <strong className="text-slate-900">{tableTotal.toLocaleString("fa-IR")}</strong></span>
            <span>رکوردهای این صفحه: <strong className="text-slate-900">{tableRecords.length.toLocaleString("fa-IR")}</strong></span>
            <span>نمایش {firstRecord.toLocaleString("fa-IR")} تا {lastRecord.toLocaleString("fa-IR")}</span>
          </div>
        </div>
      </section>
      </div>
    </>
  );
}
