"use client";

import { useEffect, useState } from "react";
import DebtDocumentsUploadForm from "@/components/DebtDocumentsUploadForm";

type DebtRecord = {
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
  records?: DebtRecord[];
  total?: number;
};

const columns: { key: keyof DebtRecord; label: string }[] = [
  { key: "counterLabel", label: "کدباجه - نام باجه" },
  { key: "facilityNumber", label: "کد تسهیلات خرید دین" },
  { key: "customerNumber", label: "شماره مشتری" },
  { key: "serial", label: "سریال سفته / چک" },
  { key: "dueDate", label: "تاریخ سررسید" },
  { key: "paidAmount", label: "پرداخت شده" },
  { key: "administrativeNumber", label: "شماره انتظامی" },
  { key: "checkStatus", label: "وضعیت سفته / چک" },
];

export default function DebtDocumentsArchivePage() {
  const [records, setRecords] = useState<DebtRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("counter");
  const [filterValue, setFilterValue] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecord = Math.min(page * pageSize, total);
  const visiblePages = Array.from({ length: Math.min(3, totalPages) }, (_, index) => {
    const start = Math.max(1, Math.min(page - 1, totalPages - 2));
    return start + index;
  });
  const showLeadingEllipsis = visiblePages.length > 0 && visiblePages[0] > 2;
  const showTrailingEllipsis = visiblePages.length > 0 && visiblePages[visiblePages.length - 1] < totalPages - 1;

  async function loadRecords(signal?: AbortSignal) {
    setLoading(true);
    setError("");
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
      const response = await fetch(`/api/debt-documents/upload?${params.toString()}`, { cache: "no-store", signal });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) throw new Error(result.error ?? "خطا در دریافت اطلاعات");
      setRecords(result.records ?? []);
      setTotal(result.total ?? 0);
    } catch (loadError) {
      if (loadError instanceof Error && loadError.name === "AbortError") return;
      setError(loadError instanceof Error ? loadError.message : "خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }

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

  async function exportExcel() {
    setError("");
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
      setError(exportError instanceof Error ? exportError.message : "خطا در دریافت خروجی اکسل.");
    } finally {
      setExportLoading(false);
    }
  }

  async function updateCheckStatus(recordId: number, checkStatus: string) {
    setError("");
    try {
      const response = await fetch("/api/debt-documents/upload", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recordId, checkStatus }),
      });
      const result = (await response.json()) as {
        success: boolean;
        error?: string;
        record?: { id: number; checkStatus: string };
      };
      if (!response.ok || !result.success || !result.record) {
        throw new Error(result.error ?? "تغییر وضعیت چک ناموفق بود.");
      }
      setRecords((current) => current.map((record) =>
        record.id === recordId ? { ...record, checkStatus: result.record!.checkStatus } : record
      ));
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "خطا در تغییر وضعیت چک.");
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
    <div dir="rtl" className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">بایگانی اسناد خرید دین</h1>
          <p className="mt-2 text-sm text-slate-500">مشاهده، جستجو، فیلتر و مرتب‌سازی اسناد ثبت‌شده</p>
        </div>

      </header>

      <DebtDocumentsUploadForm onUploaded={() => void loadRecords()} />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">فهرست اسناد خرید دین</h2>
              <p className="mt-1 text-xs text-slate-500">تعداد نتایج: {total.toLocaleString("fa-IR")}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={exportExcel} disabled={exportLoading} className="rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50">
                {exportLoading ? "در حال تهیه فایل..." : "خروجی اکسل همه رکوردها"}
              </button>
              <button type="button" onClick={() => void loadRecords()} disabled={loading} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
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

        {error && <p className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">در حال دریافت اطلاعات...</div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">رکوردی پیدا نشد. ابتدا اسناد را بارگذاری کنید یا فیلترها را تغییر دهید.</div>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[1050px] text-right text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">ردیف</th>
                  {columns.map((column) => sortableHeader(column.label, column.key))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3">{(firstRecord + index).toLocaleString("fa-IR")}</td>
                    {columns.map((column) => (
                      <td key={column.key} className="whitespace-nowrap px-4 py-3">
{String(record[column.key] ?? "—")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <nav aria-label="صفحه‌بندی بایگانی اسناد خرید دین" className="flex flex-wrap items-center gap-1.5">
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
            <span>تعداد کل: <strong className="text-slate-900">{total.toLocaleString("fa-IR")}</strong></span>
            <span>رکوردهای این صفحه: <strong className="text-slate-900">{records.length.toLocaleString("fa-IR")}</strong></span>
            <span>نمایش {firstRecord.toLocaleString("fa-IR")} تا {lastRecord.toLocaleString("fa-IR")}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
