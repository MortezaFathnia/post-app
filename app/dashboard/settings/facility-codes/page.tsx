"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type FacilityCode = { id: number; code: string; name: string };

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export default function FacilityCodesPage() {
  const [facilityCodes, setFacilityCodes] = useState<FacilityCode[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  async function loadFacilityCodes() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/facility-codes", { cache: "no-store" });
      const data: { success?: boolean; facilityCodes?: FacilityCode[]; error?: string } = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "دریافت فهرست کد تسهیلات ناموفق بود.");
      setFacilityCodes(data.facilityCodes ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadFacilityCodes(); }, []);

  const filteredFacilityCodes = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("fa");
    if (!term) return facilityCodes;
    return facilityCodes.filter(({ code: facilityCode, name: facilityName }) =>
      `${facilityCode} ${facilityName}`.toLocaleLowerCase("fa").includes(term),
    );
  }, [facilityCodes, search]);

  function resetForm() {
    setEditingId(null);
    setCode("");
    setName("");
  }

  function startEdit(item: FacilityCode) {
    setEditingId(item.id);
    setCode(item.code);
    setName(item.name);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitFacilityCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    const cleanCode = code.trim().replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit))).replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
    const cleanName = name.trim();
    if (!cleanCode || !cleanName) {
      setError("کد تسهیلات و نام تسهیلات را وارد کنید.");
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(editingId === null ? "/api/facility-codes" : `/api/facility-codes/${editingId}`, {
        method: editingId === null ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: cleanCode, name: cleanName }),
      });
      const data: { success?: boolean; error?: string } = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "ذخیره اطلاعات کد تسهیلات ناموفق بود.");
      setMessage(editingId === null ? "کد تسهیلات جدید ثبت شد." : "اطلاعات کد تسهیلات ویرایش شد.");
      resetForm();
      await loadFacilityCodes();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ذخیره اطلاعات.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main dir="rtl" className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-sm font-medium text-blue-600">مدیریت سامانه</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">مدیریت کد و نام تسهیلات</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">افزودن، ویرایش و جست‌وجوی فهرست مرجع کد و نام انواع تسهیلات</p>
      </header>

      <form onSubmit={submitFacilityCode} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-slate-100">{editingId === null ? "ثبت کد تسهیلات جدید" : "ویرایش کد تسهیلات"}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">کد تسهیلات</span>
            <input required value={code} onChange={(event) => setCode(event.target.value)} placeholder="مثلاً 414" className={inputClass} inputMode="numeric" />
          </label>
          <label className="block space-y-2">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">نام تسهیلات</span>
            <input required value={name} onChange={(event) => setName(event.target.value)} placeholder="مثلاً مشارکت مدنی" className={inputClass} />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "در حال ذخیره..." : editingId === null ? "ثبت کد تسهیلات" : "ذخیره تغییرات"}</button>
          {editingId !== null && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200">لغو ویرایش</button>}
        </div>
        {message && <p role="status" className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">فهرست کد و نام تسهیلات</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{loading ? "در حال دریافت اطلاعات..." : `تعداد انواع تسهیلات: ${facilityCodes.length.toLocaleString("fa-IR")}`}</p>
          </div>
          <label className="w-full sm:max-w-xs">
            <span className="sr-only">جست‌وجو در فهرست کد تسهیلات</span>
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجو بر اساس کد یا نام..." className={inputClass} />
          </label>
        </div>
        {error && <p role="alert" className="px-5 py-4 text-sm text-red-600">{error}</p>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr><th className="w-20 px-5 py-3 font-bold">ردیف</th><th className="px-5 py-3 font-bold">کد تسهیلات</th><th className="px-5 py-3 font-bold">نام تسهیلات</th><th className="px-5 py-3 font-bold">عملیات</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500">در حال بارگذاری فهرست...</td></tr>
              : filteredFacilityCodes.length === 0 ? <tr><td colSpan={4} className="px-5 py-12 text-center text-slate-500 dark:text-slate-400">{search ? "موردی مطابق جست‌وجو پیدا نشد." : "هنوز کد تسهیلاتی ثبت نشده است."}</td></tr>
              : filteredFacilityCodes.map((item, index) => <tr key={item.id} className="transition hover:bg-slate-50 dark:hover:bg-slate-800/60">
                <td className="px-5 py-3.5 text-slate-500 dark:text-slate-400">{(index + 1).toLocaleString("fa-IR")}</td>
                <td className="px-5 py-3.5 font-semibold text-slate-800 dark:text-slate-100">{item.code}</td>
                <td className="px-5 py-3.5 text-slate-700 dark:text-slate-200">{item.name}</td>
                <td className="px-5 py-3.5"><button type="button" onClick={() => startEdit(item)} className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-100">ویرایش</button></td>
              </tr>)}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
