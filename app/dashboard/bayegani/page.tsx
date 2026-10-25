"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";

type RecordItem = {
  id: number; sheetName: string; sourceRow: number; facilityNumber: string | null;
  customerNumber: string | null; archiveCode: string | null; facilityTitle: string | null;
  serial: string | null; classification: string | null; status: string | null;
  startDate: string | null; endDate: string | null; approvedAmount: string | null;
  remainingAmount: string | null; nationalId: string | null;
};

export default function BayeganiPage() {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [total, setTotal] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function loadRecords() {
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
      search,
    });
    const response = await fetch(`/api/bayegani?${params.toString()}`, { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.error || "دریافت اطلاعات ناموفق بود.");
    setRecords(result.records);
    setTotal(result.total);
  }

  useEffect(() => {
    loadRecords().catch((e: unknown) => setError(e instanceof Error ? e.message : "خطا"));
  }, [page, pageSize, search]);

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
        <div className="flex flex-col gap-2 sm:flex-row"><Link href="/dashboard/bayegani/new" className="whitespace-nowrap rounded-xl bg-blue-600 px-4 py-2 text-center text-sm font-semibold text-white hover:bg-blue-700">+ ثبت رکورد جدید</Link><input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="جستجو شماره تسهیلات، مشتری، کد بایگانی..." className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm sm:max-w-md" /><select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }} aria-label="تعداد رکورد در هر صفحه" className="rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value={10}>۱۰ در صفحه</option><option value={20}>۲۰ در صفحه</option><option value={50}>۵۰ در صفحه</option><option value={100}>۱۰۰ در صفحه</option></select></div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] text-right text-sm">
          <thead className="bg-slate-50 text-slate-600"><tr>{["Sheet / ردیف","شماره تسهیلات","عنوان تسهیلات","شماره مشتری","کد بایگانی","تاریخ شروع","پایان قرارداد","مبلغ مصوب","عملیات"].map((h) => <th key={h} className="whitespace-nowrap px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-slate-100">{records.map((r) => <tr key={r.id} className="hover:bg-slate-50">
            <td className="px-4 py-3">{r.sheetName} / {r.sourceRow.toLocaleString("fa-IR")}</td><td className="px-4 py-3" dir="ltr">{r.facilityNumber || "—"}</td><td className="max-w-xs px-4 py-3">{r.facilityTitle || "—"}</td><td className="px-4 py-3">{r.customerNumber || "—"}</td><td className="px-4 py-3">{r.archiveCode || "—"}</td><td className="px-4 py-3">{r.startDate || "—"}</td><td className="px-4 py-3">{r.endDate || "—"}</td><td className="px-4 py-3">{r.approvedAmount || "—"}</td><td className="px-4 py-3"><Link href={`/dashboard/bayegani/${r.id}/edit`} className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-100">ویرایش</Link></td>
          </tr>)}</tbody>
        </table>
        {records.length === 0 && <p className="p-8 text-center text-sm text-slate-500">رکوردی پیدا نشد. ابتدا فایل Excel را بارگذاری کنید یا عبارت جستجو را تغییر دهید.</p>}
      </div>
      <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-slate-500">
          صفحه {page.toLocaleString("fa-IR")} از {Math.max(1, Math.ceil(total / pageSize)).toLocaleString("fa-IR")}
          {" · "}نمایش {records.length.toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")} رکورد
        </p>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setPage(1)} disabled={page <= 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">اولین</button>
          <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">قبلی</button>
          <button type="button" onClick={() => setPage((current) => Math.min(Math.max(1, Math.ceil(total / pageSize)), current + 1))} disabled={page >= Math.max(1, Math.ceil(total / pageSize))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">بعدی</button>
          <button type="button" onClick={() => setPage(Math.max(1, Math.ceil(total / pageSize)))} disabled={page >= Math.max(1, Math.ceil(total / pageSize))} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-40">آخرین</button>
        </div>
      </div>
    </section>
  </div>;
}
