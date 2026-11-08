"use client";

import { useEffect, useState } from "react";

type UploadedRecord = {
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
  bankAgent: string | null;
  checkBranch: string | null;
  administrativeNumber: string | null;
  sourceFile: string | null;
  sourceRow: number;
};

type ApiResult = {
  success: boolean;
  error?: string;
  records?: UploadedRecord[];
  total?: number;
};

const columns: { key: keyof UploadedRecord; label: string }[] = [
  { key: "counterLabel", label: "کدباجه - نام باجه" },
  { key: "facilityNumber", label: "کد تسهیلات خرید دین" },
  { key: "customerNumber", label: "شماره مشتری" },
  { key: "checkNumber", label: "شماره چک" },
  { key: "paidAmount", label: "مبلغ چک" },
  { key: "administrativeNumber", label: "شماره انتظامی" },
  { key: "dueDate", label: "تاریخ سررسید" },
  { key: "bankAgent", label: "بانک عامل" },
  { key: "checkBranch", label: "شعبه چک" },
  { key: "domesticForeign", label: "چک داخلی یا خارجی" },
  { key: "checkStatus", label: "وضعیت چک" },
];

export default function UploadedDebtDocumentsPage() {
  const [records, setRecords] = useState<UploadedRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({
          page: String(page),
          pageSize: "100",
          uploadedOnly: "true",
          sortBy: "createdAt",
          sortOrder: "asc",
        });
        const response = await fetch(`/api/debt-documents/upload?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });
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
    void load();
    return () => controller.abort();
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / 100));

  return (
    <div dir="rtl" className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">فهرست اسناد جدید خرید دین بارگذاری شده</h1>
        <p className="mt-2 text-sm text-slate-500">
          فقط رکوردهایی نمایش داده می‌شوند که از فایل Excel و Sheet «چک ها» وارد سامانه شده‌اند.
        </p>
      </header>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5 text-sm text-slate-600">
          تعداد کل اسناد بارگذاری‌شده: <strong className="text-slate-900">{total.toLocaleString("fa-IR")}</strong>
        </div>
        {error && <p className="m-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">در حال دریافت اطلاعات...</div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">هنوز سندی از فایل Excel بارگذاری نشده است.</div>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[1250px] text-right text-sm">
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-600">
                <tr>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">ردیف</th>
                  {columns.map((column) => (
                    <th key={column.key} className="whitespace-nowrap px-4 py-3 font-semibold">{column.label}</th>
                  ))}
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">نام فایل Excel</th>
                  <th className="whitespace-nowrap px-4 py-3 font-semibold">ردیف فایل</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    <td className="whitespace-nowrap px-4 py-3">{((page - 1) * 100 + index + 1).toLocaleString("fa-IR")}</td>
                    {columns.map((column) => (
                      <td key={column.key} className="whitespace-nowrap px-4 py-3">{String(record[column.key] ?? "—")}</td>
                    ))}
                    <td className="whitespace-nowrap px-4 py-3">{record.sourceFile ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{record.sourceRow.toLocaleString("fa-IR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="flex items-center justify-between border-t border-slate-100 p-4 text-sm">
          <span className="text-slate-600">صفحه {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}</span>
          <div className="flex gap-2">
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1 || loading} className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40">قبلی</button>
            <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages || loading} className="rounded-lg border border-slate-300 px-4 py-2 disabled:opacity-40">بعدی</button>
          </div>
        </div>
      </section>
    </div>
  );
}
