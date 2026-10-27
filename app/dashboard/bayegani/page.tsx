"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type SortField = "facilityNumber" | "facilityTitle" | "nationalId" | "counterLabel" | "archiveCode" | "startDate" | "endDate" | "approvedAmount";

type RecordItem = {
  id: number; sheetName: string; sourceRow: number; facilityNumber: string | null;
  customerNumber: string | null; archiveCode: string | null; facilityTitle: string | null;
  counterLabel: string | null;
  serial: string | null; classification: string | null; status: string | null;
  startDate: string | null; endDate: string | null; approvedAmount: string | null;
  remainingAmount: string | null; nationalId: string | null;
};

export default function BayeganiPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState<SortField>("facilityNumber");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecord = Math.min(page * pageSize, total);
  const visiblePages = Array.from(
    { length: Math.min(3, totalPages) },
    (_, index) => {
      const start = Math.max(1, Math.min(page - 1, totalPages - 2));
      return start + index;
    },
  );
  const showLeadingEllipsis = visiblePages.length > 0 && visiblePages[0] > 2;
  const showTrailingEllipsis = visiblePages.length > 0 && visiblePages[visiblePages.length - 1] < totalPages - 1;

  async function loadRecords() {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search,
      sortBy,
      sortOrder,
    });
    const response = await fetch(`/api/bayegani?${params.toString()}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "دریافت اطلاعات ناموفق بود.");
    setRecords(result.records);
    setTotal(result.total);
  }

  useEffect(() => {
    loadRecords().catch((e: unknown) => setError(e instanceof Error ? e.message : "خطا"));
  }, [page, pageSize, search, sortBy, sortOrder]);

  function toggleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder((current) => current === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("asc");
    }
    setPage(1);
  }

  function sortableHeader(label: string, field: SortField) {
    const active = sortBy === field;
    return <th key={field} className="whitespace-nowrap px-4 py-3 font-semibold">
      <button type="button" onClick={() => toggleSort(field)} aria-label={`مرتب‌سازی بر اساس ${label}`} className="inline-flex items-center gap-1.5 hover:text-blue-700">
        {label}<span aria-hidden="true" className={active ? "text-blue-700" : "text-slate-400"}>{active ? (sortOrder === "asc" ? "↑" : "↓") : "↕"}</span>
      </button>
    </th>;
  }

  async function exportExcel() {
    setError("");
    setMessage("");
    setExportLoading(true);
    try {
      const response = await fetch("/api/bayegani/export", { cache: "no-store" });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        throw new Error(result?.error || "خروجی اکسل ناموفق بود.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "رکوردهای-بایگانی.xlsx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
      setMessage("خروجی اکسل همه رکوردهای پایگاه داده آماده شد.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت خروجی اکسل.");
    } finally {
      setExportLoading(false);
    }
  }

  async function upload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setMessage("");
    if (!file) { setError("فایل Excel را انتخاب کنید."); return; }
    setLoading(true);
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/bayegani", { method: "POST", body: form });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "ورود اطلاعات ناموفق بود.");
      setMessage(`${result.imported} رکورد جدید ذخیره شد. تعداد ردیف‌های شناسایی‌شده: ${result.detected}. ${result.normalized ?? 0} رکورد موجود نیز پاک‌سازی و یکسان‌سازی شد.`);
      setPage(1);
      await loadRecords();
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در بارگذاری فایل."); }
    finally { setLoading(false); }
  }

  return <div dir="rtl" className="space-y-6">
    <header>
      <h1 className="text-2xl font-bold text-slate-900">مدیریت بایگانی تسهیلات</h1>
      <p className="mt-2 text-sm text-slate-500">بارگذاری فایل BAYEGANI1405، ذخیره اطلاعات در پایگاه داده و ویرایش ردیف‌ها</p>
    </header>
    <form onSubmit={upload} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h2 className="mb-3 font-bold">ورود اطلاعات از Excel</h2>
      <p className="mb-4 text-sm leading-6 text-slate-600">تمام Sheetهای فایل پردازش می‌شوند. عنوان ستون‌ها و مقادیر اصلی هر ردیف برای ویرایش‌های بعدی حفظ می‌شوند. بارگذاری دوباره همان نام فایل، ردیف‌های تکراری را دوباره ثبت نمی‌کند.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input type="file" accept=".xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} disabled={loading} className="min-w-0 flex-1 rounded-xl border border-slate-300 p-3 text-sm" />
        <button disabled={loading} className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-60">{loading ? "در حال ذخیره..." : "بارگذاری و ذخیره در DB"}</button>
      </div>
      {message && <p className="mt-3 text-sm text-emerald-700">{message}</p>}
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </form>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b border-slate-100 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div><h2 className="font-bold">رکوردهای بایگانی</h2><p className="mt-1 text-xs text-slate-500">تعداد نتایج: {total.toLocaleString("fa-IR")}</p></div>
        <div className="flex flex-col gap-2 sm:flex-row"><button type="button" onClick={exportExcel} disabled={exportLoading} className="whitespace-nowrap rounded-xl border border-emerald-300 px-4 py-2 text-sm font-semibold text-emerald-700 hover:bg-emerald-50 disabled:opacity-60">{exportLoading ? "در حال تهیه فایل..." : "خروجی اکسل همه رکوردها"}</button><Link href="/dashboard/bayegani/new" className="whitespace-nowrap rounded-xl bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700">+ ثبت رکورد جدید</Link><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="جستجو شماره تسهیلات، شماره مشتری، کد ملی، کد بایگانی..." className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:max-w-md" /><select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} aria-label="تعداد رکورد در هر صفحه" className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value={10}>۱۰ در صفحه</option><option value={20}>۲۰ در صفحه</option><option value={50}>۵۰ در صفحه</option><option value={100}>۱۰۰ در صفحه</option></select></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-right text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr><th className="whitespace-nowrap px-4 py-3 font-semibold">ردیف</th>{sortableHeader("شماره تسهیلات", "facilityNumber")}{sortableHeader("عنوان تسهیلات", "facilityTitle")}{sortableHeader("کد ملی", "nationalId")}{sortableHeader("کدباجه-نام باجه", "counterLabel")}{sortableHeader("کد بایگانی", "archiveCode")}{sortableHeader("تاریخ شروع", "startDate")}{sortableHeader("پایان قرارداد", "endDate")}{sortableHeader("مبلغ مصوب", "approvedAmount")}<th className="whitespace-nowrap px-4 py-3 font-semibold">عملیات</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{records.map((r, index) => <tr key={r.id} className="hover:bg-slate-50">
            <td className="px-4 py-3">{((page - 1) * pageSize + index + 1).toLocaleString("fa-IR")}</td><td className="px-4 py-3" dir="ltr">{r.facilityNumber || "—"}</td><td className="max-w-xs px-4 py-3">{r.facilityTitle || "—"}</td><td className="px-4 py-3" dir="ltr">{r.nationalId || "—"}</td><td className="whitespace-nowrap px-4 py-3">{r.counterLabel || "—"}</td><td className="px-4 py-3">{r.archiveCode || "—"}</td><td className="px-4 py-3">{r.startDate || "—"}</td><td className="px-4 py-3">{r.endDate || "—"}</td><td className="px-4 py-3">{r.approvedAmount || "—"}</td><td className="px-4 py-3"><Link href={`/dashboard/bayegani/${r.id}/edit`} className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-100">ویرایش</Link></td>
          </tr>)}</tbody>
        </table>
        {records.length === 0 && <p className="p-8 text-center text-sm text-slate-500">رکوردی پیدا نشد. ابتدا فایل Excel را بارگذاری کنید یا عبارت جستجو را تغییر دهید.</p>}
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-600">
          صفحه {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}
          {" · "}نمایش {firstRecord.toLocaleString("fa-IR")} تا {lastRecord.toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")} رکورد
          {" · "}{records.length.toLocaleString("fa-IR")} رکورد در این صفحه
        </p>
        <nav aria-label="صفحه‌بندی رکوردهای بایگانی" className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setPage(1)} disabled={page <= 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">اولین</button>
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">قبلی</button>
          {totalPages > 3 && visiblePages[0] > 1 && (
            <button
              type="button"
              onClick={() => setPage(1)}
              aria-label="صفحه اول"
              aria-current={page === 1 ? "page" : undefined}
              className={`min-w-10 rounded-lg border px-3 py-2 text-sm ${page === 1 ? "border-blue-600 bg-blue-600 font-semibold text-white" : "border-slate-300 hover:bg-slate-50"}`}
            >
              ۱
            </button>
          )}
          {showLeadingEllipsis && <span aria-hidden="true" className="px-1 text-slate-500">…</span>}
          {visiblePages.map((pageNumber) => (
            <button
              key={pageNumber}
              type="button"
              aria-current={pageNumber === page ? "page" : undefined}
              onClick={() => setPage(pageNumber)}
              className={`min-w-10 rounded-lg border px-3 py-2 text-sm ${pageNumber === page ? "border-blue-600 bg-blue-600 font-semibold text-white" : "border-slate-300 hover:bg-slate-50"}`}
            >
              {pageNumber.toLocaleString("fa-IR")}
            </button>
          ))}
          {showTrailingEllipsis && <span aria-hidden="true" className="px-1 text-slate-500">…</span>}
          {totalPages > 3 && visiblePages[visiblePages.length - 1] < totalPages && (
            <button
              type="button"
              onClick={() => setPage(totalPages)}
              aria-label="صفحه آخر"
              aria-current={page === totalPages ? "page" : undefined}
              className={`min-w-10 rounded-lg border px-3 py-2 text-sm ${page === totalPages ? "border-blue-600 bg-blue-600 font-semibold text-white" : "border-slate-300 hover:bg-slate-50"}`}
            >
              {totalPages.toLocaleString("fa-IR")}
            </button>
          )}
          <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">بعدی</button>
          <button type="button" onClick={() => setPage(totalPages)} disabled={page >= totalPages} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">آخرین</button>
        </nav>
      </div>
    </section>
  </div>;
}
