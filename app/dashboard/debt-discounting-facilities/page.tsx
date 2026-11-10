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

export default function DebtDiscountingFacilitiesPage() {
  const [records, setRecords] = useState<FacilityRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadRecords() {
    setLoading(true);
    try {
      const response = await fetch("/api/debt-discounting-facilities", { cache: "no-store" });
      const result = await response.json() as ApiResult;
      if (!response.ok || !result.success) throw new Error(result.error || "دریافت اطلاعات ناموفق بود.");
      setRecords(result.records || []);
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
            <p className="mt-1 text-xs text-slate-500">حداکثر ۲۰۰ رکورد آخر نمایش داده می‌شود.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => void syncRecords()} disabled={syncing || loading} className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50">{syncing ? "در حال همگام‌سازی..." : "بروزرسانی از جداول"}</button>
            <button type="button" onClick={() => void loadRecords()} disabled={loading || syncing} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">{loading ? "در حال دریافت..." : "بارگذاری مجدد"}</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1350px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
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
              {records.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-slate-500">{loading ? "در حال دریافت اطلاعات..." : "هنوز تسهیلاتی ثبت نشده است."}</td></tr>
              ) : records.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
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
      </section>
    </div>
  );
}
