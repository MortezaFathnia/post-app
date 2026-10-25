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
type CounterOption = { name: string; code: string };

const initialFields: Record<string, string> = {
  "شماره تسهیلات": "",
  "شماره مشتری": "",
  "کد بایگانی": "",
  "کد بایگانی جدید": "",
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

const hiddenFields = new Set(["کد باجه", "column1", "column3", "column23", "column24"]);

function isHiddenField(key: string) {
  return hiddenFields.has(key.trim().toLocaleLowerCase());
}

function buildNewArchiveCode(raw: Record<string, unknown>) {
  const counterCode = String(raw["کد باجه"] ?? "").trim();
  const floor = String(raw["طبقه"] ?? "").trim();
  const serial = String(raw["سریال"] ?? "").trim();
  return [counterCode, floor, serial].every(Boolean) ? [counterCode, floor, serial].join("-") : "";
}

function removeUnwantedColumns(raw: Record<string, unknown>) {
  const cleaned = { ...raw };
  for (const key of ["column1", "column3", "column23", "column24"]) delete cleaned[key];
  return cleaned;
}

export default function BayeganiRecordForm({ recordId }: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>(initialFields);
  const [loading, setLoading] = useState(Boolean(recordId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [counters, setCounters] = useState<CounterOption[]>([]);

  useEffect(() => {
    let active = true;
    fetch("/api/bayegani/counters", { cache: "no-store" })
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.error || "دریافت فهرست باجه‌ها ناموفق بود.");
        if (active) setCounters(Array.isArray(result.counters) ? result.counters : []);
      })
      .catch(() => { /* Counter options are an enhancement; manual text fallback remains available. */ });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!recordId) return;
    let active = true;
    fetch(`/api/bayegani/${recordId}`, { cache: "no-store" })
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.error || "دریافت رکورد ناموفق بود.");
        const record = result.record as ApiRecord;
        const raw = record.rawData && typeof record.rawData === "object" ? removeUnwantedColumns(record.rawData) : {};
        const next: Record<string, string> = { ...initialFields };
        for (const [key, value] of Object.entries(raw)) next[key] = value == null ? "" : String(value);
        next["کد بایگانی جدید"] = buildNewArchiveCode(next);
        if (active) setFields(next);
      })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [recordId]);

  function changeField(key: string, value: string) {
    setFields((current) => {
      const next = { ...current, [key]: value };
      if (["کد باجه", "طبقه", "سریال"].includes(key)) {
        next["کد بایگانی جدید"] = buildNewArchiveCode(next);
      }
      if (key === "نام باجه") {
        const selected = counters.find((counter) => counter.name === value);
        if (selected) next["کد باجه"] = selected.code;
      } else if (key === "کد باجه") {
        const selected = counters.find((counter) => counter.code === value);
        if (selected) next["نام باجه"] = selected.name;
      }
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
            body: JSON.stringify({ rawData: removeUnwantedColumns({ ...fields, "کد بایگانی جدید": buildNewArchiveCode(fields) }) }),
          })
        : await fetch("/api/bayegani/manual", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rawData: removeUnwantedColumns({ ...fields, "کد بایگانی جدید": buildNewArchiveCode(fields) }) }),
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

  const currentCounter = { name: fields["نام باجه"] || "", code: fields["کد باجه"] || "" };
  const completeCounters = counters.filter((counter) => counter.name.trim() && counter.code.trim());
  const currentCounterIsComplete = currentCounter.name.trim() && currentCounter.code.trim();
  const counterOptions = completeCounters.some((counter) => counter.name === currentCounter.name && counter.code === currentCounter.code)
    || !currentCounterIsComplete
    ? completeCounters
    : [...completeCounters, currentCounter];
  const entries = Object.entries(fields).filter(([key]) => !isHiddenField(key));
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
              {key === "نام باجه" ? (
                <select
                  value={JSON.stringify([fields["نام باجه"] || "", fields["کد باجه"] || ""])}
                  onChange={(event) => {
                    try {
                      const [name, code] = JSON.parse(event.target.value) as [string, string];
                      setFields((current) => {
                      const next = { ...current, "نام باجه": name, "کد باجه": code };
                      next["کد بایگانی جدید"] = buildNewArchiveCode(next);
                      return next;
                    });
                    } catch {
                      setFields((current) => {
                        const next = { ...current, "نام باجه": "", "کد باجه": "" };
                        next["کد بایگانی جدید"] = buildNewArchiveCode(next);
                        return next;
                      });
                    }
                  }}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value={JSON.stringify(["", ""])}>انتخاب نام و کد باجه</option>
                  {counterOptions.map((counter) => (
                    <option key={`${counter.name}-${counter.code}`} value={JSON.stringify([counter.name, counter.code])}>
                      {counter.code ? `${counter.code} - ` : ""}{counter.name}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  value={value}
                  readOnly={key === "کد بایگانی جدید"}
                  onChange={(event) => changeField(key, event.target.value)}
                  className={`w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${key === "کد بایگانی جدید" ? "bg-slate-100 text-slate-600" : "bg-white"}`}
                  placeholder={key}
                />
              )}
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
