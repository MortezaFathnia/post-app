"use client";

import Link from "next/link";
import PersianDatePicker from "@/components/PersianDatePicker";
import { useEffect, useMemo, useState } from "react";

type CounterOption = { id: number; code: string; name: string };
type BankOption = { id: number; bankId: string; name: string };
type FacilityPersonOption = { name: string; facilityNumbers: string[] };
type CheckRow = {
  id: string;
  checkNumber: string;
  amount: string;
  day: string;
  month: string;
  year: string;
  serial: string;
  bankCode: string;
  bankSearch: string;
  branchCode: string;
  accountNumber: string;
  saved: boolean;
  days: number | null;
  deduction: number;
  payment: number;
  valid: boolean;
  violation: boolean;
};
type ApiResult = { success?: boolean; error?: string; createdCount?: number; duplicateCheckNumbers?: string[] };

const inputClass = "w-full min-w-[72px] rounded-lg border border-slate-300 bg-white px-2 py-2 text-center text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100";
const digits = (value: string) => value.replace(/[۰-۹]/g, d => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, d => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const numberValue = (value: string) => Number(digits(value).replace(/[^0-9]/g, "")) || 0;
const formatAmount = (value: string) => {
  const raw = digits(value).replace(/[^0-9]/g, "");
  return raw ? Number(raw).toLocaleString("en-US") : "";
};
function isLeapJalali(year: number) { return [1,5,9,13,17,22,26,30].includes(year % 33); }
function monthDays(year: number, month: number) { return month <= 6 ? 31 : month <= 11 ? 30 : isLeapJalali(year) ? 30 : 29; }
function jalaliDayNumber(year: number, month: number, day: number) {
  const e = year - 474, ep = 474 + (e % 2820), offset = month <= 7 ? (month - 1) * 31 : (month - 1) * 30 + 6;
  return day + offset + Math.floor((ep * 682 - 110) / 2816) + (ep - 1) * 365 + Math.floor(e / 2820) * 1029983 + 1948320 - 1;
}
function todayJalali() {
  const parts = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", { year:"numeric", month:"numeric", day:"numeric" }).formatToParts(new Date());
  const get = (key: string) => Number(parts.find(p => p.type === key)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
}
function newId() { return `row-${Date.now()}-${Math.random().toString(36).slice(2)}`; }
function blankRow(base: {year:number;month:number;day:number}): CheckRow {
  let year = base.year, month = base.month + 1;
  if (month > 12) { month = 1; year += 1; }
  return { id:newId(), checkNumber:"", amount:"100,000,000", day:String(Math.min(base.day, monthDays(year,month))), month:String(month), year:String(year), serial:"", bankCode:"", bankSearch:"", branchCode:"", accountNumber:"", saved:false, days:null, deduction:0, payment:0, valid:false, violation:false };
}

export default function AddDebtCheckPage() {
  const initialDate = useMemo(() => todayJalali(), []);
  const [baseDay,setBaseDay] = useState(String(initialDate.day));
  const [baseMonth,setBaseMonth] = useState(String(initialDate.month));
  const [baseYear,setBaseYear] = useState(String(initialDate.year));
  const [profitRate,setProfitRate] = useState("23");
  const [maxAmount,setMaxAmount] = useState("5,000,000,000");
  const [maxMonths,setMaxMonths] = useState("6");
  const [rows,setRows] = useState<CheckRow[]>([blankRow(initialDate)]);
  const [counters,setCounters] = useState<CounterOption[]>([]);
  const [banks,setBanks] = useState<BankOption[]>([]);
  const [bankOpenId,setBankOpenId] = useState<string | null>(null);
  const [facilityPeople,setFacilityPeople] = useState<FacilityPersonOption[]>([]);
  const [counterLabel,setCounterLabel] = useState("");
  const [facilityName,setFacilityName] = useState("");
  const [facilityNumber,setFacilityNumber] = useState("");
  const [facilityOpen,setFacilityOpen] = useState(false);
  const [loadingOptions,setLoadingOptions] = useState(true);
  const [loadingFacilities,setLoadingFacilities] = useState(false);
  const [saving,setSaving] = useState(false);
  const [error,setError] = useState("");
  const [message,setMessage] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      fetch("/api/bayegani/counters",{cache:"no-store",signal:controller.signal}).then(r=>r.json()),
      fetch("/api/banks",{cache:"no-store",signal:controller.signal}).then(r=>r.json())
    ]).then(([counterResult,bankResult]) => {
      if (!counterResult.success) throw new Error(counterResult.error || "دریافت باجه‌ها ناموفق بود.");
      if (!bankResult.success) throw new Error(bankResult.error || "دریافت بانک‌ها ناموفق بود.");
      setCounters(counterResult.counters || []);
      setBanks(bankResult.banks || []);
    }).catch(e => { if(!controller.signal.aborted) setError(e instanceof Error ? e.message : "دریافت اطلاعات اولیه ناموفق بود."); })
      .finally(() => { if(!controller.signal.aborted) setLoadingOptions(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const query = facilityName.trim();
    if (query.length < 2) { setFacilityPeople([]); return; }
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setLoadingFacilities(true);
      try {
        const response = await fetch(`/api/debt-discounting-facilities/search?q=${encodeURIComponent(query)}`,{cache:"no-store",signal:controller.signal});
        const result = await response.json();
        if(!response.ok || !result.success) throw new Error(result.error || "جست‌وجوی تسهیلات ناموفق بود.");
        setFacilityPeople(result.people || []);
      } catch(e) {
        if(!controller.signal.aborted) setError(e instanceof Error ? e.message : "جست‌وجوی تسهیلات ناموفق بود.");
      } finally { if(!controller.signal.aborted) setLoadingFacilities(false); }
    },250);
    return () => { window.clearTimeout(timeout); controller.abort(); };
  },[facilityName]);

  const base = { year:numberValue(baseYear), month:numberValue(baseMonth), day:numberValue(baseDay) };
  const baseValid = base.year >= 1300 && base.month >= 1 && base.month <= 12 && base.day >= 1 && base.day <= monthDays(base.year,base.month);
  const totalAmount = rows.reduce((sum,row)=>sum + numberValue(row.amount),0);
  const maxAmountValue = numberValue(maxAmount);
  const totalViolation = maxAmountValue > 0 && totalAmount > maxAmountValue;
  const duplicate = rows.some((row,index)=>row.checkNumber.trim() && rows.findIndex(other=>other.checkNumber.trim()===row.checkNumber.trim())!==index);
  const pendingRows = rows.filter(row=>!row.saved);
  const validPending = pendingRows.filter(row=>row.valid && !row.violation && row.checkNumber.trim() && row.serial.trim() && row.bankCode && row.accountNumber.trim());

  function recalculate(source: CheckRow[], settings = {baseDay,baseMonth,baseYear,profitRate,maxMonths}) {
    const b = {year:numberValue(settings.baseYear),month:numberValue(settings.baseMonth),day:numberValue(settings.baseDay)};
    const okBase = b.year >= 1300 && b.month>=1 && b.month<=12 && b.day>=1 && b.day<=monthDays(b.year,b.month);
    return source.map(row=>{
      const year=numberValue(row.year), month=numberValue(row.month), day=numberValue(row.day), amount=numberValue(row.amount);
      const validDate = year>=1300 && month>=1 && month<=12 && day>=1 && day<=monthDays(year,month);
      if(!okBase || !validDate || amount<=0) return {...row,valid:false,days:null,deduction:0,payment:0,violation:false};
      const days=jalaliDayNumber(year,month,day)-jalaliDayNumber(b.year,b.month,b.day)-1;
      if(days<0) return {...row,valid:false,days, deduction:0,payment:0,violation:false};
      const daily=(Number(settings.profitRate)||0)/100/365, rt=daily*days;
      const deduction=amount*(rt/(1+rt)), payment=amount/(1+rt);
      const limit=numberValue(settings.maxMonths)*30;
      return {...row,valid:true,days,deduction,payment,violation:limit>0 && days>limit};
    });
  }
  function updateSettings(change: Partial<{baseDay:string;baseMonth:string;baseYear:string;profitRate:string;maxMonths:string}>) {
    const settings={baseDay,baseMonth,baseYear,profitRate,maxMonths,...change};
    setBaseDay(settings.baseDay); setBaseMonth(settings.baseMonth); setBaseYear(settings.baseYear);
    setProfitRate(settings.profitRate); setMaxMonths(settings.maxMonths);
    setRows(current=>recalculate(current,settings));
  }
  function updateRow(id:string,patch:Partial<CheckRow>) {
    setRows(current=>recalculate(current.map(row=>row.id===id ? {...row,...patch} : row)));
  }
  function exportTxt() {
    const lines=rows.map(row=>{
      const date=`${numberValue(row.year)}-${String(numberValue(row.month)).padStart(2,"0")}-${String(numberValue(row.day)).padStart(2,"0")}`;
      const cells=[row.checkNumber||"0",String(numberValue(row.amount)),row.serial||"0",date,"L","0",date,"0","0",row.bankCode||"0",row.branchCode||"0","TRUE",row.accountNumber||"0",row.serial||"0"];
      return cells.join(",");
    });
    if(!lines.length) return;
    const blob=new Blob(["\uFEFF"+lines.join("\r\n")+"\r\n"],{type:"text/plain;charset=utf-8"});
    const url=URL.createObjectURL(blob),anchor=document.createElement("a");
    anchor.href=url; anchor.download="تنزیل_چک.txt"; anchor.click(); URL.revokeObjectURL(url);
  }
  function importTxt() {
    const picker=document.createElement("input");
    picker.type="file"; picker.accept=".txt,text/plain";
    picker.onchange=()=>{
      const file=picker.files?.[0]; if(!file) return;
      const reader=new FileReader();
      reader.onload=()=>{
        const imported=(String(reader.result||"")).replace(/^\uFEFF/,"").split(/\r?\n/).flatMap(line=>{
          const parts=line.trim().split(",");
          if(parts.length<14) return [];
          const date=(parts[3]||"").trim().replace(/\//g,"-").split("-");
          if(date.length!==3) return [];
          return [{
            id:newId(),checkNumber:(parts[0]||"").trim(),amount:formatAmount(parts[1]||""),
            day:date[2],month:date[1],year:date[0],serial:(parts[2]||"").trim(),
            bankCode:(parts[9]||"").trim(),bankSearch:"",branchCode:(parts[10]||"").trim(),
            accountNumber:(parts[12]||"").trim(),saved:false,
            days:null,deduction:0,payment:0,valid:false,violation:false
          } satisfies CheckRow];
        });
        if(imported.length) {
          setRows(current=>recalculate([...current.filter(row=>row.checkNumber||row.serial||numberValue(row.amount)!==100000000),...imported]));
          setMessage(`${imported.length.toLocaleString("fa-IR")} چک از فایل متنی بارگذاری شد.`);
          setError("");
        } else setError("هیچ ردیف معتبر در فایل متنی پیدا نشد.");
      };
      reader.readAsText(file,"UTF-8");
    };
    picker.click();
  }

  async function saveSingleRow(row: CheckRow) {
    if(!counterLabel || !facilityNumber) { setError("ابتدا کدباجه و کد تسهیلات را انتخاب کنید."); return; }
    if(duplicate || totalViolation || row.violation) { setError("شماره چک تکراری یا محدودیت مبلغ/تاریخ وجود دارد؛ ابتدا آن را اصلاح کنید."); return; }
    if(!row.valid || !row.checkNumber.trim() || !row.serial.trim() || !row.bankCode || !row.accountNumber.trim()) {
      setError("اطلاعات این چک، از جمله شماره حساب، کامل نیست یا تاریخ معتبر نیست."); return;
    }
    setSaving(true); setError(""); setMessage("");
    try {
      const response=await fetch("/api/debt-documents/checks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        mode:"discount-calculator",counterLabel,facilityNumber,
        records:[{
          checkNumber:row.checkNumber,amount:String(numberValue(row.amount)),day:numberValue(row.day),month:numberValue(row.month),year:numberValue(row.year),
          serial:row.serial,bankCode:row.bankCode,bankName:banks.find(b=>b.bankId===row.bankCode)?.name || "",
          branchCode:row.branchCode,accountNumber:row.accountNumber,days:row.days,deduction:Math.floor(row.deduction),payment:Math.floor(row.payment)
        }]
      })});
      const result=(await response.json()) as ApiResult;
      if(!response.ok || !result.success) throw new Error(result.error || "ذخیره چک ناموفق بود.");
      if(result.duplicateCheckNumbers?.includes(row.checkNumber)) throw new Error("این شماره چک قبلاً در پایگاه داده ثبت شده است.");
      setRows(current=>current.map(item=>item.id===row.id?{...item,saved:true}:item));
      setMessage("چک با موفقیت در پایگاه داده ثبت شد.");
    } catch(e) { setError(e instanceof Error ? e.message : "ذخیره چک ناموفق بود."); }
    finally { setSaving(false); }
  }

  async function saveAllRows() {
    if(!counterLabel || !facilityNumber) { setError("ابتدا کدباجه و کد تسهیلات را انتخاب کنید."); return; }
    if(duplicate || totalViolation || pendingRows.some(row=>row.violation)) { setError("شماره چک تکراری یا محدودیت مبلغ/تاریخ وجود دارد؛ ابتدا آن را اصلاح کنید."); return; }
    if(!pendingRows.length) { setError("چکی برای ذخیره وجود ندارد."); return; }
    if(validPending.length !== pendingRows.length) { setError("اطلاعات همه چک‌ها، از جمله شماره حساب، باید کامل و تاریخ آن‌ها در محدوده مجاز باشد."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const response=await fetch("/api/debt-documents/checks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        mode:"discount-calculator",counterLabel,facilityNumber,
        records:validPending.map(row=>({
          checkNumber:row.checkNumber,amount:String(numberValue(row.amount)),day:numberValue(row.day),month:numberValue(row.month),year:numberValue(row.year),
          serial:row.serial,bankCode:row.bankCode,bankName:banks.find(b=>b.bankId===row.bankCode)?.name || "",
          branchCode:row.branchCode,accountNumber:row.accountNumber,days:row.days,deduction:Math.floor(row.deduction),payment:Math.floor(row.payment)
        }))
      })});
      const result=(await response.json()) as ApiResult;
      if(!response.ok || !result.success) throw new Error(result.error || "ذخیره چک‌ها ناموفق بود.");
      const savedCount=result.createdCount || 0;
      const duplicateNumbers=new Set(result.duplicateCheckNumbers||[]);
      setRows(current=>current.map(row=>!row.saved && validPending.some(saved=>saved.id===row.id) && !duplicateNumbers.has(row.checkNumber) ? {...row,saved:true} : row));
      const duplicates=result.duplicateCheckNumbers?.length ? ` شماره‌های تکراری رد شدند: ${result.duplicateCheckNumbers.join("، ")}.` : "";
      setMessage(`${savedCount.toLocaleString("fa-IR")} چک در پایگاه داده ذخیره شد.${duplicates}`);
    } catch(e) { setError(e instanceof Error ? e.message : "ذخیره چک‌ها ناموفق بود."); }
    finally { setSaving(false); }
  }

  const amountViolation = totalViolation;
  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-indigo-700">خرید دین</p>
          <h1 className="mt-1 text-2xl font-extrabold text-slate-900">تنزیل چک (خرید دین)</h1>
          <p className="mt-2 text-sm text-slate-500">محاسبه مبلغ کسرشده و مبلغ پرداختی؛ ذخیره در پایگاه داده فقط با انتخاب چک‌ها انجام می‌شود.</p>
        </div>
        <Link href="/dashboard/debt-documents" className="inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">مشاهده فهرست اسناد</Link>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold text-slate-900">اطلاعات تسهیلات و تنظیمات محاسبه</h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="space-y-2 text-sm font-semibold text-slate-700">کدباجه - نام باجه
            <select className={inputClass} value={counterLabel} onChange={e=>setCounterLabel(e.target.value)} disabled={loadingOptions}>
              <option value="">{loadingOptions?"در حال دریافت...":"انتخاب باجه"}</option>
              {counters.map(c=><option key={c.id} value={`${c.code}-${c.name}`}>{c.code}-{c.name}</option>)}
            </select>
          </label>
          <div className="relative space-y-2 text-sm font-semibold text-slate-700">
            <label htmlFor="facility-person">نام شخص</label>
            <input id="facility-person" className={inputClass} value={facilityName} placeholder="جست‌وجوی نام شخص" autoComplete="off" onFocus={()=>setFacilityOpen(true)} onChange={e=>{setFacilityName(e.target.value);setFacilityNumber("");setFacilityOpen(true);}} onKeyDown={e=>{if(e.key==="Escape")setFacilityOpen(false);if(e.key==="Enter"&&facilityPeople[0]){e.preventDefault();setFacilityName(facilityPeople[0].name);setFacilityNumber("");setFacilityOpen(false);}}}/>
            {facilityOpen && facilityName.trim().length>=2 && <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
              {facilityPeople.map(person=><button type="button" key={person.name} onClick={()=>{setFacilityName(person.name);setFacilityNumber("");setFacilityOpen(false);}} className="block w-full rounded-lg px-3 py-2 text-right text-sm hover:bg-indigo-50">{person.name}</button>)}
              {loadingFacilities&&<p className="p-2 text-xs text-slate-500">در حال جست‌وجو...</p>}
            </div>}
          </div>
          <label className="space-y-2 text-sm font-semibold text-slate-700">کد تسهیلات خرید دین
            <select className={inputClass} value={facilityNumber} onChange={e=>setFacilityNumber(e.target.value)} disabled={!facilityPeople.some(p=>p.name===facilityName.trim())}>
              <option value="">انتخاب کد تسهیلات</option>
              {facilityPeople.find(p=>p.name===facilityName.trim())?.facilityNumbers.map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">تاریخ مبنا محاسبه
            <PersianDatePicker
              value={baseYear + "/" + String(numberValue(baseMonth)).padStart(2,"0") + "/" + String(numberValue(baseDay)).padStart(2,"0")}
              onChange={value=>{
                const parts=value.split("/");
                if(parts.length===3) updateSettings({baseYear:parts[0],baseMonth:String(Number(parts[1])),baseDay:String(Number(parts[2]))});
                else updateSettings({baseYear:"",baseMonth:"",baseDay:""});
              }}
              className={inputClass + " text-right"}
              placeholder="انتخاب تاریخ مبنا"
              inputId="calculation-base-date"
              aria-label="تاریخ مبنا محاسبه"
            />
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">درصد سود سالانه (٪)
            <input className={inputClass} type="number" min="0" step="0.001" value={profitRate} onChange={e=>updateSettings({profitRate:e.target.value})}/>
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">حداکثر جمع مبلغ چک (ریال)
            <input className={inputClass} inputMode="numeric" value={maxAmount} onChange={e=>setMaxAmount(formatAmount(e.target.value))}/>
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">حداکثر ماه (تاریخ)
            <input className={inputClass} type="number" min="1" max="120" value={maxMonths} onChange={e=>updateSettings({maxMonths:e.target.value})}/>
          </label>
        </div>
        {!baseValid && <p className="mt-3 text-sm text-red-600">تاریخ مبنا معتبر نیست.</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col justify-between gap-3 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
          <div><h2 className="text-lg font-bold text-slate-900">فهرست چک‌ها</h2><p className="mt-1 text-xs text-slate-500">برای ثبت هر چک، دکمه آیکون‌دار ستون وضعیت همان ردیف را بزنید؛ امکان ذخیره همه چک‌ها نیز از پایین جدول وجود دارد.</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={importTxt} className="rounded-xl bg-cyan-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-cyan-800">ورود از TXT</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1340px] w-full border-collapse text-center text-sm">
            <thead className="bg-slate-50 text-slate-700"><tr>{["وضعیت","ردیف","شماره چک","مبلغ چک (ریال)","روز","ماه","سال","سری چک","بانک (کد - نام)","شماره حساب","تعداد روز","مبلغ کسرشده","مبلغ پرداختی","عملیات"].map(h=><th key={h} className="whitespace-nowrap border-b border-slate-200 px-4 py-3 font-semibold">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((row,index)=><tr key={row.id} className={`${row.violation?"bg-red-50":index%2?"bg-slate-50":"bg-white"} border-b border-slate-100 transition-colors hover:bg-slate-100/70`}>
                <td className="px-2 py-2">
                  {row.saved
                    ? <span className="text-xs font-semibold text-teal-700">ذخیره شد</span>
                    : <button type="button" onClick={()=>saveSingleRow(row)} disabled={saving||!counterLabel||!facilityNumber} aria-label="ذخیره چک" title="ذخیره چک" className="inline-flex items-center justify-center rounded-lg bg-green-600 p-2.5 text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300">
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
                      </button>}
                </td>
                <td className="px-2 py-2">{(index+1).toLocaleString("fa-IR")}</td>
                <td className="px-1 py-2"><input className={inputClass} value={row.checkNumber} disabled={row.saved} onChange={e=>updateRow(row.id,{checkNumber:e.target.value})}/></td>
                <td className="px-1 py-2"><input className={inputClass} inputMode="numeric" value={row.amount} disabled={row.saved} onChange={e=>updateRow(row.id,{amount:formatAmount(e.target.value)})}/></td>
                <td className="px-1 py-2"><input className={inputClass} type="number" min="1" max="31" value={row.day} disabled={row.saved} onChange={e=>updateRow(row.id,{day:e.target.value})}/></td>
                <td className="px-1 py-2"><input className={inputClass} type="number" min="1" max="12" value={row.month} disabled={row.saved} onChange={e=>updateRow(row.id,{month:e.target.value})}/></td>
                <td className="px-1 py-2"><input className={inputClass} type="number" min="1300" max="1500" value={row.year} disabled={row.saved} onChange={e=>updateRow(row.id,{year:e.target.value})}/></td>
                <td className="px-1 py-2"><input className={inputClass} value={row.serial} disabled={row.saved} onChange={e=>updateRow(row.id,{serial:e.target.value})}/></td>
                <td className="relative min-w-[230px] px-1 py-2">
                  <input className={inputClass+" text-right"} value={row.bankSearch || (banks.find(b=>b.bankId===row.bankCode) ? banks.find(b=>b.bankId===row.bankCode)!.bankId+" - "+banks.find(b=>b.bankId===row.bankCode)!.name : "")} placeholder="جست‌وجوی کد یا نام بانک" autoComplete="off" disabled={row.saved||loadingOptions} onFocus={()=>setBankOpenId(row.id)} onChange={e=>{updateRow(row.id,{bankCode:"",bankSearch:e.target.value});setBankOpenId(row.id);}} onKeyDown={e=>{if(e.key==="Escape")setBankOpenId(null);if(e.key==="Enter"&&banks.filter(b=>(b.bankId+" "+b.name).toLocaleLowerCase().includes(row.bankSearch.toLocaleLowerCase()))[0]){e.preventDefault();const b=banks.filter(x=>(x.bankId+" "+x.name).toLocaleLowerCase().includes(row.bankSearch.toLocaleLowerCase()))[0];updateRow(row.id,{bankCode:b.bankId,bankSearch:b.bankId+" - "+b.name});setBankOpenId(null);}}}/>
                  {bankOpenId===row.id&&!row.saved&&<div className="absolute inset-x-1 top-full z-40 mt-1 max-h-56 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 text-right shadow-xl">
                    {banks.filter(b=>!row.bankSearch.trim()||(b.bankId+" "+b.name).toLocaleLowerCase().includes(row.bankSearch.toLocaleLowerCase())).map(b=><button type="button" key={b.id} onMouseDown={e=>e.preventDefault()} onClick={()=>{updateRow(row.id,{bankCode:b.bankId,bankSearch:b.bankId+" - "+b.name});setBankOpenId(null);}} className="block w-full rounded-lg px-3 py-2 text-right text-sm text-slate-700 hover:bg-indigo-50">{b.bankId} - {b.name}</button>)}
                    {!banks.length&&<p className="p-2 text-xs text-slate-500">فهرست بانک‌ها در دسترس نیست.</p>}
                    {banks.length>0&&row.bankSearch.trim()&&!banks.some(b=>(b.bankId+" "+b.name).toLocaleLowerCase().includes(row.bankSearch.toLocaleLowerCase()))&&<p className="p-2 text-xs text-slate-500">بانکی یافت نشد.</p>}
                  </div>}
                </td>
                <td className="px-1 py-2"><input className={inputClass} value={row.accountNumber} disabled={row.saved} onChange={e=>updateRow(row.id,{accountNumber:e.target.value})}/></td>
                <td className="whitespace-nowrap px-2 py-2">{row.days===null?"—":row.days.toLocaleString("fa-IR")}</td>
                <td className="whitespace-nowrap px-2 py-2 font-semibold">{row.valid?Math.floor(row.deduction).toLocaleString("fa-IR"):"—"}</td>
                <td className="whitespace-nowrap px-2 py-2 font-semibold">{row.valid?Math.floor(row.payment).toLocaleString("fa-IR"):"—"}</td>
                <td className="px-2 py-2"><button type="button" disabled={row.saved||saving} onClick={()=>setRows(current=>current.filter(r=>r.id!==row.id))} className="rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40">حذف</button></td>
              </tr>)}
            </tbody>
            <tfoot className="bg-slate-50 font-bold text-slate-800"><tr><td colSpan={3} className="px-3 py-3">جمع کل</td><td className="px-3 py-3">{totalAmount.toLocaleString("fa-IR")}</td><td colSpan={7}></td><td className="px-3 py-3">{Math.floor(rows.reduce((s,r)=>s+r.deduction,0)).toLocaleString("fa-IR")}</td><td className="px-3 py-3">{Math.floor(rows.reduce((s,r)=>s+r.payment,0)).toLocaleString("fa-IR")}</td><td></td></tr></tfoot>
          </table>
        </div>
        <div className="space-y-1 border-t border-slate-200 p-4 text-sm">
          <p className="text-slate-700">جمع مبلغ چک‌ها: <strong>{totalAmount.toLocaleString("fa-IR")} ریال</strong>{maxAmountValue>0&&<> | حداکثر مجاز: {maxAmountValue.toLocaleString("fa-IR")} ریال | باقی‌مانده: {Math.max(0,maxAmountValue-totalAmount).toLocaleString("fa-IR")} ریال</>}</p>
          {(duplicate||amountViolation||rows.some(r=>r.violation))&&<p className="text-red-600">{duplicate?"شماره چک تکراری وجود دارد. ":""}{amountViolation?"جمع مبلغ چک‌ها از سقف مجاز بیشتر است. ":""}{rows.some(r=>r.violation)?"تاریخ سررسید یک یا چند چک از سقف ماه تعیین‌شده عبور کرده است.":""}</p>}
          <p className="text-slate-500">تعداد چک‌های در انتظار ذخیره: {pendingRows.length.toLocaleString("fa-IR")} | تعداد ذخیره‌شده: {rows.filter(r=>r.saved).length.toLocaleString("fa-IR")}</p>
        </div>
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-500">خروجی TXT شامل تمام ردیف‌های جدول است؛ با ذخیره، تمام ردیف‌های تکمیل‌شده در پایگاه داده ثبت می‌شوند.</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportTxt} disabled={!rows.length} className="rounded-lg border border-violet-300 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 hover:bg-violet-50 disabled:cursor-not-allowed disabled:opacity-40">خروجی TXT</button>
            <button type="button" onClick={saveAllRows} disabled={saving||!pendingRows.length||!counterLabel||!facilityNumber} className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-500 disabled:shadow-none">{saving?"در حال ذخیره...":`ذخیره همه چک‌ها (${pendingRows.length})`}</button>
          </div>
        </div>
      </section>
      {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message&&<div role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}
    </div>
  );
}
