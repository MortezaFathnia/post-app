"use client";

import { useEffect, useState } from "react";

type ContractOption = {
  id: number;
  facilityNumber: string | null;
  facilityTitle: string | null;
  customerNumber: string | null;
};

type FacilityRecord = {
  id: number;
  contractId: number;
  facilityNumber: string | null;
  facilityTitle: string | null;
  counterLabel: string | null;
  serial: string | null;
  status: string;
  startDate: string;
  endDate: string;
  contract: ContractOption;
};

type ApiResult = {
  success: boolean;
  error?: string;
  records?: FacilityRecord[];
};

function normalizeDigits(value: string) {
  return value.replace(/[۰-۹٠-٩]/g, (digit) => {
    const persianIndex = "۰۱۲۳۴۵۶۷۸۹".indexOf(digit);
    return String(persianIndex >= 0 ? persianIndex : "٠١٢٣٤٥٦٧٨٩".indexOf(digit));
  });
}

export default function DebtDiscountingFacilitiesPage() {
  const [records, setRecords] = useState<FacilityRecord[]>([]);
  const [search,setSearch]=useState("");
  const [filterType,setFilterType]=useState("facilityNumber");
  const [filterValue,setFilterValue]=useState("");
  const [page,setPage]=useState(1);
  const [pageSize,setPageSize]=useState(20);

  const filteredRecords = records.filter((record) => {
    const values = [
      record.id,
      record.contractId,
      record.facilityTitle,
      record.contract?.facilityTitle,
      record.facilityNumber,
      record.contract?.facilityNumber,
      record.counterLabel,
      record.serial,
      record.status,
      record.startDate,
      record.endDate,
    ].map((value) => normalizeDigits(String(value ?? "")).toLocaleLowerCase());

    const normalizedSearch = normalizeDigits(search.trim()).toLocaleLowerCase();
    const searchMatches = !normalizedSearch || values.some((value) => value.includes(normalizedSearch));

    const filterMap: Record<string, string> = {
      facilityTitle: record.facilityTitle || record.contract?.facilityTitle || "",
      facilityNumber: record.facilityNumber || record.contract?.facilityNumber || "",
      contractId: String(record.contractId),
      counterLabel: record.counterLabel || "",
      serial: record.serial || "",
      status: record.status || "",
      startDate: record.startDate || "",
      endDate: record.endDate || "",
    };
    const normalizedFilter = normalizeDigits(filterValue.trim()).toLocaleLowerCase();
    const filterSource = normalizeDigits(filterMap[filterType] || "").toLocaleLowerCase();
    const filterMatches = !normalizedFilter || (filterType === "contractId"
      ? filterSource === normalizedFilter
      : filterSource.includes(normalizedFilter));

    return searchMatches && filterMatches;
  });

  const total = filteredRecords.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRecords = filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  const firstRecord = total ? (currentPage - 1) * pageSize + 1 : 0;
  const lastRecord = Math.min(currentPage * pageSize, total);
  const visiblePages = Array.from(
    { length: Math.min(3, totalPages) },
    (_, i) => Math.max(1, Math.min(currentPage - 1, totalPages - 2)) + i
  );
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadRecords() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/debt-discounting-facilities", { cache: "no-store" });
      const result = await response.json() as ApiResult;
      if (!response.ok || !result.success) throw new Error(result.error || "دریافت اطلاعات ناموفق بود.");
      setRecords(result.records || []);
      setPage(1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadRecords();
  }, []);

  async function syncRecords() {
    setError("");
    setMessage("");
    setSyncing(true);
    try {
      const response = await fetch("/api/debt-discounting-facilities/sync", { method: "POST" });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "همگام‌سازی اطلاعات ناموفق بود.");
      setMessage(`همگام‌سازی انجام شد؛ ${result.created} رکورد جدید، ${result.updated} بروزرسانی و ${result.skipped} مورد رد شد.`);
      setPage(1);
      await loadRecords();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در همگام‌سازی اطلاعات");
    } finally {
      setSyncing(false);
    }
  }

  async function updateStatus(id: number, nextStatus: string) {
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/debt-discounting-facilities", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: nextStatus }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "تغییر وضعیت ناموفق بود.");
      setRecords((current) => current.map((record) =>
        record.id === id ? { ...record, status: nextStatus } : record
      ));
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در تغییر وضعیت");
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">تسهیلات خرید دین</h1>
        <p className="mt-2 text-sm text-slate-500">اطلاعات تسهیلات از جداول بایگانی و اسناد خرید دین دریافت می‌شود.</p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {message && <p className="border-b border-slate-100 px-5 py-3 text-sm text-emerald-700">{message}</p>}
        {error && <p className="border-b border-slate-100 px-5 py-3 text-sm text-red-600">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-5">
          <div>
            <h2 className="font-bold text-slate-900">فهرست تسهیلات خرید دین</h2>
            <p className="mt-1 text-xs text-slate-500">تمام رکوردها دریافت می‌شوند؛ جستجو، فیلتر و صفحه‌بندی در مرورگر انجام می‌شود.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void syncRecords()} disabled={syncing || loading} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{syncing ? "در حال همگام‌سازی..." : "بروزرسانی از جداول"}</button>
            <button type="button" onClick={() => void loadRecords()} disabled={loading || syncing} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">{loading ? "در حال دریافت..." : "بارگذاری مجدد"}</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-slate-100 p-4">
          <input value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}} placeholder="جستجوی عمومی..." className="min-w-48 flex-1 rounded-xl border px-3 py-2 text-sm" />
          <select value={filterType} onChange={e=>{setFilterType(e.target.value);setPage(1);}} className="rounded-xl border bg-white px-3 py-2 text-sm">
            <option value="facilityTitle">عنوان تسهیلات</option><option value="facilityNumber">شماره تسهیلات</option><option value="contractId">شناسه قرارداد</option><option value="counterLabel">کد باجه - نام باجه</option><option value="serial">سریال</option><option value="status">وضعیت</option><option value="startDate">تاریخ شروع</option><option value="endDate">تاریخ پایان</option>
          </select>
          <input value={filterValue} onChange={e=>{setFilterValue(e.target.value);setPage(1);}} placeholder="مقدار فیلتر..." className="min-w-40 flex-1 rounded-xl border px-3 py-2 text-sm" />
          <button onClick={()=>{setSearch("");setFilterValue("");setPage(1);}} className="rounded-xl border px-4 py-2 text-sm">پاک کردن</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1350px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">ردیف</th>
                <th className="px-4 py-3 font-semibold">شناسه</th>
                <th className="px-4 py-3 font-semibold">عنوان تسهیلات</th>
                <th className="px-4 py-3 font-semibold">شماره تسهیلات</th>
                <th className="px-4 py-3 font-semibold">شناسه قرارداد</th>
                <th className="px-4 py-3 font-semibold">کد باجه - نام باجه</th>
                <th className="px-4 py-3 font-semibold">سریال</th>
                <th className="px-4 py-3 font-semibold">وضعیت</th>
                <th className="px-4 py-3 font-semibold">تاریخ شروع</th>
                <th className="px-4 py-3 font-semibold">تاریخ پایان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRecords.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-slate-500">{loading ? "در حال دریافت اطلاعات..." : "هنوز تسهیلاتی ثبت نشده است."}</td></tr>
              ) : pageRecords.map((record, index) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{(firstRecord+index).toLocaleString("fa-IR")}</td>
                  <td className="px-4 py-3">{record.id.toLocaleString("fa-IR")}</td>
                  <td className="px-4 py-3">{record.facilityTitle || record.contract.facilityTitle || "—"}</td>
                  <td className="px-4 py-3" dir="ltr">{record.facilityNumber || record.contract.facilityNumber || "—"}</td>
                  <td className="px-4 py-3">{record.contractId.toLocaleString("fa-IR")}</td>
                  <td className="px-4 py-3">{record.counterLabel || "—"}</td>
                  <td className="px-4 py-3" dir="ltr">{record.serial || "—"}</td>
                  <td className="px-4 py-3">
                    <select aria-label={`وضعیت تسهیلات ${record.id}`} value={record.status} onChange={(e) => void updateStatus(record.id, e.target.value)} className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm">
                      <option value="فعال">فعال</option>
                      <option value="تسویه شده">تسویه شده</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">{record.startDate}</td>
                  <td className="px-4 py-3">{record.endDate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <button onClick={()=>setPage(1)} disabled={currentPage===1} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">اولین</button>
            <button onClick={()=>setPage(Math.max(1,currentPage-1))} disabled={currentPage===1} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">قبلی</button>
            {visiblePages.map(n=><button key={n} onClick={()=>setPage(n)} className={`rounded-lg border px-3 py-2 text-sm ${n===currentPage?"bg-blue-600 text-white":""}`}>{n.toLocaleString("fa-IR")}</button>)}
            <button onClick={()=>setPage(Math.min(totalPages,currentPage+1))} disabled={currentPage===totalPages} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">بعدی</button>
            <button onClick={()=>setPage(totalPages)} disabled={currentPage===totalPages} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-40">آخرین</button>
            <select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1);}} className="rounded-lg border px-3 py-2 text-sm"><option value={10}>۱۰ در صفحه</option><option value={20}>۲۰ در صفحه</option><option value={50}>۵۰ در صفحه</option><option value={100}>۱۰۰ در صفحه</option></select>
          </div>
          <div className="text-sm text-slate-600">تعداد کل: {total.toLocaleString("fa-IR")} | نمایش {firstRecord.toLocaleString("fa-IR")} تا {lastRecord.toLocaleString("fa-IR")}</div>
        </div>
      </section>
    </div>
  );
}
