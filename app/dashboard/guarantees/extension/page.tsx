"use client";

import { useState } from "react";

type Values = {
  formDate: string; formNumber: string; letterDate: string; letterNumber: string;
  organization: string; company: string; guaranteeRequestNumber: string; contractReference: string;
  requestDescription: string; extensionUntil: string; guaranteeType: string; guaranteeAmount: string;
  guaranteeDeposit: string; collateral: string; extensionCount: string; lastMaturityDate: string;
  guaranteeNumber: string; issueDate: string; tenderGuarantee: string; advancePayment: string;
  performanceGuarantee: string; withheldAmount: string; otherGuarantees: string; branch: string;
};

const initial: Values = {
  formDate:"", formNumber:"", letterDate:"", letterNumber:"", organization:"شهرداری مشهد",
  company:"", guaranteeRequestNumber:"", contractReference:"", requestDescription:"",
  extensionUntil:"", guaranteeType:"", guaranteeAmount:"", guaranteeDeposit:"", collateral:"",
  extensionCount:"", lastMaturityDate:"", guaranteeNumber:"", issueDate:"", tenderGuarantee:"",
  advancePayment:"", performanceGuarantee:"", withheldAmount:"", otherGuarantees:"", branch:""
};

const fields: {key:keyof Values; label:string; wide?:boolean}[] = [
  {key:"formDate",label:"تاریخ فرم"},{key:"formNumber",label:"شماره فرم"},
  {key:"letterDate",label:"تاریخ نامه"},{key:"letterNumber",label:"شماره نامه"},
  {key:"organization",label:"سازمان / دستگاه"},{key:"company",label:"نام شرکت / متقاضی",wide:true},
  {key:"guaranteeRequestNumber",label:"شماره درخواست / نامه ضمانت‌نامه"},
  {key:"contractReference",label:"شماره قرارداد / مرجع"},
  {key:"requestDescription",label:"شرح درخواست تمدید",wide:true},
  {key:"extensionUntil",label:"تمدید تا تاریخ و ساعت"},
  {key:"guaranteeType",label:"نوع ضمانت‌نامه"},{key:"guaranteeAmount",label:"مبلغ ضمانت‌نامه (ریال)"},
  {key:"guaranteeDeposit",label:"سپرده ضمانت‌نامه (ریال)"},{key:"collateral",label:"وثایق / تضامین"},
  {key:"extensionCount",label:"تعداد دفعات تمدید"},{key:"lastMaturityDate",label:"تاریخ آخرین سررسید"},
  {key:"guaranteeNumber",label:"شماره ضمانت‌نامه"},{key:"issueDate",label:"تاریخ صدور ضمانت‌نامه"},
  {key:"tenderGuarantee",label:"شرکت در مناقصه / مزایده (ریال)"},
  {key:"advancePayment",label:"پیش‌پرداخت (ریال)"},{key:"performanceGuarantee",label:"حسن انجام کار (ریال)"},
  {key:"withheldAmount",label:"استرداد کسور وجه‌الضمان (ریال)"},
  {key:"otherGuarantees",label:"سایر ضمانت‌نامه‌ها (ریال)"},{key:"branch",label:"شعبه"}
];

const inputClass = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100";

