"use client";

import { FormEvent, useEffect, useState } from "react";

type CustomerOption = {
  id: number;
  type: string;
  name: string | null;
  companyName: string | null;
  nationalCode: string | null;
};

type ContractOption = {
  id: number;
  facilityNumber: string | null;
  facilityTitle: string | null;
  customerNumber: string | null;
};

type FacilityRecord = {
  id: number;
  customerId: number;
  contractId: number;
  status: string;
  startDate: string;
  endDate: string;
  customer: CustomerOption;
  contract: ContractOption;
};

type ApiResult = {
  success: boolean;
  error?: string;
  records?: FacilityRecord[];
  customers?: CustomerOption[];
  contracts?: ContractOption[];
};

function customerTitle(customer: CustomerOption) {
  return (customer.type === "COMPANY" ? customer.companyName : customer.name) ||
    customer.nationalCode || `مشتری ${customer.id}`;
}

export default function DebtDiscountingFacilitiesPage() {
  const [records, setRecords] = useState<FacilityRecord[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [contracts, setContracts] = useState<ContractOption[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [contractSearch, setContractSearch] = useState("");
  const [customerId, setCustomerId] = useState("");
  const [contractId, setContractId] = useState("");
  const [status, setStatus] = useState("فعال");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadRecords() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ customerSearch, contractSearch });
      const response = await fetch(`/api/debt-discounting-facilities?${params}`, { cache: "no-store" });
      const result = await response.json() as ApiResult;
      if (!response.ok || !result.success) throw new Error(result.error || "دریافت اطلاعات ناموفق بود.");
      setRecords(result.records || []);
      setCustomers(result.customers || []);
      setContracts(result.contracts || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => { void loadRecords(); }, 250);
    return () => window.clearTimeout(timer);
  }, [customerSearch, contractSearch]);

  async function createRecord(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);
    try {
      const response = await fetch("/api/debt-discounting-facilities", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, contractId, status, startDate, endDate }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "ثبت اطلاعات ناموفق بود.");
      setMessage("تسهیلات خرید دین با موفقیت ثبت شد.");
      setCustomerId("");
      setContractId("");
      setStatus("فعال");
      setStartDate("");
      setEndDate("");
      await loadRecords();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ثبت اطلاعات");
    } finally {
      setSaving(false);
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
        <p className="mt-2 text-sm text-slate-500">ثبت و مدیریت تسهیلات مرتبط با مشتری و رکوردهای بایگانی تسهیلات</p>
      </header>

      <form onSubmit={createRecord} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">ثبت تسهیلات جدید</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label htmlFor="customer-search" className="block text-sm font-medium text-slate-700">جستجوی مشتری</label>
            <input id="customer-search" value={customerSearch} onChange={(e) => setCustomerSearch(e.target.value)} placeholder="نام، نام شرکت، کد ملی یا موبایل" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <select required value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
              <option value="">انتخاب مشتری</option>
              {customers.map((customer) => <option key={customer.id} value={customer.id}>{customerTitle(customer)} — شناسه {customer.id}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="contract-search" className="block text-sm font-medium text-slate-700">جستجوی رکورد بایگانی تسهیلات</label>
            <input id="contract-search" value={contractSearch} onChange={(e) => setContractSearch(e.target.value)} placeholder="شماره تسهیلات، عنوان، شماره مشتری یا سریال" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
            <select required value={contractId} onChange={(e) => setContractId(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
              <option value="">انتخاب رکورد بایگانی</option>
              {contracts.map((contract) => <option key={contract.id} value={contract.id}>شناسه {contract.id} — {contract.facilityNumber || "بدون شماره"} — {contract.facilityTitle || "بدون عنوان"}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="facility-status" className="block text-sm font-medium text-slate-700">وضعیت</label>
            <select id="facility-status" value={status} onChange={(e) => setStatus(e.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm">
              <option value="فعال">فعال</option>
              <option value="تسویه شده">تسویه شده</option>
            </select>
          </div>
          <div className="space-y-2">
            <label htmlFor="facility-start-date" className="block text-sm font-medium text-slate-700">تاریخ شروع</label>
            <input id="facility-start-date" required value={startDate} onChange={(e) => setStartDate(e.target.value)} placeholder="مثلاً ۱۴۰۵/۰۱/۰۱" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </div>
          <div className="space-y-2">
            <label htmlFor="facility-end-date" className="block text-sm font-medium text-slate-700">تاریخ پایان</label>
            <input id="facility-end-date" required value={endDate} onChange={(e) => setEndDate(e.target.value)} placeholder="مثلاً ۱۴۰۶/۰۱/۰۱" className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm" />
          </div>
        </div>
        <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">
          {saving ? "در حال ثبت..." : "ثبت تسهیلات خرید دین"}
        </button>
        {message && <p className="text-sm text-emerald-700">{message}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 p-5">
          <div>
            <h2 className="font-bold text-slate-900">فهرست تسهیلات خرید دین</h2>
            <p className="mt-1 text-xs text-slate-500">حداکثر ۲۰۰ رکورد آخر نمایش داده می‌شود.</p>
          </div>
          <button type="button" onClick={() => void loadRecords()} disabled={loading} className="rounded-lg border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50">{loading ? "در حال دریافت..." : "بروزرسانی"}</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">شناسه</th>
                <th className="px-4 py-3 font-semibold">مشتری</th>
                <th className="px-4 py-3 font-semibold">شماره تسهیلات بایگانی</th>
                <th className="px-4 py-3 font-semibold">شناسه قرارداد / بایگانی</th>
                <th className="px-4 py-3 font-semibold">وضعیت</th>
                <th className="px-4 py-3 font-semibold">تاریخ شروع</th>
                <th className="px-4 py-3 font-semibold">تاریخ پایان</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {records.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-slate-500">{loading ? "در حال دریافت اطلاعات..." : "هنوز تسهیلاتی ثبت نشده است."}</td></tr>
              ) : records.map((record) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">{record.id.toLocaleString("fa-IR")}</td>
                  <td className="px-4 py-3">{customerTitle(record.customer)}</td>
                  <td className="px-4 py-3" dir="ltr">{record.contract.facilityNumber || "—"}</td>
                  <td className="px-4 py-3">{record.contractId.toLocaleString("fa-IR")}</td>
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
