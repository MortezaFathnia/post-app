"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type FacilityClassification = { id: number; classification: number; facilityType: string | null; duration: string | null };
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";
const toEnglishDigits = (value: string) => value.replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

export default function FacilityClassificationsPage() {
  const [items, setItems] = useState<FacilityClassification[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [classification, setClassification] = useState("");
  const [facilityType, setFacilityType] = useState("");
  const [duration, setDuration] = useState("");

  async function loadItems() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/facility-classifications", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "دریافت فهرست ناموفق بود.");
      setItems(data.classifications ?? []);
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات."); }
    finally { setLoading(false); }
  }
  useEffect(() => { void loadItems(); }, []);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fa");
    return term ? items.filter(x => `${x.classification} ${x.facilityType ?? ""} ${x.duration ?? ""}`.toLocaleLowerCase("fa").includes(term)) : items;
  }, [items, search]);

  function reset() { setEditingId(null); setClassification(""); setFacilityType(""); setDuration(""); }
  function edit(item: FacilityClassification) {
    setEditingId(item.id); setClassification(String(item.classification)); setFacilityType(item.facilityType ?? ""); setDuration(item.duration ?? "");
    setError(""); setMessage(""); window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage("");
    const code = toEnglishDigits(classification.trim());
    if (!/^\d+$/.test(code)) { setError("طبقه باید یک عدد صحیح باشد."); return; }
    setSaving(true);
    try {
      const response = await fetch(editingId === null ? "/api/facility-classifications" : `/api/facility-classifications/${editingId}`, {
        method: editingId === null ? "POST" : "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classification: code, facilityType, duration }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "ذخیره اطلاعات ناموفق بود.");
      setMessage(editingId === null ? "طبقه جدید ثبت شد." : "اطلاعات طبقه ویرایش شد."); reset(); await loadItems();
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در ذخیره اطلاعات."); }
    finally { setSaving(false); }
  }

  async function remove(item: FacilityClassification) {
    if (!window.confirm(`طبقه «${item.classification}» حذف شود؟`)) return;
    setError(""); setMessage("");
    try {
      const response = await fetch(`/api/facility-classifications/${item.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "حذف ناموفق بود.");
      if (editingId === item.id) reset();
      setMessage("رکورد حذف شد."); await loadItems();
    } catch (e) { setError(e instanceof Error ? e.message : "خطا در حذف اطلاعات."); }
  }

  return (
    <main dir="rtl" className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-sm font-medium text-blue-600">مدیریت سامانه</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">طبقه‌بندی تسهیلات</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">مدیریت فهرست مرجع طبقه، نوع تسهیلات و مدت</p>
      </header>
      <form onSubmit={submit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">{editingId === null ? "ثبت طبقه جدید" : "ویرایش طبقه"}</h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-300">طبقه</span><input required inputMode="numeric" value={classification} onChange={e => setClassification(e.target.value)} placeholder="مثلاً 10" className={inputClass} /></label>
          <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-300">نوع تسهیلات</span><input value={facilityType} onChange={e => setFacilityType(e.target.value)} placeholder="مثلاً ضمان" className={inputClass} /></label>
          <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700 dark:text-slate-300">مدت</span><input value={duration} onChange={e => setDuration(e.target.value)} placeholder="مثلاً 1-12" className={inputClass} /></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "در حال ذخیره..." : editingId === null ? "ثبت طبقه" : "ذخیره تغییرات"}</button>
          {editingId !== null && <button type="button" onClick={reset} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:border-slate-600 dark:text-slate-200">لغو ویرایش</button>}
        </div>
        {message && <p role="status" className="mt-4 text-sm text-emerald-700">{message}</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-600">{error}</p>}
      </form>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <div><h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">فهرست طبقه‌بندی تسهیلات</h2><p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{loading ? "در حال دریافت اطلاعات..." : `تعداد رکوردها: ${items.length.toLocaleString("fa-IR")}`}</p></div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="جست‌وجو بر اساس طبقه، نوع یا مدت..." className={inputClass + " sm:max-w-xs"} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300"><tr><th className="w-20 px-5 py-3">ردیف</th><th className="px-5 py-3">طبقه</th><th className="px-5 py-3">نوع تسهیلات</th><th className="px-5 py-3">مدت</th><th className="px-5 py-3">عملیات</th></tr></thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">در حال بارگذاری...</td></tr>
              : filtered.length === 0 ? <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-500">{search ? "موردی پیدا نشد." : "رکوردی ثبت نشده است."}</td></tr>
              : filtered.map((item, index) => <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60"><td className="px-5 py-3.5 text-slate-500">{(index + 1).toLocaleString("fa-IR")}</td><td className="px-5 py-3.5 font-semibold text-slate-900 dark:text-slate-100">{item.classification}</td><td className="px-5 py-3.5 text-slate-700 dark:text-slate-200">{item.facilityType || "—"}</td><td className="px-5 py-3.5 text-slate-700 dark:text-slate-200">{item.duration || "—"}</td><td className="px-5 py-3.5"><div className="flex gap-2"><button type="button" onClick={() => edit(item)} className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-100">ویرایش</button><button type="button" onClick={() => void remove(item)} className="rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-700 hover:bg-red-100">حذف</button></div></td></tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
