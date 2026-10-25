"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function EditBayeganiRecordPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [rawText, setRawText] = useState("");
  const [sheetName, setSheetName] = useState("");
  const [sourceRow, setSourceRow] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let active = true;
    fetch(`/api/bayegani/${params.id}`, { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.error || "رکورد پیدا نشد.");
        if (!active) return;
        setRawText(JSON.stringify(result.record.rawData, null, 2));
        setSheetName(result.record.sheetName);
        setSourceRow(result.record.sourceRow);
      })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "خطا در دریافت رکورد"); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [params.id]);

  async function save() {
    setError(""); setSuccess("");
    let rawData: unknown;
    try {
      rawData = JSON.parse(rawText);
      if (!rawData || typeof rawData !== "object" || Array.isArray(rawData)) throw new Error("ساختار JSON باید یک شیء باشد.");
    } catch (e) {
      setError(e instanceof Error ? `JSON نامعتبر است: ${e.message}` : "JSON نامعتبر است.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/bayegani/${params.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rawData }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.error || "ذخیره تغییرات ناموفق بود.");
      setSuccess("تغییرات با موفقیت در پایگاه داده ذخیره شد.");
      setRawText(JSON.stringify(result.record.rawData, null, 2));
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره تغییرات ناموفق بود.");
    } finally { setSaving(false); }
  }

  return <div dir="rtl" className="mx-auto max-w-5xl space-y-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold text-slate-900">ویرایش رکورد بایگانی</h1><p className="mt-2 text-sm text-slate-500">Sheet: {sheetName || "—"} · ردیف اصلی Excel: {sourceRow ?? "—"}</p></div>
      <Link href="/dashboard/bayegani" className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">بازگشت به بایگانی</Link>
    </div>
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
      تمام فیلدهای اصلی این ردیف در قالب JSON نمایش داده شده‌اند تا هیچ‌یک از ستون‌های فارسی فایل حذف نشود. برای ویرایش، مقدار روبه‌روی نام ستون را تغییر دهید و JSON معتبر را نگه دارید.
    </div>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      {loading ? <p className="py-12 text-center text-slate-500">در حال دریافت اطلاعات...</p> : <>
        <label htmlFor="rawData" className="mb-2 block text-sm font-bold text-slate-700">اطلاعات کامل ردیف (JSON)</label>
        <textarea id="rawData" value={rawText} onChange={(e) => setRawText(e.target.value)} spellCheck={false} className="min-h-[60vh] w-full rounded-xl border border-slate-300 bg-slate-950 p-4 font-mono text-sm leading-6 text-emerald-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        {error && <p className="mt-3 whitespace-pre-wrap text-sm text-red-600">{error}</p>}
        {success && <p className="mt-3 text-sm text-emerald-700">{success}</p>}
        <div className="mt-4 flex flex-wrap gap-3">
          <button onClick={save} disabled={saving} className="rounded-xl bg-blue-600 px-6 py-3 font-semibold text-white disabled:opacity-60">{saving ? "در حال ذخیره..." : "ذخیره تغییرات در DB"}</button>
          <button onClick={() => router.push("/dashboard/bayegani")} className="rounded-xl border border-slate-300 px-5 py-3 font-semibold text-slate-700">انصراف</button>
        </div>
      </>}
    </section>
  </div>;
}
