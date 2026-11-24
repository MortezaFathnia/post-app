"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { normalizeCounterName, normalizePersianText } from "@/lib/normalize-persian";
import { getTodayDateJalali, sumDatesJalali } from "@/lib/date/jalali";
import PersianDatePicker from "@/components/PersianDatePicker";

type Props = { recordId?: string; newPage?: boolean };
type ApiRecord = {
  id: number;
  sheetName: string;
  sourceRow: number;
  rawData: Record<string, unknown> | null;
};
type CounterOption = { name: string; code: string };
type FacilityCodeOption = { id: number; code: string; name: string };

const initialFields: Record<string, string> = {
  "شماره تسهیلات": "",
  "نوع تسهیلات": "",
  "نوع شخص": "حقیقی",
  "جنسیت": "مرد",
  "نام": "",
  "نام خانوادگی": "",
  "نام شرکت": "",
  "شماره ثبت": "",
  "عنوان تسهیلات": "",
  "سریال": "",
  "طبقه": "",
  "نام باجه": "",
  "کد باجه": "",
  "وضعیت کنونی": "فعال",
  "کد بایگانی": "",
  "تاریخ شروع": "",
  "مدت": "",
  "تاریخ تحویل وثیقه": "",
  "پایان قرارداد": "",
  "تعداد اقساط": "",
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
    return JSON.parse(text) as { success?: boolean; error?: string; record?: ApiRecord; counters?: CounterOption[]; facilityCodes?: FacilityCodeOption[]; nextSerial?: string };
  } catch {
    const detail = text.trim().slice(0, 180).replace(/\\s+/g, " ");
    throw new Error(`پاسخ API معتبر نیست (HTTP ${response.status}). ${detail}`);
  }
}

