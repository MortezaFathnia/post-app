"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type CounterDetails = {
  id: number;
  counterName: string | null;
  counterCode: string | null;
  brokerName: string | null;
  brokerCustomerCode: string | null;
  bankRepresentative: string | null;
};
type FormValues = Omit<CounterDetails, "id">;

const fields: { key: keyof FormValues; label: string }[] = [
  { key: "counterName", label: "نام باجه" },
  { key: "counterCode", label: "کد باجه" },
  { key: "brokerName", label: "نام کارگزار" },
  { key: "brokerCustomerCode", label: "کد مشتری کارگزار" },
  { key: "bankRepresentative", label: "نماینده بانک" },
];
const emptyForm: FormValues = {
  counterName: "", counterCode: "", brokerName: "", brokerCustomerCode: "", bankRepresentative: "",
};
const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100";

export default function CounterDetailsSettingsPage() {
  const [records, setRecords] = useState<CounterDetails[]>([]);
  const [values, setValues] = useState<FormValues>(emptyForm);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadRecords = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/counter-details", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "دریافت اطلاعات باجه ناموفق بود.");
      setRecords(data.records ?? []);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در دریافت اطلاعات.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  function resetForm() {
    setValues(emptyForm);
    setEditingId(null);
    setMessage("");
    setError("");
  }

  function startEdit(record: CounterDetails) {
    const nextValues = { ...emptyForm };
    for (const field of fields) nextValues[field.key] = record[field.key] ?? "";
    setValues(nextValues);
    setEditingId(record.id);
    setMessage("");
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submitForm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/counter-details", {
        method: editingId === null ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId === null ? values : { id: editingId, ...values }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "ذخیره اطلاعات ناموفق بود.");
      setMessage(editingId === null ? "اطلاعات باجه ثبت شد." : "تغییرات با موفقیت ذخیره شد.");
      resetForm();
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در ذخیره اطلاعات.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(record: CounterDetails) {
    if (!window.confirm(`آیا از حذف اطلاعات «${record.counterName || record.counterCode || record.id}» مطمئن هستید؟`)) return;
    setError("");
    setMessage("");
    try {
      const response = await fetch(`/api/counter-details?id=${record.id}`, { method: "DELETE" });
      const data = await response.json();
      if (!response.ok || !data.success) throw new Error(data.error || "حذف اطلاعات ناموفق بود.");
      if (editingId === record.id) resetForm();
      setMessage("رکورد انتخاب‌شده حذف شد.");
      await loadRecords();
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطا در حذف اطلاعات.");
    }
  }

  const normalizedSearch = search.trim().toLocaleLowerCase("fa");
  const filteredRecords = records.filter((record) =>
    fields.map(({ key }) => record[key] ?? "").join(" ").toLocaleLowerCase("fa").includes(normalizedSearch),
  );

  return (
    <main dir="rtl" className="space-y-6 p-4 sm:p-6 lg:p-8">
      <header>
        <p className="text-sm font-medium text-blue-600">مدیریت سامانه</p>
        <h1 className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-slate-100">مدیریت اطلاعات باجه</h1>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">اطلاعات باجه، کارگزار و نماینده بانک را مستقل از اطلاعات بانک و شعب مدیریت کنید.</p>
      </header>

      <form onSubmit={submitForm} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{editingId === null ? "ثبت اطلاعات باجه جدید" : "ویرایش اطلاعات باجه"}</h2>
          {editingId !== null && <span className="rounded-lg bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">شناسه: {editingId.toLocaleString("fa-IR")}</span>}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(({ key, label }) => (
            <label key={key} className="block space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">{label}</span>
              <input value={values[key] ?? ""} onChange={(event) => setValues((current) => ({ ...current, [key]: event.target.value }))} placeholder={label} className={inputClass} />
            </label>
          ))}
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <button disabled={saving} className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{saving ? "در حال ذخیره..." : editingId === null ? "ثبت اطلاعات" : "ذخیره تغییرات"}</button>
          {editingId !== null && <button type="button" onClick={resetForm} className="rounded-xl border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200">لغو ویرایش</button>}
        </div>
        {message && <p role="status" className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-700">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">فهرست اطلاعات باجه</h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{loading ? "در حال دریافت اطلاعات..." : `تعداد رکوردها: ${records.length.toLocaleString("fa-IR")}`}</p>
          </div>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="جست‌وجو در اطلاعات باجه..." aria-label="جست‌وجو" className={inputClass + " sm:max-w-sm"} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] text-right text-sm">
            <thead className="bg-slate-50 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <tr>
                <th className="px-4 py-3">ردیف</th>
                {fields.map(({ key, label }) => <th key={key} className="px-4 py-3 font-bold">{label}</th>)}
                <th className="px-4 py-3">عملیات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? <tr><td colSpan={fields.length + 2} className="px-5 py-12 text-center text-slate-500">در حال بارگذاری...</td></tr>
                : filteredRecords.length === 0 ? <tr><td colSpan={fields.length + 2} className="px-5 py-12 text-center text-slate-500">رکوردی پیدا نشد.</td></tr>
                : filteredRecords.map((record, index) => (
                  <tr key={record.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                    <td className="px-4 py-3 text-slate-500">{(index + 1).toLocaleString("fa-IR")}</td>
                    {fields.map(({ key }) => <td key={key} className="max-w-xs whitespace-normal px-4 py-3 text-slate-700 dark:text-slate-200">{record[key] || "—"}</td>)}
                    <td className="px-4 py-3"><div className="flex gap-2"><button type="button" onClick={() => startEdit(record)} className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-100">ویرایش</button><button type="button" onClick={() => void deleteRecord(record)} className="rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-700 hover:bg-red-100">حذف</button></div></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
