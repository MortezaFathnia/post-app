"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Counter = { id: number; code: string; name: string };

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export default function SettingsPage() {
  const [counters, setCounters] = useState<Counter[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  async function loadCounters() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/bayegani/counters", { cache: "no-store" });
      const data: { success?: boolean; counters?: Counter[]; error?: string } = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "دریافت فهرست باجه‌ها ناموفق بود.");
      setCounters(data.counters ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadCounters(); }, []);

  const filteredCounters = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fa");
    if (!term) return counters;
    return counters.filter(({ code: counterCode, name: counterName }) =>
      `${counterCode} ${counterName}`.toLocaleLowerCase("fa").includes(term),
    );
  }, [counters, search]);

  function resetForm() {
    setEditingId(null);
    setCode("");
    setName("");
  }

  function startEdit(counter: Counter) {
    setEditingId(counter.id);
    setCode(counter.code);
    setName(counter.name);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitCounter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const cleanCode = code.trim().replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
    const cleanName = name.trim();
    if (!cleanCode || !cleanName) {
      setError("کد باجه و نام باجه را وارد کنید.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(editingId === null ? "/api/bayegani/counters" : `/api/bayegani/counters/${editingId}`, {
        method: editingId === null ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode, name: cleanName }),
      });
      const data: { success?: boolean; error?: string } = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "ذخیره باجه ناموفق بود.");
      setMessage(editingId === null ? "باجه جدید ثبت شد." : "اطلاعات باجه ویرایش شد.");
      resetForm();
      await loadCounters();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ذخیره اطلاعات.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteCounter(counter: Counter) {
    if (!window.confirm(`باجه «${counter.code}-${counter.name}» از فهرست مرجع حذف شود؟ رکوردهای بایگانی حذف نمی‌شوند.`)) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/bayegani/counters/${counter.id}`, { method: "DELETE" });
      const data: { success?: boolean; error?: string } = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "حذف باجه ناموفق بود.");
      if (editingId === counter.id) resetForm();
      setMessage("باجه از فهرست مرجع حذف شد؛ رکوردهای بایگانی دست‌نخورده باقی ماندند.");
      await loadCounters();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در حذف باجه.");
    }
  }

  return (
    <main dir="rtl" className="space-y-6 p-4 sm:p-6 lg:p-8">
      <div>
        <p className="text-sm font-medium text-blue-600">مدیریت سامانه</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">مدیریت کد و نام باجه</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">افزودن، ویرایش و جست‌وجوی اطلاعات جدول مرجع bajehCode.</p>
      </div>

      <form onSubmit={submitCounter} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">{editingId === null ? "ثبت باجه جدید" : "ویرایش باجه"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">کد باجه</span>
            <input required value={code} onChange={(event) => setCode(event.target.value)} placeholder="مثلاً 64508" className={inputClass} inputMode="numeric" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">نام باجه</span>
            <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="مثلاً دلویی" className={inputClass} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "در حال ذخیره..." : editingId === null ? "ثبت باجه" : "ذخیره تغییرات"}</button>
          {editingId !== null && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200">لغو ویرایش</button>}
        </div>
        {message && <p role="status" className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">فهرست باجه‌ها</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{loading ? "در حال دریافت اطلاعات..." : `تعداد باجه‌ها: ${counters.length.toLocaleString("fa-IR")}`}</p>
          </div>
          <label className="w-full sm:max-w-xs">
            <span className="sr-only">جست‌وجو در فهرست باجه‌ها</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجو بر اساس کد یا نام باجه..." className={inputClass} />
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr><th className="w-20 px-5 py-3 font-bold">ردیف</th><th className="px-5 py-3 font-bold">کد باجه</th><th className="px-5 py-3 font-bold">نام باجه</th><th className="px-5 py-3 font-bold">عملیات</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500"><span className="inline-flex items-center gap-3"><span className="h-5 w-5 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />در حال بارگذاری فهرست باجه‌ها...</span></td></tr>
              : filteredCounters.length === 0 ? <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500 dark:text-slate-400">{search ? "موردی مطابق جست‌وجو پیدا نشد." : "هنوز باجه‌ای ثبت نشده است."}</td></tr>
              : filteredCounters.map((counter, index) => <tr key={counter.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{(index + 1).toLocaleString("fa-IR")}</td>
                <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-100">{counter.code}</td>
                <td className="px-5 py-3.5 text-slate-700 dark:text-slate-200">{counter.name}</td>
                <td className="px-5 py-3.5"><div className="flex gap-2"><button type="button" onClick={() => startEdit(counter)} className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-100">ویرایش</button><button type="button" onClick={() => void deleteCounter(counter)} className="rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-700 hover:bg-red-100">حذف</button></div></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
