"use client";

import { useState } from "react";
import PersianDatePicker from "@/components/PersianDatePicker";

type FormValues = {
  formDate: string;
  formNumber: string;
  company: string;
  requestNumber: string;
  requestDate: string;
  contractReference: string;
  extensionUntil: string;
  guaranteeType: string;
  guaranteeAmount: string;
  guaranteeDeposit: string;
  collateral: string;
  extensionCount: string;
  lastMaturityDate: string;
  guaranteeNumber: string;
  issueDate: string;
  tenderGuarantee: string;
  advancePayment: string;
  performanceGuarantee: string;
  withheldAmount: string;
  otherGuarantees: string;
  branch: string;
};

const dateFieldKeys = new Set<keyof FormValues>([
  "formDate",
  "requestDate",
  "extensionUntil",
  "lastMaturityDate",
  "issueDate",
]);

const initialValues: FormValues = {
  formDate: "", formNumber: "", company: "", requestNumber: "", requestDate: "",
  contractReference: "", extensionUntil: "", guaranteeType: "", guaranteeAmount: "",
  guaranteeDeposit: "", collateral: "", extensionCount: "", lastMaturityDate: "",
  guaranteeNumber: "", issueDate: "", tenderGuarantee: "", advancePayment: "",
  performanceGuarantee: "", withheldAmount: "", otherGuarantees: "", branch: "",
};

const fields: { key: keyof FormValues; label: string }[] = [
  { key: "formDate", label: "تاریخ فرم" },
  { key: "formNumber", label: "شماره فرم" },
  { key: "company", label: "نام شرکت / متقاضی" },
  { key: "requestNumber", label: "شماره درخواست" },
  { key: "requestDate", label: "تاریخ درخواست" },
  { key: "contractReference", label: "شماره قرارداد / مرجع" },
  { key: "extensionUntil", label: "تاریخ سررسید جدید" },
  { key: "guaranteeType", label: "نوع ضمانت‌نامه" },
  { key: "guaranteeAmount", label: "مبلغ ضمانت‌نامه (ریال)" },
  { key: "guaranteeDeposit", label: "سپرده ضمانت‌نامه (ریال)" },
  { key: "collateral", label: "وثایق / تضامین" },
  { key: "extensionCount", label: "تعداد دفعات تمدید" },
  { key: "lastMaturityDate", label: "تاریخ آخرین سررسید" },
  { key: "guaranteeNumber", label: "شماره ضمانت‌نامه" },
  { key: "issueDate", label: "تاریخ صدور ضمانت‌نامه" },
  { key: "tenderGuarantee", label: "شرکت در مناقصه / مزایده (ریال)" },
  { key: "advancePayment", label: "پیش‌پرداخت (ریال)" },
  { key: "performanceGuarantee", label: "حسن انجام کار (ریال)" },
  { key: "withheldAmount", label: "استرداد کسور وجه‌الضمان (ریال)" },
  { key: "otherGuarantees", label: "سایر ضمانت‌نامه‌ها (ریال)" },
  { key: "branch", label: "شعبه" },
];

const positions: {
  key: keyof FormValues;
  left: string;
  top: string;
  width: string;
  align?: "right" | "center";
}[] = [
  { key: "formDate", left: "12%", top: "31.5%", width: "28%" },
  { key: "formNumber", left: "12%", top: "34.5%", width: "28%" },
  { key: "company", left: "34%", top: "40.8%", width: "34%" },
  { key: "requestNumber", left: "12%", top: "40.8%", width: "17%" },
  { key: "requestDate", left: "12%", top: "44.4%", width: "18%" },
  { key: "contractReference", left: "34%", top: "44.4%", width: "35%" },
  { key: "extensionUntil", left: "34%", top: "47.8%", width: "35%" },
  { key: "guaranteeType", left: "52%", top: "56.5%", width: "33%" },
  { key: "guaranteeAmount", left: "52%", top: "60.3%", width: "33%" },
  { key: "guaranteeDeposit", left: "52%", top: "64.1%", width: "33%" },
  { key: "collateral", left: "52%", top: "67.9%", width: "33%" },
  { key: "extensionCount", left: "12%", top: "56.5%", width: "34%" },
  { key: "lastMaturityDate", left: "12%", top: "60.3%", width: "34%" },
  { key: "guaranteeNumber", left: "12%", top: "64.1%", width: "34%" },
  { key: "issueDate", left: "12%", top: "67.9%", width: "34%" },
  { key: "tenderGuarantee", left: "52%", top: "77.8%", width: "33%" },
  { key: "advancePayment", left: "52%", top: "81.6%", width: "33%" },
  { key: "performanceGuarantee", left: "52%", top: "85.4%", width: "33%" },
  { key: "withheldAmount", left: "12%", top: "77.8%", width: "34%" },
  { key: "otherGuarantees", left: "12%", top: "81.6%", width: "34%" },
  { key: "branch", left: "29%", top: "89.4%", width: "30%", align: "center" },
];

