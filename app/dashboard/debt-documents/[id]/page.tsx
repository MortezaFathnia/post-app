"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

type DebtCheck = {
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
  checkBranch: string | null;
  description: string | null;
  administrativeNumber: string | null;
  sourceFile: string | null;
  sheetName: string | null;
  sourceRow: number | null;
  rawData: Record<string, unknown> | null;
};

const fields: { key: keyof DebtCheck; label: string }[] = [
  { key: "counterLabel", label: "کدباجه - نام باجه" },
  { key: "facilityNumber", label: "شماره تسهیلات" },
  { key: "customerNumber", label: "شماره مشتری" },
  { key: "serial", label: "سریال سفته / چک" },
  { key: "checkNumber", label: "شماره چک" },
  { key: "administrativeNumber", label: "شماره انتظامی" },
  { key: "checkStatus", label: "وضعیت چک" },
  { key: "dueDate", label: "تاریخ سررسید" },
  { key: "paidAmount", label: "مبلغ پرداخت‌شده / مبلغ چک" },
  { key: "unpaidAmount", label: "مبلغ پرداخت‌نشده" },
  { key: "embeddedProfit", label: "سود / کارمزد مستتر" },
  { key: "delayDays", label: "مدت تأخیر (روز)" },
  { key: "delayPenalty", label: "جریمه تأخیر" },
  { key: "bankAgent", label: "بانک عامل" },
  { key: "checkBranch", label: "شعبه چک" },
  { key: "domesticForeign", label: "چک داخلی یا خارجی" },
  { key: "description", label: "توضیحات" },
  { key: "sourceFile", label: "فایل مبدأ" },
  { key: "sheetName", label: "نام شیت" },
  { key: "sourceRow", label: "ردیف در فایل" },
];

export default function DebtDocumentCheckDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<DebtCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(`/api/debt-documents/upload?recordId=${encodeURIComponent(id)}`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok || !result.success || !result.record) throw new Error(result.error || "دریافت جزئیات چک ناموفق بود.");
        setRecord(result.record as DebtCheck);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") return;
        setError(loadError instanceof Error ? loadError.message : "خطا در دریافت جزئیات چک.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [id]);

  return (
    <main dir="rtl" className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">جزئیات چک</h1>
          <p className="mt-1 text-sm text-slate-500">مشاهده کامل اطلاعات ثبت‌شده برای این سند</p>
        </div>
        <Link href="/dashboard/debt-documents" className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">بازگشت به فهرست اسناد</Link>
      </header>
      {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">در حال دریافت جزئیات...</div> : error ? <p className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p> : record ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-bold text-slate-900">اطلاعات سند شماره {record.id.toLocaleString("fa-IR")}</h2>
            <p className="mt-1 text-sm text-slate-500">{record.facilityNumber || "—"} · {record.serial || record.checkNumber || "—"}</p>
          </div>
          <dl className="grid gap-px bg-slate-100 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((field) => {
              const value = record[field.key];
              const display = field.key === "checkStatus" && value === "نقدشده" ? "نقد شده" : value == null || value === "" ? "—" : String(value);
              return <div key={field.key} className="bg-white p-4"><dt className="text-xs font-medium text-slate-500">{field.label}</dt><dd className="mt-2 break-words text-sm font-semibold text-slate-800">{display}</dd></div>;
            })}
          </dl>
          {record.rawData && <details className="border-t border-slate-100 p-5"><summary className="cursor-pointer text-sm font-semibold text-slate-700">اطلاعات خام فایل مبدأ</summary><pre dir="ltr" className="mt-3 overflow-x-auto rounded-xl bg-slate-50 p-4 text-xs text-slate-700">{JSON.stringify(record.rawData, null, 2)}</pre></details>}
        </section>
      ) : null}
    </main>
  );
}
