"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { normalizeCounterName, normalizePersianText } from "@/lib/normalize-persian";
import { addMonthsToDate } from "@/lib/date-months";

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
  "عنوان تسهیلات": "",
  "سریال": "",
  "طبقه": "",
  "نام باجه": "",
  "کد باجه": "",
  "وضعیت کنونی": "فعال",
  "تاریخ شروع": "",
  "پایان قرارداد": "",
  "مدت": "",
  "مبلغ مصوب": "",
  "کد ملی": "",
  "توضیحات": "",
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

function normalizeAmount(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[,٬،\s]/g, "")
    .replace(/[^0-9]/g, "");
}

function formatAmount(value: string) {
  const digits = normalizeAmount(value);
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function removeUnwantedColumns(raw: Record<string, unknown>) {
  const cleaned = { ...raw };
  for (const key of ["column1", "column3", "column23", "column24"]) delete cleaned[key];
  return cleaned;
}

async function readApiResponse(response: Response) {
  const text = await response.text();
  if (!text.trim()) {
    throw new Error(`پاسخ سرور خالی است (HTTP ${response.status}). خطای سرور را در ترمینال Next.js بررسی کنید.`);
  }
  try {
    return JSON.parse(text) as { success?: boolean; error?: string; record?: ApiRecord; counters?: CounterOption[] };
  } catch {
    const detail = text.trim().slice(0, 180).replace(/\\s+/g, " ");
    throw new Error(`پاسخ API معتبر نیست (HTTP ${response.status}). ${detail}`);
  }
}

export default function BayeganiRecordForm({ recordId }: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>(initialFields);
  const [loading, setLoading] = useState(Boolean(recordId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [counters, setCounters] = useState<CounterOption[]>([]);
  const [counterQuery, setCounterQuery] = useState("");
  const [counterOpen, setCounterOpen] = useState(false);


  useEffect(() => {
    let active = true;
    fetch("/api/bayegani/counters", { cache: "no-store" })
      .then(async (res) => {
        const result = await readApiResponse(res);
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
        const legacyArchiveCode = String(raw["کد بایگانی جدید"] ?? raw["کد بایگانی"] ?? "").trim();
        delete raw["کد بایگانی جدید"];
        if (legacyArchiveCode) raw["کد بایگانی"] = legacyArchiveCode;
        const next: Record<string, string> = { ...initialFields };
        next["مبلغ مصوب"] = normalizeAmount(String(raw["مبلغ مصوب"] ?? raw["مبلغ"] ?? ""));
        delete raw["مبلغ"];
        for (const [key, value] of Object.entries(raw)) {
          const fieldName = key.trim() === "تیک" ? "توضیحات" : key;
          next[fieldName] = value == null ? "" : String(value);
        }
        delete next["تیک"];
        next["پایان قرارداد"] = addMonthsToDate(next["تاریخ شروع"] || "", next["مدت"] || "") || next["پایان قرارداد"];
        next["وضعیت کنونی"] = next["وضعیت کنونی"] || "فعال";
        next["نام باجه"] = normalizeCounterName(next["نام باجه"] || "");
        next["کد باجه"] = normalizePersianText(next["کد باجه"] || "");
        const archiveCode = buildNewArchiveCode(next) || next["کد بایگانی"] || "";
        next["کد بایگانی"] = archiveCode;
        delete next["کد بایگانی جدید"];
        if (active) {
          setFields(next);
          setCounterQuery([next["کد باجه"], next["نام باجه"]].filter(Boolean).join("-"));
        }
      })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [recordId]);

  function changeField(key: string, value: string) {
    setFields((current) => {
      const next = { ...current, [key]: value };
      if (["کد باجه", "طبقه", "سریال"].includes(key)) {
        const archiveCode = buildNewArchiveCode(next) || next["کد بایگانی"] || "";
        next["کد بایگانی"] = archiveCode;
        delete next["کد بایگانی جدید"];
      }
      if (key === "نام باجه") {
        const selected = counters.find((counter) => counter.name === value);
        if (selected) next["کد باجه"] = selected.code;
      } else if (key === "کد باجه") {
        const selected = counters.find((counter) => counter.code === value);
        if (selected) next["نام باجه"] = selected.name;
      }
      if (key === "تاریخ شروع" || key === "مدت") {
        next["پایان قرارداد"] = addMonthsToDate(next["تاریخ شروع"] || "", next["مدت"] || "");
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
            body: JSON.stringify({ rawData: removeUnwantedColumns({ ...fields, "کد بایگانی": buildNewArchiveCode(fields) || fields["کد بایگانی"] }) }),
          })
        : await fetch("/api/bayegani/manual", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rawData: removeUnwantedColumns({ ...fields, "کد بایگانی": buildNewArchiveCode(fields) || fields["کد بایگانی"] }) }),
          });
      const result = await readApiResponse(response);
      if (!response.ok || !result.success) throw new Error(result.error || "ذخیره اطلاعات ناموفق بود.");
      setSuccess("اطلاعات با موفقیت ذخیره شد.");
      if (!recordId) router.push("/dashboard/bayegani");
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
  const entries = Object.entries(fields).filter(([key]) => key !== "مبلغ" && !isHiddenField(key));
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
              <span className="mb-1.5 block text-sm font-medium text-slate-700">{key === "نام باجه" ? "کد باجه-نام باجه" : key}</span>
              {key === "وضعیت کنونی" ? (
                <select
                  value={value || "فعال"}
                  onChange={(event) => changeField(key, event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="فعال">فعال</option>
                  <option value="تسویه شده">تسویه شده</option>
                </select>
              ) : key === "نام باجه" ? (
                <div className="relative">
                  <input
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={counterOpen}
                    aria-controls="bayegani-counter-options"
                    value={counterQuery}
                    onFocus={() => setCounterOpen(true)}
                    onChange={(event) => {
                      const query = event.target.value;
                      setCounterQuery(query);
                      setCounterOpen(true);
                      const exact = counterOptions.find((counter) =>
                        `${counter.code}-${counter.name}`.toLocaleLowerCase() === query.trim().toLocaleLowerCase()
                      );
                      if (exact) {
                        setFields((current) => {
                          const next = { ...current, "نام باجه": exact.name, "کد باجه": exact.code };
                          next["کد بایگانی"] = buildNewArchiveCode(next) || next["کد بایگانی"] || "";
                          return next;
                        });
                      } else {
                        setFields((current) => ({ ...current, "نام باجه": "", "کد باجه": "" }));
                      }
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setCounterOpen(false);
                      if (event.key === "Enter" && counterOpen) {
                        const first = counterOptions.filter((counter) =>
                          `${counter.code} ${counter.name}`.toLocaleLowerCase().includes(counterQuery.trim().toLocaleLowerCase())
                        )[0];
                        if (first) {
                          event.preventDefault();
                          setCounterQuery(`${first.code}-${first.name}`);
                          setFields((current) => {
                            const next = { ...current, "نام باجه": first.name, "کد باجه": first.code };
                            next["کد بایگانی"] = buildNewArchiveCode(next) || next["کد بایگانی"] || "";
                            return next;
                          });
                          setCounterOpen(false);
                        }
                      }
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="کد یا نام باجه را جستجو کنید..."
                    autoComplete="off"
                  />
                  {counterOpen && (
                    <div
                      id="bayegani-counter-options"
                      role="listbox"
                      className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
                    >
                      {counterOptions
                        .filter((counter) => {
                          const query = counterQuery.trim().toLocaleLowerCase();
                          return !query || `${counter.code} ${counter.name}`.toLocaleLowerCase().includes(query)
                            || `${counter.code}-${counter.name}`.toLocaleLowerCase().includes(query);
                        })
                        .slice(0, 50)
                        .map((counter) => (
                          <button
                            key={`${counter.code}-${counter.name}`}
                            type="button"
                            role="option"
                            aria-selected={fields["کد باجه"] === counter.code && fields["نام باجه"] === counter.name}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setCounterQuery(`${counter.code}-${counter.name}`);
                              setFields((current) => {
                                const next = { ...current, "نام باجه": counter.name, "کد باجه": counter.code };
                                next["کد بایگانی"] = buildNewArchiveCode(next) || next["کد بایگانی"] || "";
                                return next;
                              });
                              setCounterOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-right text-sm text-slate-700 transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                          >
                            <span className="font-medium">{counter.code}-{counter.name}</span>
                            {fields["کد باجه"] === counter.code && fields["نام باجه"] === counter.name && (
                              <span className="text-xs text-blue-600">انتخاب‌شده</span>
                            )}
                          </button>
                        ))}
                      {counterOptions.filter((counter) => {
                        const query = counterQuery.trim().toLocaleLowerCase();
                        return !query || `${counter.code} ${counter.name}`.toLocaleLowerCase().includes(query)
                          || `${counter.code}-${counter.name}`.toLocaleLowerCase().includes(query);
                      }).length === 0 && (
                        <p className="px-3 py-4 text-center text-sm text-slate-500">موردی پیدا نشد.</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <input
                  value={key === "مبلغ مصوب" ? formatAmount(value) : value}
                  readOnly={key === "کد بایگانی" || key === "سریال" || key === "پایان قرارداد"}
                  onChange={(event) => changeField(key, event.target.value)}
                  className={`w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${key === "کد بایگانی" || key === "سریال" || key === "پایان قرارداد" ? "bg-slate-100 text-slate-600" : "bg-white"}`}
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