export default function GuaranteeExtensionPage() {
  const [values,setValues] = useState<Values>(initial);
  const update = (key:keyof Values,value:string) => setValues(v=>({...v,[key]:value}));
  return <div dir="rtl" className="space-y-6">
    <div className="no-print flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
      <div><p className="text-sm font-medium text-emerald-700">ضمانتنامه</p><h1 className="mt-1 text-2xl font-extrabold text-slate-900">تمدید ضمانتنامه</h1><p className="mt-2 text-sm text-slate-500">اطلاعات را مطابق فرم نمونه وارد کنید؛ سپس نسخه بدون تصویر پس‌زمینه را چاپ کنید.</p></div>
      <div className="flex gap-2"><button type="button" onClick={()=>window.print()} className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white">چاپ فرم</button><button type="button" onClick={()=>setValues(initial)} className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700">پاک‌کردن فرم</button></div>
    </div>
    <section className="no-print rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="mb-4 text-lg font-bold text-slate-800">ورود اطلاعات فرم</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {fields.map(f=><label key={f.key} className={f.wide?"sm:col-span-2":""}><span className="mb-1.5 block text-sm font-semibold text-slate-700">{f.label}</span>{f.key==="requestDescription"?<textarea rows={2} value={values[f.key]} onChange={e=>update(f.key,e.target.value)} className={inputClass}/>:<input value={values[f.key]} onChange={e=>update(f.key,e.target.value)} className={inputClass}/>}</label>)}
      </div>
    </section>
    <section className="guarantee-print-page mx-auto w-full max-w-[900px] border border-slate-300 bg-white p-6 text-black shadow-lg sm:p-10">
      <header className="border-b-2 border-emerald-700 pb-4 text-center">
        <div className="flex justify-between text-xs"><span>تاریخ: {values.formDate||"...................."}</span><span>شماره: {values.formNumber||"...................."}</span></div>
        <p className="mt-3 text-sm font-semibold">{values.organization||"شهرداری مشهد"}</p><h2 className="mt-2 text-2xl font-extrabold text-emerald-800">تمدید ضمانت‌نامه</h2>
      </header>
      <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-3 text-sm"><PrintValue label="تاریخ نامه" value={values.letterDate}/><PrintValue label="شماره نامه" value={values.letterNumber}/></div>
      <div className="mt-7 space-y-4 text-sm leading-8">
        <p>بدین‌وسیله با تقاضای شرکت <PrintInline value={values.company}/> به شماره <PrintInline value={values.guaranteeRequestNumber}/> مورخ <PrintInline value={values.letterDate}/> مبنی بر تمدید ضمانت‌نامه <PrintInline value={values.guaranteeNumber}/> مربوط به <PrintInline value={values.contractReference}/>، با شرح ذیل موافقت می‌گردد.</p>
        <p>تاریخ سررسید تا ساعت دوازده روز <PrintInline value={values.extensionUntil}/> تمدید می‌گردد.</p>
        {values.requestDescription&&<p>شرح درخواست: {values.requestDescription}</p>}
      </div>
      <div className="mt-6 rounded-lg border-2 border-emerald-700">
        <div className="bg-emerald-700 px-3 py-2 text-center font-bold text-white">مشخصات ضمانت‌نامه</div>
        <div className="grid grid-cols-2">{fields.slice(10,18).map(f=><div key={f.key} className="flex min-h-11 items-center justify-between gap-2 border-b border-l border-emerald-200 px-3 py-2 text-xs"><span className="font-semibold">{f.label}</span><span className="min-w-16 text-left">{values[f.key]||"................"}</span></div>)}</div>
      </div>
      <div className="mt-6 rounded-lg border-2 border-emerald-700">
        <div className="bg-emerald-700 px-3 py-2 text-center text-xs font-bold text-white">مشخصات انواع ضمانت‌نامه‌های مرتبط که در رابطه با این قرارداد از طرف بانک صادر و تاکنون باطل نشده است</div>
        <div className="grid grid-cols-2">{fields.slice(18,23).map(f=><div key={f.key} className="flex min-h-11 items-center justify-between gap-2 border-b border-l border-emerald-200 px-3 py-2 text-xs"><span className="font-semibold">{f.label}</span><span className="min-w-16 text-left">{values[f.key]||"................"}</span></div>)}</div>
      </div>
      <div className="mt-12 grid grid-cols-3 gap-4 text-center text-sm"><div className="border-t border-slate-500 pt-2">شعبه<br/>{values.branch||"................"}</div><div className="border-t border-slate-500 pt-2">امضاء ۱</div><div className="border-t border-slate-500 pt-2">امضاء ۲</div></div>
    </section>
    <style jsx global>{`
      @page { size:A4; margin:12mm; }
      @media print {
        html,body {background:#fff!important;color:#000!important}
        body * {visibility:hidden!important}
        .guarantee-print-page,.guarantee-print-page * {visibility:visible!important}
        .guarantee-print-page {position:absolute!important;inset:0 auto auto 0!important;width:100%!important;max-width:none!important;margin:0!important;padding:0!important;border:0!important;box-shadow:none!important;font-size:9pt!important}
        .no-print {display:none!important}
        .guarantee-print-page .bg-emerald-700 {background:#168b78!important;color:#fff!important}
      }
    `}</style>
  </div>;
}
function PrintValue({label,value}:{label:string;value:string}) {return <div className="flex items-end gap-2 border-b border-slate-400 pb-1"><strong className="shrink-0">{label}:</strong><span className="min-h-5 flex-1">{value||" "}</span></div>}
function PrintInline({value}:{value:string}) {return <span className="inline-block min-w-20 border-b border-slate-400 px-1 text-center leading-6">{value||"................"}</span>}