export default function GuaranteeExtensionPage() {
  const [values, setValues] = useState<FormValues>(initialValues);
  const update = (key: keyof FormValues, value: string) =>
    setValues((current) => ({ ...current, [key]: value }));

  return (
    <main dir="rtl" className="space-y-5">
      <header className="no-print flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-emerald-700">ضمانتنامه</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">تمدید ضمانتنامه</h1>
          <p className="mt-2 text-sm text-slate-500">مقادیر را در فرم وارد کنید؛ جایگاه آن‌ها روی تصویر نمونه نمایش داده می‌شود.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white hover:bg-emerald-800">چاپ فرم A4</button>
          <button type="button" onClick={() => setValues(initialValues)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">پاک‌کردن فرم</button>
        </div>
      </header>

      <section className="no-print rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <h2 className="mb-4 font-bold text-slate-800">ورود اطلاعات</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {fields.map((field) => (
            <label key={field.key} className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-600">{field.label}</span>
              {dateFieldKeys.has(field.key) ? (
                <PersianDatePicker
                  value={values[field.key]}
                  onChange={(value) => update(field.key, value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                  placeholder="انتخاب تاریخ"
                />
              ) : (
                <input
                  value={values[field.key]}
                  onChange={(event) => update(field.key, event.target.value)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
                />
              )}
            </label>
          ))}
        </div>
      </section>

      <section className="no-print text-center text-xs text-amber-700">
        تصویر پس‌زمینه باید در مسیر public/guarantee-extension-background.jpeg قرار داشته باشد.
      </section>

      <section className="guarantee-a4 mx-auto relative w-full overflow-hidden bg-white shadow-xl" aria-label="پیش‌نمایش فرم تمدید ضمانتنامه">
        <img
          src="/guarantee-extension-background.jpeg"
          alt="فرم خام تمدید ضمانت‌نامه بانک"
          className="absolute inset-0 h-full w-full object-fill"
        />
        {positions.map((position) => (
          dateFieldKeys.has(position.key) ? (
            <PersianDatePicker
              key={position.key}
              value={values[position.key]}
              onChange={(value) => update(position.key, value)}
              aria-label={fields.find((field) => field.key === position.key)?.label}
              className="guarantee-overlay min-w-0 border-b border-dashed border-slate-500/50 bg-white/20 px-1 py-0 text-[clamp(7px,0.85vw,12px)] leading-tight text-slate-950 outline-none focus:bg-white/75 focus:ring-1 focus:ring-emerald-600"
              containerClassName="absolute z-20"
              containerStyle={{
                left: position.left,
                top: position.top,
                width: position.width,
                height: "1.45%",
              }}
              style={{
                width: "100%",
                height: "100%",
                textAlign: position.align || "right",
              }}
            />
          ) : (
            <input
              key={position.key}
              aria-label={fields.find((field) => field.key === position.key)?.label}
              title={fields.find((field) => field.key === position.key)?.label}
              value={values[position.key]}
              onChange={(event) => update(position.key, event.target.value)}
              className="guarantee-overlay absolute z-10 min-w-0 border-b border-dashed border-slate-500/50 bg-white/20 px-1 py-0 text-[clamp(7px,0.85vw,12px)] leading-tight text-slate-950 outline-none focus:bg-white/75 focus:ring-1 focus:ring-emerald-600"
              style={{
                left: position.left,
                top: position.top,
                width: position.width,
                height: "1.45%",
                textAlign: position.align || "right",
              }}
            />
          )
        ))}
      </section>

      <style jsx global>{`
        .guarantee-a4 {
          width: min(100%, 794px);
          aspect-ratio: 210 / 297;
        }
        @page { size: A4 portrait; margin: 0; }
        @media print {
          html, body { width: 210mm !important; height: 297mm !important; margin: 0 !important; padding: 0 !important; background: #fff !important; }
          body * { visibility: hidden !important; }
          .guarantee-a4, .guarantee-a4 * { visibility: visible !important; }
          .guarantee-a4 {
            position: fixed !important;
            inset: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            max-width: none !important;
            margin: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
            print-color-adjust: exact !important;
            -webkit-print-color-adjust: exact !important;
          }
          .guarantee-overlay {
            border: 0 !important;
            background: transparent !important;
            box-shadow: none !important;
            color: #111 !important;
            font-size: 9pt !important;
            padding: 0 1mm !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>
    </main>
  );
}