export default function BayeganiRecordForm({ recordId, newPage = false }: Props) {
  const router = useRouter();
  const [fields, setFields] = useState<Record<string, string>>(initialFields);
  const [originalFields, setOriginalFields] = useState<Record<string, string>>(initialFields);
  const [loading, setLoading] = useState(Boolean(recordId));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [counters, setCounters] = useState<CounterOption[]>([]);
  const [counterQuery, setCounterQuery] = useState("");
  const [counterOpen, setCounterOpen] = useState(false);
  const [facilityCodes, setFacilityCodes] = useState<FacilityCodeOption[]>([]);
  const [facilityQuery, setFacilityQuery] = useState("");
  const [facilityOpen, setFacilityOpen] = useState(false);


  useEffect(() => {
    let active = true;
    fetch("/api/facility-codes", { cache: "no-store" })
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.error || "دریافت فهرست نوع تسهیلات ناموفق بود.");
        if (active) {
          const options = Array.isArray(result.facilityCodes) ? result.facilityCodes : [];
          setFacilityCodes(options);
        }
      })
      .catch(() => { /* Keep the form usable if facility-code lookup is unavailable. */ });
    return () => { active = false; };
  }, []);

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

  // Derive the facility type from segment two of facilityNumber for both new
  // and existing records (e.g. 1538.222.5555131.1 -> code 222).
  useEffect(() => {
    if (facilityCodes.length === 0) return;
    const facilityCode = String(fields["شماره تسهیلات"] || "").trim().split(".")[1];
    if (!facilityCode) return;
    const matched = facilityCodes.find((item) => item.code.trim() === facilityCode);
    if (!matched) return;
    const option = `${matched.code}-${matched.name}`;
    setFacilityQuery(option);
    setFields((current) => {
      if (current["نوع تسهیلات"] === option) return current;
      const personType = current["نوع شخص"] || "حقیقی";
      const gender = current["جنسیت"];
      const firstName = current["نام"].trim();
      const lastName = current["نام خانوادگی"].trim();
      const companyName = current["نام شرکت"].trim();
      const title = personType === "حقوقی"
        ? (companyName ? `${matched.name} ${companyName}` : current["عنوان تسهیلات"])
        : (gender && firstName && lastName
            ? `${matched.name} ${gender === "زن" ? "سرکار خانم" : "جناب آقای"} ${firstName} ${lastName}`
            : current["عنوان تسهیلات"]);
      return { ...current, "نوع تسهیلات": option, "عنوان تسهیلات": title };
    });
  }, [recordId, facilityCodes, fields["شماره تسهیلات"], fields["نوع شخص"], fields["جنسیت"], fields["نام"], fields["نام خانوادگی"], fields["نام شرکت"]]);

  useEffect(() => {
    if (recordId) return;
    let active = true;
    const controller = new AbortController();
    fetch("/api/bayegani/manual", {
      cache: "no-store",
      signal: controller.signal,
    })
      .then(async (res) => {
        const result = await readApiResponse(res);
        if (!res.ok || !result.success) throw new Error(result.error || "دریافت آخرین سریال بایگانی ناموفق بود.");
        if (active) {
          setFields((current) => ({
            ...current,
            "سریال": result.nextSerial || "1",
            "تاریخ شروع": current["تاریخ شروع"] || getTodayDateJalali(),
          }));
        }
      })
      .catch((e: unknown) => {
        if (active && !(e instanceof DOMException && e.name === "AbortError")) {
          setError(e instanceof Error ? e.message : "دریافت آخرین سریال بایگانی ناموفق بود.");
        }
      });
    return () => { active = false; controller.abort(); };
  }, [recordId]);

  useEffect(() => {
    if (!recordId) return;
    let active = true;
    fetch(`/api/bayegani/${recordId}`, { cache: "no-store" })
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok || !result.success) throw new Error(result.error || "دریافت رکورد ناموفق بود.");
        const record = result.record as ApiRecord;
        const sourceRaw = record.rawData && typeof record.rawData === "object" ? removeUnwantedColumns(record.rawData) : {};
        const normalizeKey = (key: string) => key.replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/[\s\u200c]+/g, " ").trim();
        const raw: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(sourceRaw)) raw[normalizeKey(key)] = value;
        const aliases: Record<string, string> = {
          "شماره تسهيلات": "شماره تسهیلات", "نوع تسهيلات": "نوع تسهیلات",
          "تاريخ شروع": "تاریخ شروع", "تاريخ تحويل وثيقه": "تاریخ تحویل وثیقه",
          "تاریخ تحويل وثيقه": "تاریخ تحویل وثیقه", "پايان قرارداد": "پایان قرارداد",
          "وضعيت کنونی": "وضعیت کنونی", "کد ملي": "کد ملی", "کد ملي مشتري": "کد ملی",
        };
        const next: Record<string, string> = { ...initialFields };
        for (const [key, value] of Object.entries(raw)) {
          const fieldName = normalizeKey(key) === "تیک" ? "توضیحات" : (aliases[normalizeKey(key)] || normalizeKey(key));
          if (Object.prototype.hasOwnProperty.call(initialFields, fieldName)) next[fieldName] = value == null ? "" : String(value);
        }
        // Fall back to the normalized database columns if legacy rawData lacks those fields.
        const columnFallbacks: Record<string, unknown> = {
          "شماره تسهیلات": result.record.facilityNumber,
          "نام": raw["نام"] ?? raw["نام و نام خانوادگی مدیون"],
          "سریال": result.record.serial,
          "طبقه": result.record.classification,
          "نام باجه": result.record.counterName,
          "کد باجه": result.record.counterCode,
          "وضعیت کنونی": result.record.status,
          "کد بایگانی": result.record.archiveCode,
          "تاریخ شروع": result.record.startDate,
          "مدت": result.record.duration,
          "تاریخ تحویل وثیقه": result.record.bailDeliveryDate,
          "پایان قرارداد": result.record.endDate,
          "تعداد اقساط": result.record.installmentCount,
          "مبلغ مصوب": result.record.approvedAmount,
          "کد ملی": result.record.nationalId,
        };
        for (const [key, value] of Object.entries(columnFallbacks)) {
          if (!String(next[key] ?? "").trim() && value != null && String(value).trim()) next[key] = String(value);
        }
        // Older imports stored the debtor's full name in one column. Keep the
        // edit form's first-name and last-name inputs separate when loading them.
        if (!next["نام خانوادگی"].trim() && next["نام"].trim().includes(" ")) {
          const nameParts = next["نام"].trim().split(/\s+/);
          next["نام"] = nameParts.shift() || "";
          next["نام خانوادگی"] = nameParts.join(" ");
        }
        next["مبلغ مصوب"] = normalizeAmount(next["مبلغ مصوب"]);
        delete raw["مبلغ"];
        delete next["تیک"];
        next["پایان قرارداد"] = sumDatesJalali(next["تاریخ شروع"] || "", next["مدت"] || "") || next["پایان قرارداد"];
        next["وضعیت کنونی"] = next["وضعیت کنونی"] || "فعال";
        next["نام باجه"] = normalizeCounterName(next["نام باجه"] || "");
        next["کد باجه"] = normalizePersianText(next["کد باجه"] || "");
        const archiveCode = buildNewArchiveCode(next) || next["کد بایگانی"] || "";
        next["کد بایگانی"] = archiveCode;
        delete next["کد بایگانی جدید"];
        if (active) {
          setFields(next);
          setOriginalFields(next);
          setCounterQuery([next["کد باجه"], next["نام باجه"]].filter(Boolean).join("-"));
          setFacilityQuery(next["نوع تسهیلات"] || "");
        }
      })
      .catch((e: unknown) => { if (active) setError(e instanceof Error ? e.message : "خطا در دریافت اطلاعات."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [recordId]);

  function changeField(key: string, value: string) {
    setFields((current) => {
      const next = { ...current, [key]: value };
      if (key === "وضعیت کنونی" && value === "فعال") {
        next["تاریخ تحویل وثیقه"] = "";
      }
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
      if (key === "شماره تسهیلات") {
        const facilityTypeCode = value.trim().split(".")[1] || "";
        const matchedFacility = facilityCodes.find((item) => item.code.trim() === facilityTypeCode);
        next["نوع تسهیلات"] = matchedFacility ? `${matchedFacility.code}-${matchedFacility.name}` : "";
      }
      if (["شماره تسهیلات", "نوع تسهیلات", "نوع شخص", "جنسیت", "نام", "نام خانوادگی", "نام شرکت"].includes(key)) {
        const selectedFacility = facilityCodes.find(
          (item) => `${item.code}-${item.name}` === next["نوع تسهیلات"]
        );
        const facilityName = selectedFacility?.name
          || next["نوع تسهیلات"].split("-").slice(1).join("-").trim();
        const personType = next["نوع شخص"] || "حقیقی";
        const gender = next["جنسیت"];
        const firstName = next["نام"].trim();
        const lastName = next["نام خانوادگی"].trim();
        const companyName = next["نام شرکت"].trim();
        next["عنوان تسهیلات"] = personType === "حقوقی"
          ? (facilityName && companyName ? `${facilityName} ${companyName}` : "")
          : (facilityName && gender && firstName && lastName
              ? `${facilityName} ${gender === "زن" ? "سرکار خانم" : "جناب آقای"} ${firstName} ${lastName}`
              : "");
      }
      if (key === "تاریخ شروع" || key === "مدت") {
        next["پایان قرارداد"] = sumDatesJalali(next["تاریخ شروع"] || "", next["مدت"] || "");
      }
      return next;
    });
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(""); setSuccess("");
    if (!recordId && !hasAllRequiredFields) {
      setError("لطفاً تمام فیلدهای الزامی را تکمیل کنید. فقط تعداد اقساط و توضیحات اختیاری هستند.");
      return;
    }
    const facilityNumber = String(fields["شماره تسهیلات"] ?? fields["شماره تسهيلات"] ?? "").trim();
    if (!/^\d+\.\d+\.\d+\.\d+$/.test(facilityNumber)) {
      setError("شماره تسهیلات باید دقیقاً شامل ۴ بخش عددی باشد که با نقطه (.) از هم جدا شده‌اند؛ مانند 1538.232.3323421.1");
      return;
    }
    if ((fields["نوع شخص"] || "حقیقی") === "حقیقی" && !/^[0-9]{10}$/.test(fields["کد ملی"])) {
      setError("کد ملی شخص حقیقی باید دقیقاً شامل ۱۰ رقم انگلیسی باشد.");
      return;
    }
    if ((fields["نوع شخص"] || "حقیقی") === "حقوقی" && (!fields["نام شرکت"].trim() || !fields["شماره ثبت"].trim())) {
      setError("نام شرکت و شماره ثبت برای شخص حقوقی الزامی است.");
      return;
    }
    setSaving(true);
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
      router.push("/dashboard/bayegani");
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
  const entryKeys = Object.keys(initialFields)
    .filter((key) => key !== "شماره مشتری" && key !== "مبلغ" && !isHiddenField(key));
  const bailDateIndex = entryKeys.indexOf("تاریخ تحویل وثیقه");
  if (bailDateIndex !== -1) entryKeys.splice(bailDateIndex, 1);
  const statusIndex = entryKeys.indexOf("وضعیت کنونی");
  entryKeys.splice(statusIndex + 1, 0, "تاریخ تحویل وثیقه");
  const personType = fields["نوع شخص"] || "حقیقی";
  let visibleEntryKeys = entryKeys.filter((key) => personType === "حقوقی"
    ? !["جنسیت", "نام", "نام خانوادگی", "کد ملی"].includes(key)
    : !["نام شرکت", "شماره ثبت"].includes(key));
  // Keep this ordering specific to the new-record page; the edit page retains
  // its existing field order.
  if (newPage) {
    const moveAfter = (items: string[], field: string, after: string) => {
      const index = items.indexOf(field);
      if (index === -1) return items;
      const next = items.filter((item) => item !== field);
      const anchorIndex = next.indexOf(after);
      next.splice(anchorIndex === -1 ? next.length : anchorIndex + 1, 0, field);
      return next;
    };
    if (personType === "حقیقی") {
      visibleEntryKeys = moveAfter(visibleEntryKeys, "کد ملی", "نام خانوادگی");
    }
    visibleEntryKeys = moveAfter(visibleEntryKeys, "مبلغ مصوب", "نام باجه");
    visibleEntryKeys = moveAfter(visibleEntryKeys, "تعداد اقساط", "مبلغ مصوب");
    visibleEntryKeys = moveAfter(visibleEntryKeys, "تاریخ شروع", "تعداد اقساط");
    visibleEntryKeys = moveAfter(visibleEntryKeys, "مدت", "تاریخ شروع");
    visibleEntryKeys = moveAfter(visibleEntryKeys, "پایان قرارداد", "مدت");
  }
  const entries = visibleEntryKeys.map((key) => [key, fields[key] ?? ""] as [string, string]);
  const hasChanges = JSON.stringify(fields) !== JSON.stringify(originalFields);
  const optionalFields = new Set(["تعداد اقساط", "توضیحات", "تاریخ تحویل وثیقه", "جنسیت", "نام", "نام خانوادگی", "کد ملی", "نام شرکت", "شماره ثبت"]);
  const requiredFields = Object.keys(initialFields).filter((key) => !optionalFields.has(key));
  const identityRequired = personType === "حقوقی" ? ["نام شرکت", "شماره ثبت"] : ["جنسیت", "نام", "نام خانوادگی", "کد ملی"];
  const hasAllRequiredFields = requiredFields.every((key) => String(fields[key] ?? "").trim().length > 0)
    && identityRequired.every((key) => String(fields[key] ?? "").trim().length > 0);
  const canSave = hasChanges && (Boolean(recordId) || hasAllRequiredFields);
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
        <div className={`grid gap-4 ${newPage && personType === "حقیقی" ? "grid-cols-3" : newPage ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3"}`}>
          {entries.map(([key, value]) => (
            <label key={key} className={`block ${key === "وضعیت کنونی" ? "sm:col-start-1" : ""}`}>
              <span className="mb-1.5 block text-sm font-medium text-slate-700">{key === "نام باجه" ? "کد باجه-نام باجه" : key}</span>
              {key === "نوع شخص" ? (
                <select value={value || "حقیقی"} onChange={(event) => changeField(key, event.target.value)} className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
                  <option value="حقیقی">حقیقی</option>
                  <option value="حقوقی">حقوقی</option>
                </select>
              ) : key === "جنسیت" ? (
                <select
                  value={value}
                  onChange={(event) => changeField(key, event.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                >
                  <option value="">انتخاب جنسیت</option>
                  <option value="مرد">مرد</option>
                  <option value="زن">زن</option>
                </select>
              ) : key === "وضعیت کنونی" ? (
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
                          const next: Record<string, string> = { ...current, "نام باجه": exact.name, "کد باجه": exact.code };
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
                            const next: Record<string, string> = { ...current, "نام باجه": first.name, "کد باجه": first.code };
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
                                const next: Record<string, string> = { ...current, "نام باجه": counter.name, "کد باجه": counter.code };
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
              ) : key === "نوع تسهیلات" ? (
                <div className="relative">
                  <input
                    role="combobox"
                    aria-autocomplete="list"
                    aria-expanded={facilityOpen}
                    aria-controls="bayegani-facility-code-options"
                    value={facilityQuery || value}
                    onFocus={() => setFacilityOpen(true)}
                    onChange={(event) => {
                      const query = event.target.value;
                      setFacilityQuery(query);
                      setFacilityOpen(true);
                      const exact = facilityCodes.find((item) =>
                        `${item.code}-${item.name}`.toLocaleLowerCase() === query.trim().toLocaleLowerCase()
                        || item.name.toLocaleLowerCase() === query.trim().toLocaleLowerCase()
                      );
                      changeField(key, exact ? `${exact.code}-${exact.name}` : "");
                    }}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setFacilityOpen(false);
                      if (event.key === "Enter" && facilityOpen) {
                        const query = facilityQuery.trim().toLocaleLowerCase();
                        const first = facilityCodes.find((item) =>
                          `${item.code} ${item.name}`.toLocaleLowerCase().includes(query)
                          || `${item.code}-${item.name}`.toLocaleLowerCase().includes(query)
                        );
                        if (first) {
                          event.preventDefault();
                          const selected = `${first.code}-${first.name}`;
                          setFacilityQuery(selected);
                          changeField(key, selected);
                          setFacilityOpen(false);
                        }
                      }
                    }}
                    onBlur={() => {
                      window.setTimeout(() => setFacilityOpen(false), 120);
                    }}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    placeholder="کد یا نام نوع تسهیلات را جستجو کنید..."
                    autoComplete="off"
                  />
                  {facilityOpen && (
                    <div
                      id="bayegani-facility-code-options"
                      role="listbox"
                      className="absolute inset-x-0 top-full z-50 mt-1 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl"
                    >
                      {facilityCodes.filter((item) => {
                        const query = facilityQuery.trim().toLocaleLowerCase();
                        return !query || `${item.code} ${item.name}`.toLocaleLowerCase().includes(query)
                          || `${item.code}-${item.name}`.toLocaleLowerCase().includes(query);
                      }).slice(0, 50).map((item) => {
                        const option = `${item.code}-${item.name}`;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            role="option"
                            aria-selected={value === option}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => {
                              setFacilityQuery(option);
                              changeField(key, option);
                              setFacilityOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-right text-sm text-slate-700 transition hover:bg-blue-50 focus:bg-blue-50 focus:outline-none"
                          >
                            <span className="font-medium">{option}</span>
                            {value === option && <span className="text-xs text-blue-600">انتخاب‌شده</span>}
                          </button>
                        );
                      })}
                      {facilityCodes.filter((item) => {
                        const query = facilityQuery.trim().toLocaleLowerCase();
                        return !query || `${item.code} ${item.name}`.toLocaleLowerCase().includes(query)
                          || `${item.code}-${item.name}`.toLocaleLowerCase().includes(query);
                      }).length === 0 && (
                        <p className="px-3 py-4 text-center text-sm text-slate-500">موردی پیدا نشد.</p>
                      )}
                    </div>
                  )}
                </div>
              ) : key === "تاریخ شروع" || key === "تاریخ تحویل وثیقه" ? (
                <PersianDatePicker
                  value={value}
                  onChange={(date) => changeField(key, date)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  placeholder={key === "تاریخ شروع" ? "انتخاب تاریخ شروع" : "انتخاب تاریخ تحویل وثیقه"}
                  aria-label={key === "تاریخ شروع" ? "تاریخ شروع" : "تاریخ تحویل وثیقه"}
                  disabled={key === "تاریخ تحویل وثیقه" && fields["وضعیت کنونی"] !== "تسویه شده"}
                />
              ) : (
                <input
                  value={key === "مبلغ مصوب" ? formatAmount(value) : value}
                  pattern={key === "کد ملی" ? "[0-9]{10}" : key === "شماره تسهیلات" ? "[0-9]+\\.[0-9]+\\.[0-9]+\\.[0-9]+" : undefined}
                  maxLength={key === "کد ملی" ? 10 : undefined}
                  inputMode={key === "کد ملی" ? "numeric" : undefined}
                  title={key === "کد ملی" ? "کد ملی باید دقیقاً ۱۰ رقم انگلیسی باشد." : undefined}
                  disabled={key === "کد بایگانی" || key === "سریال" || key === "پایان قرارداد"}
                  onChange={(event) => changeField(key, event.target.value)}
                  onKeyDown={(event) => {
                    if (key === "مبلغ مصوب" && event.key === "*") {
                      event.preventDefault();
                      changeField(key, `${normalizeAmount(fields["مبلغ مصوب"])}000`);
                    }
                  }}
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
          <button type="submit" disabled={saving || !canSave} className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600 disabled:opacity-100">{saving ? "در حال ذخیره..." : "ذخیره اطلاعات"}</button>
          <Link href="/dashboard/bayegani" className="rounded-xl border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50">انصراف</Link>
        </div>
      </form>
    </div>
  );
}
