"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

type Props = { recordId?: string };
type ApiRecord = {
  id: number;
  sheetName: string;
  sourceRow: number;
  rawData: Record<string, unknown> | null;
};

const initialFields: Record<string, string> = {
  "شماره تسهیلات": "",
  "شماره مشتری": "",
  "کد بایگانی": "",
  "عنوان تسهیلات": "",
  "سریال": "",
  "طبقه": "",
  "نام باجه": "",
  "کد باجه": "",
  "وضعیت کنونی": "",
  "تاریخ شروع": "",
  "پایان قرارداد": "",
  "مدت": "",
  "مبلغ مصوب": "",
  "مانده تسهیلات": "",
  "کد ملی": "",
};

export default function BayeganiRecordForm({ recordId }: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>(initialFields);
  const [loading, setLoading] = useState(Boolean(recordId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!recordId) return;
    let active = true;
    fetch(`/api/bayegani/${recordId}`, { cache: "no-store" })
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.error || "دریافت رکورد ناموفق بود.");
        const record = result.record as ApiRecord;
        const raw = record.rawData && typeof record.rawData === "object" ? record.rawData : {};
        const next: Record<string, string> = { ...initialFields };
        for (const [key, value] of Object.entries(raw)) next[key] = value == null ? "" : String(value);
        if (active) setFields(next);
      })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [recordId]);

  function changeField(key: string, value: string) {
    setFields((current) => {
      const next = { ...current, [key]: value };
      if (key === "شماره تسهیلات" || key === "شماره تسهيلات") {
        const parts = value.trim().split(".");
        const derivedCustomerNumber = parts.length >= 3 ? (parts[2] || "").trim() : "";
        if (derivedCustomerNumber) next["شماره مشتری"] = derivedCustomerNumber;
      }
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSuccess(""); setSaving(true);
    try {
      const response = recordId
        ? await fetch(`/api/bayegani/${recordId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rawData: fields }),
          })
        : await fetch("/api/bayegani/manual", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rawData: fields }),
          });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "ذخیره اطلاعات ناموفق بود.");
      setSuccess("اطلاعات با موفقیت ذخیره شد.");
      if (!recordId && result.record?.id) router.push(`/dashboard/bayegani/${result.record.id}/edit`);
      else router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ذخیره اطلاعات.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div dir="rtl" className="rounded-2xl border bg-white p-8 text-center text-slate-600">در حال دریافت اطلاعات...</div>;

  const entries = Object.entries(fields);
  return (
    <div dir="rtl" className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{recordId ? "ویرایش رکورد بایگانی تسهیلات" : "ثبت رکورد جدید بایگانی تسهیلات"}</h1>
          <p className="mt-2 text-sm text-slate-500">اطلاعات را در فیلدها وارد کنید و سپس ذخیره را بزنید.</p>
        </div>
        <Link href="/dashboard/bayegani" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">بازگشت به فهرست</Link>
      </header>
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {entries.map(([key, value]) => (
            <label key={key} className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">{key}</span>
              <input
                value={value}
                onChange={(event) => changeField(key, event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                placeholder={key}
              />
            </label>
          ))}
        </div>
        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {success && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{success}</p>}
        <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
          <button type="submit" disabled={saving} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? "در حال ذخیره..." : "ذخیره اطلاعات"}</button>
          <Link href="/dashboard/bayegani" className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">انصراف</Link>
        </div>
      </form>
    </div>
  );
}
