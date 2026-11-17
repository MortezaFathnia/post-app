"use client";

import Link from "next/link";
import PersianDatePicker from "@/components/PersianDatePicker";
import { FormEvent, useEffect, useState } from "react";

type CounterOption = { id: number; code: string; name: string };
type BankOption = { id: number; bankId: string; name: string };
type FacilityPersonOption = { name: string; facilityNumbers: string[] };

type AddedCheck = {
  id: number;
  counterLabel: string;
  facilityNumber: string;
  serial: string | null;
  dueDate: string | null;
  bankAgent: string | null;
  checkBranch: string | null;
  description: string | null;
  paidAmount: string | null;
  administrativeNumber: string | null;
  checkStatus: string;
};

type ApiResult = {
  success: boolean;
  error?: string;
  record?: { id: number; checkStatus: string };
  records?: AddedCheck[];
};

const inputClass = "w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function AddDebtCheckPage() {
  const [counters, setCounters] = useState<CounterOption[]>([]);
  const [banks, setBanks] = useState<BankOption[]>([]);
  const [facilityPeople, setFacilityPeople] = useState<FacilityPersonOption[]>([]);
  const [facilityName, setFacilityName] = useState("");
  const [loadingFacilities, setLoadingFacilities] = useState(false);
  const [facilityOpen, setFacilityOpen] = useState(false);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [counterLabel, setCounterLabel] = useState("");
  const [facilityNumber, setFacilityNumber] = useState("");
  const [serial, setSerial] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [bankAgent, setBankAgent] = useState("");
  const [checkBranch, setCheckBranch] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [administrativeNumber, setAdministrativeNumber] = useState("");
  const [loadingCounters, setLoadingCounters] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [addedChecks, setAddedChecks] = useState<AddedCheck[]>([]);
  const [loadingChecks, setLoadingChecks] = useState(true);
  const [exporting, setExporting] = useState(false);

  async function loadAddedChecks() {
    setLoadingChecks(true);
    try {
      const response = await fetch("/api/debt-documents/checks", { cache: "no-store" });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) throw new Error(result.error ?? "دریافت فهرست چک‌ها ناموفق بود.");
      setAddedChecks(Array.isArray(result.records) ? result.records : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "دریافت فهرست چک‌ها ناموفق بود.");
    } finally {
      setLoadingChecks(false);
    }
  }

  useEffect(() => {
    void loadAddedChecks();
  }, []);

  function exportChecks() {
    if (!addedChecks.length) return;
    setExporting(true);
    try {
      const rows = addedChecks.map((record) => {
        const dueDate = (record.dueDate ?? "").replace(/-/g, "/");
        const cells = [
          record.serial ?? "",
          (record.paidAmount ?? "").replace(/,/g, ""),
          record.administrativeNumber ?? "",
          dueDate,
          "L",
          "0",
          "",
          "0",
          "0",
          "17",
          "8881",
          "TRUE",
          "",
          record.administrativeNumber ?? "",
        ];
        return cells.map((cell) => /[",\r\n]/.test(cell) ? `"${cell.replace(/"/g, '""')}"` : cell).join(",");
      });
      const content = "\uFEFF" + rows.join("\r\n") + "\r\n";
      const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "چک‌های-ثبت‌شده.txt";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  useEffect(() => {
    const controller = new AbortController();
    async function loadCounters() {
      setLoadingCounters(true);
      try {
        const response = await fetch("/api/bayegani/counters", { cache: "no-store", signal: controller.signal });
        const result = (await response.json()) as { success?: boolean; counters?: CounterOption[]; error?: string };
        if (!response.ok || !result.success) throw new Error(result.error ?? "دریافت فهرست باجه‌ها ناموفق بود.");
        setCounters(Array.isArray(result.counters) ? result.counters : []);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "دریافت فهرست باجه‌ها ناموفق بود.");
        }
      } finally {
        if (!controller.signal.aborted) setLoadingCounters(false);
      }
    }
    void loadCounters();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    async function loadBanks() {
      setLoadingBanks(true);
      try {
        const response = await fetch("/api/banks", { cache: "no-store", signal: controller.signal });
        const result = (await response.json()) as { success?: boolean; banks?: BankOption[]; error?: string };
        if (!response.ok || !result.success) throw new Error(result.error ?? "دریافت فهرست بانک‌ها ناموفق بود.");
        setBanks(Array.isArray(result.banks) ? result.banks : []);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "دریافت فهرست بانک‌ها ناموفق بود.");
        }
      } finally {
        if (!controller.signal.aborted) setLoadingBanks(false);
      }
    }
    void loadBanks();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const query = facilityName.trim();
    if (query.length < 2) {
      setFacilityPeople([]);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoadingFacilities(true);
      try {
        const response = await fetch(`/api/debt-discounting-facilities/search?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        const result = (await response.json()) as {
          success?: boolean;
          people?: FacilityPersonOption[];
          error?: string;
        };
        if (!response.ok || !result.success) {
          throw new Error(result.error ?? "جست‌وجوی نام تسهیلات ناموفق بود.");
        }
        setFacilityPeople(Array.isArray(result.people) ? result.people : []);
      } catch (loadError) {
        if (!controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : "جست‌وجوی نام تسهیلات ناموفق بود.");
        }
      } finally {
        if (!controller.signal.aborted) setLoadingFacilities(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [facilityName]);

  const selectedFacilityPerson = facilityPeople.find((person) => person.name === facilityName.trim());

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await fetch("/api/debt-documents/checks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          counterLabel,
          facilityNumber,
          serial,
          dueDate,
          bankAgent,
          checkBranch,
          description,
          amount,
          administrativeNumber,
        }),
      });
      const result = (await response.json()) as ApiResult;
      if (!response.ok || !result.success) throw new Error(result.error ?? "ثبت چک جدید ناموفق بود.");
      setSuccess(`چک با موفقیت ثبت شد. وضعیت اولیه: ${result.record?.checkStatus ?? "درراه"}`);
      await loadAddedChecks();
      setFacilityName("");
      setFacilityNumber("");
      setSerial("");
      setDueDate("");
      setBankAgent("");
      setCheckBranch("");
      setDescription("");
      setAmount("");
      setAdministrativeNumber("");
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "ثبت چک جدید ناموفق بود.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-blue-700">خرید دین</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">افزودن چک جدید</h1>
          <p className="mt-2 text-sm text-slate-500">ثبت دستی اطلاعات یک چک در فهرست اسناد خرید دین</p>
        </div>
        <Link href="/dashboard/debt-documents" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          مشاهده فهرست اسناد
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="grid gap-5 md:grid-cols-2">
          <div>
            <label htmlFor="counterLabel" className="mb-2 block text-sm font-semibold text-slate-700">کدباجه - نام باجه</label>
            <select id="counterLabel" required value={counterLabel} onChange={(event) => setCounterLabel(event.target.value)} disabled={loadingCounters || saving} className={inputClass}>
              <option value="">{loadingCounters ? "در حال دریافت فهرست باجه‌ها..." : "انتخاب باجه"}</option>
              {counters.map((counter) => <option key={counter.id} value={`${counter.code}-${counter.name}`}>{counter.code}-{counter.name}</option>)}
            </select>
          </div>

          <div>
            <label htmlFor="facilityName" className="mb-2 block text-sm font-semibold text-slate-700">نام شخص</label>
            <div className="relative">
              <input
                id="facilityName"
                required
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={facilityOpen}
                aria-controls="debt-facility-person-options"
                value={facilityName}
                onFocus={() => setFacilityOpen(true)}
                onChange={(event) => {
                  setFacilityName(event.target.value);
                  setFacilityNumber("");
                  setFacilityOpen(true);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setFacilityOpen(false);
                  if (event.key === "Enter" && facilityOpen) {
                    const first = facilityPeople.filter((person) =>
                      person.name.toLocaleLowerCase().includes(facilityName.trim().toLocaleLowerCase())
                    )[0];
                    if (first) {
                      event.preventDefault();
                      setFacilityName(first.name);
                      setFacilityNumber("");
                      setFacilityOpen(false);
                    }
                  }
                }}
                disabled={saving}
                placeholder="نام شخص را جست‌وجو کنید"
                className={inputClass}
                autoComplete="off"
              />
              {facilityOpen && facilityName.trim().length >= 2 && (
                <div
                  id="debt-facility-person-options"
                  role="listbox"
                  className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
                >
                  {facilityPeople
                    .filter((person) => person.name.toLocaleLowerCase().includes(facilityName.trim().toLocaleLowerCase()))
                    .slice(0, 50)
                    .map((person) => (
                      <button
                        key={person.name}
                        type="button"
                        role="option"
                        aria-selected={facilityName.trim() === person.name}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => {
                          setFacilityName(person.name);
                          setFacilityNumber("");
                          setFacilityOpen(false);
                        }}
                        className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-right text-sm text-slate-700 transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                      >
                        <span className="font-medium">{person.name}</span>
                        {facilityName.trim() === person.name && (
                          <span className="text-xs text-blue-600">انتخاب‌شده</span>
                        )}
                      </button>
                    ))}
                  {!loadingFacilities && facilityPeople.filter((person) =>
                    person.name.toLocaleLowerCase().includes(facilityName.trim().toLocaleLowerCase())
                  ).length === 0 && (
                    <p className="px-3 py-4 text-center text-sm text-slate-500">موردی پیدا نشد.</p>
                  )}
                </div>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {loadingFacilities ? "در حال جست‌وجو..." : facilityName.trim().length < 2 ? "برای جست‌وجو حداقل دو حرف وارد کنید." : facilityPeople.length === 0 ? "شخصی با این نام پیدا نشد." : "نام شخص را از فهرست پیشنهادها انتخاب کنید."}
            </p>
          </div>

          <div>
            <label htmlFor="facilityNumber" className="mb-2 block text-sm font-semibold text-slate-700">کد تسهیلات خرید دین</label>
            <select
              id="facilityNumber"
              required
              value={facilityNumber}
              onChange={(event) => setFacilityNumber(event.target.value)}
              disabled={saving || !selectedFacilityPerson || selectedFacilityPerson.facilityNumbers.length === 0}
              className={inputClass}
            >
              <option value="">انتخاب کد تسهیلات</option>
              {selectedFacilityPerson?.facilityNumbers.map((number) => (
                <option key={number} value={number}>{number}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="serial" className="mb-2 block text-sm font-semibold text-slate-700">سریال چک</label>
            <input id="serial" required value={serial} onChange={(event) => setSerial(event.target.value)} disabled={saving} placeholder="سریال چک را وارد کنید" className={inputClass} />
          </div>

          <div>
            <label htmlFor="administrativeNumber" className="mb-2 block text-sm font-semibold text-slate-700">شماره انتظامی</label>
            <input id="administrativeNumber" required value={administrativeNumber} onChange={(event) => setAdministrativeNumber(event.target.value)} disabled={saving} placeholder="شماره انتظامی را وارد کنید" className={inputClass} />
          </div>

          <div>
            <label htmlFor="dueDate" className="mb-2 block text-sm font-semibold text-slate-700">تاریخ سررسید</label>
            <PersianDatePicker inputId="dueDate" required value={dueDate} onChange={setDueDate} disabled={saving} placeholder="مثلاً ۱۴۰۵/۰۷/۰۴" className={inputClass} />
          </div>

          <div>
            <label htmlFor="bankAgent" className="mb-2 block text-sm font-semibold text-slate-700">کدبانک - نام بانک</label>
            <input
              id="bankAgent"
              required
              list="debt-check-bank-options"
              value={bankAgent}
              onChange={(event) => setBankAgent(event.target.value)}
              disabled={saving || loadingBanks}
              placeholder={loadingBanks ? "در حال دریافت فهرست بانک‌ها..." : "کد یا نام بانک را جست‌وجو کنید"}
              className={inputClass}
              autoComplete="off"
            />
            <datalist id="debt-check-bank-options">
              {banks.map((bank) => (
                <option key={bank.id} value={`${bank.bankId}-${bank.name}`} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="checkBranch" className="mb-2 block text-sm font-semibold text-slate-700">شعبه چک</label>
            <input id="checkBranch" required value={checkBranch} onChange={(event) => setCheckBranch(event.target.value)} disabled={saving} placeholder="نام یا کد شعبه چک" className={inputClass} />
          </div>

          <div className="md:col-span-2">
            <label htmlFor="description" className="mb-2 block text-sm font-semibold text-slate-700">توضیحات</label>
            <textarea id="description" value={description} onChange={(event) => setDescription(event.target.value)} disabled={saving} rows={3} placeholder="توضیحات (اختیاری)" className={inputClass} />
          </div>

          <div>
            <label htmlFor="amount" className="mb-2 block text-sm font-semibold text-slate-700">مبلغ چک</label>
            <input id="amount" required inputMode="numeric" value={amount} onChange={(event) => setAmount(event.target.value)} disabled={saving} placeholder="مبلغ را به ریال وارد کنید" className={inputClass} />
          </div>
        </div>

        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          وضعیت چک پس از ثبت، به‌صورت پیش‌فرض <strong>درراه</strong> خواهد بود.
        </div>

        {error && <div role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {success && (
          <div role="status" className="mt-5 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
            <p>{success}</p>
            <Link href="/dashboard/debt-documents" className="mt-2 inline-flex font-semibold text-green-800 underline">رفتن به فهرست اسناد خرید دین</Link>
          </div>
        )}

        <div className="mt-6 flex flex-wrap gap-3">
          <button type="submit" disabled={saving || loadingCounters} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
            {saving ? "در حال ثبت..." : "ثبت چک جدید"}
          </button>
          <button type="button" disabled={saving} onClick={() => {
            setCounterLabel("");
            setFacilityName("");
            setFacilityPeople([]);
            setFacilityNumber("");
            setSerial("");
            setDueDate("");
            setBankAgent("");
            setCheckBranch("");
            setDescription("");
            setAmount("");
            setAdministrativeNumber("");
            setError("");
            setSuccess("");
          }} className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
            پاک کردن فرم
          </button>
        </div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">فهرست چک‌های ثبت‌شده</h2>
            <p className="mt-1 text-sm text-slate-500">تعداد چک‌های ثبت دستی: {addedChecks.length.toLocaleString("fa-IR")}</p>
          </div>
          <button type="button" onClick={exportChecks} disabled={!addedChecks.length || exporting || loadingChecks} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600">
            {exporting ? "در حال آماده‌سازی..." : "خروجی چک‌ها به فایل متنی"}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-right text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                {["ردیف", "کدباجه - نام باجه", "کد تسهیلات", "سریال چک", "شماره انتظامی", "تاریخ سررسید", "مبلغ", "بانک عامل", "شعبه چک", "وضعیت"].map((heading) => (
                  <th key={heading} className="whitespace-nowrap px-4 py-3 font-semibold">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loadingChecks ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">در حال دریافت چک‌های ثبت‌شده...</td></tr>
              ) : addedChecks.length === 0 ? (
                <tr><td colSpan={10} className="px-4 py-8 text-center text-slate-500">هنوز چکی ثبت نشده است.</td></tr>
              ) : addedChecks.map((record, index) => (
                <tr key={record.id} className="hover:bg-slate-50">
                  <td className="whitespace-nowrap px-4 py-3">{(index + 1).toLocaleString("fa-IR")}</td>
                  <td className="whitespace-nowrap px-4 py-3">{record.counterLabel}</td>
                  <td className="whitespace-nowrap px-4 py-3">{record.facilityNumber}</td>
                  <td className="whitespace-nowrap px-4 py-3">{record.serial || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{record.administrativeNumber || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{record.dueDate || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{record.paidAmount || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{record.bankAgent || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{record.checkBranch || "—"}</td>
                  <td className="whitespace-nowrap px-4 py-3">{record.checkStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
