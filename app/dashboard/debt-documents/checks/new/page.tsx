"use client";

import Link from "next/link";
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
  branchCode: string;
  accountNumber: string;
  selected: boolean;
  saved: boolean;
  days: number | null;
  deduction: number;
  payment: number;
  valid: boolean;
  violation: boolean;
};
type ApiResult = { success?: boolean; error?: string; createdCount?: number; duplicateCheckNumbers?: string[] };

const inputClass = "w-full min-w-[72px] rounded-lg border border-slate-300 bg-white px-2 py-2 text-center text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const bankNames: Record<string, string> = {
  "61":"بانک شهر","18":"بانک تجارت","56":"بانک سامان","15":"بانک سپه ایران","19":"بانک صادرات ایران",
  "54":"بانک پارسیان","55":"بانک اقتصاد نوین","17":"بانک ملی ایران","12":"بانک ملت ایران","13":"بانک رفاه کارگران",
  "14":"بانک مسکن","11":"بانک صنعت و معدن","20":"بانک توسعه صادرات ایران","53":"بانک کارآفرین","16":"بانک کشاورزی",
  "21":"پست بانک ایران","22":"بانک توسعه تعاون","95":"بانک ایران و ونزوئلا","57":"بانک پاسارگاد",
  "60":"بانک قرض‌الحسنه مهر ایران","51":"موسسه اعتباری توسعه","66":"بانک دی","58":"بانک سرمایه","62":"بانک آینده",
  "59":"بانک سینا","64":"بانک گردشگری","69":"بانک ایران زمین","70":"بانک قرض‌الحسنه رسالت","78":"بانک خاورمیانه","75":"موسسه اعتباری ملل"
};
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
  return { id:newId(), checkNumber:"", amount:"100,000,000", day:String(Math.min(base.day, monthDays(year,month))), month:String(month), year:String(year), serial:"", bankCode:"", branchCode:"", accountNumber:"", selected:false, saved:false, days:null, deduction:0, payment:0, valid:false, violation:false };
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
  const selectedRows = rows.filter(row=>row.selected && !row.saved);
  const validSelected = selectedRows.filter(row=>row.valid && !row.violation && row.checkNumber.trim() && row.serial.trim() && row.bankCode && row.branchCode.trim());

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
  function addRow() {
    if(!baseValid || duplicate || totalViolation || rows.some(r=>r.violation)) return;
    setRows(current=>recalculate([...current,blankRow(base)]));
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
  async function saveSelected() {
    if(!counterLabel || !facilityNumber) { setError("ابتدا کدباجه و کد تسهیلات را انتخاب کنید."); return; }
    if(!selectedRows.length) { setError("حداقل یک چک را برای ذخیره انتخاب کنید."); return; }
    if(validSelected.length !== selectedRows.length) { setError("اطلاعات چک‌های انتخاب‌شده باید کامل و تاریخ آن‌ها در محدوده مجاز باشد."); return; }
    setSaving(true); setError(""); setMessage("");
    try {
      const response=await fetch("/api/debt-documents/checks",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        mode:"discount-calculator",counterLabel,facilityNumber,
        records:validSelected.map(row=>({
          checkNumber:row.checkNumber,amount:String(numberValue(row.amount)),day:numberValue(row.day),month:numberValue(row.month),year:numberValue(row.year),
          serial:row.serial,bankCode:row.bankCode,bankName:bankNames[row.bankCode] || banks.find(b=>b.bankId===row.bankCode)?.name || "",
          branchCode:row.branchCode,accountNumber:row.accountNumber,days:row.days,deduction:Math.floor(row.deduction),payment:Math.floor(row.payment)
        }))
      })});
      const result=(await response.json()) as ApiResult;
      if(!response.ok || !result.success) throw new Error(result.error || "ذخیره چک‌ها ناموفق بود.");
      const savedCount=result.createdCount || 0;
      setRows(current=>current.map(row=>row.selected && !row.saved && validSelected.some(saved=>saved.id===row.id) ? {...row,saved:true,selected:false} : row));
      const duplicates=result.duplicateCheckNumbers?.length ? ` شماره‌های تکراری رد شدند: ${result.duplicateCheckNumbers.join("، ")}.` : "";
      setMessage(`${savedCount.toLocaleString("fa-IR")} چک در پایگاه داده ذخیره شد.${duplicates}`);
    } catch(e) { setError(e instanceof Error ? e.message : "ذخیره چک‌ها ناموفق بود."); }
    finally { setSaving(false); }
  }

  const bankOptions = banks.length ? banks : Object.entries(bankNames).map(([bankId,name],index)=>({id:index,bankId,name}));
  const amountViolation = totalViolation;
  return (
    <div dir="rtl" className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-medium text-blue-700">خرید دین</p>
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
              {facilityPeople.map(person=><button type="button" key={person.name} onClick={()=>{setFacilityName(person.name);setFacilityNumber("");setFacilityOpen(false);}} className="block w-full rounded-lg px-3 py-2 text-right text-sm hover:bg-blue-50">{person.name}</button>)}
              {loadingFacilities&&<p className="p-2 text-xs text-slate-500">در حال جست‌وجو...</p>}
            </div>}
          </div>
          <label className="space-y-2 text-sm font-semibold text-slate-700">کد تسهیلات خرید دین
            <select className={inputClass} value={facilityNumber} onChange={e=>setFacilityNumber(e.target.value)} disabled={!facilityPeople.some(p=>p.name===facilityName.trim())}>
              <option value="">انتخاب کد تسهیلات</option>
              {facilityPeople.find(p=>p.name===facilityName.trim())?.facilityNumbers.map(n=><option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">تاریخ مبنا - روز
            <input className={inputClass} type="number" min="1" max="31" value={baseDay} onChange={e=>updateSettings({baseDay:e.target.value})}/>
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">تاریخ مبنا - ماه
            <input className={inputClass} type="number" min="1" max="12" value={baseMonth} onChange={e=>updateSettings({baseMonth:e.target.value})}/>
          </label>
          <label className="space-y-2 text-sm font-semibold text-slate-700">تاریخ مبنا - سال
            <input className={inputClass} type="number" min="1300" max="1500" value={baseYear} onChange={e=>updateSettings({baseYear:e.target.value})}/>
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
          <div><h2 className="text-lg font-bold text-slate-900">فهرست چک‌ها</h2><p className="mt-1 text-xs text-slate-500">تیک هر ردیف را فعال کنید تا هنگام ذخیره، آن چک به پایگاه داده اضافه شود.</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={addRow} disabled={!baseValid||duplicate||amountViolation||rows.some(r=>r.violation)} className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300">افزودن چک</button>
            <button type="button" onClick={exportTxt} disabled={!rows.length} className="rounded-xl bg-slate-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-40">خروجی TXT</button>
            <button type="button" onClick={saveSelected} disabled={saving||!selectedRows.length||!counterLabel||!facilityNumber} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-gray-300">{saving?"در حال ذخیره...":`ذخیره چک‌های انتخاب‌شده (${selectedRows.length})`}</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1450px] w-full border-collapse text-center text-xs">
            <thead className="bg-slate-100 text-slate-700"><tr>{["ذخیره","ردیف","شماره چک","مبلغ چک (ریال)","روز","ماه","سال","سری چک","کد بانک","نام بانک","کد شعبه","شماره حساب","تعداد روز","مبلغ کسرشده","مبلغ پرداختی","عملیات"].map(h=><th key={h} className="whitespace-nowrap border-b px-2 py-3">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((row,index)=><tr key={row.id} className={`${row.violation?"bg-red-50":index%2?"bg-slate-50":"bg-white"} border-b`}>
                <td className="px-2 py-2"><input aria-label="انتخاب برای ذخیره در پایگاه داده" type="checkbox" checked={row.selected||row.saved} disabled={row.saved||saving||!row.valid||row.violation} onChange={e=>updateRow(row.id,{selected:e.target.checked})}/>{row.saved&&<span className="mt-1 block text-[10px] text-emerald-700">ذخیره شد</span>}</td>
                <td className="px-2 py-2">{(index+1).toLocaleString("fa-IR")}</td>
                <td className="px-1 py-2"><input className={inputClass} value={row.checkNumber} disabled={row.saved} onChange={e=>updateRow(row.id,{checkNumber:e.target.value})}/></td>
                <td className="px-1 py-2"><input className={inputClass} inputMode="numeric" value={row.amount} disabled={row.saved} onChange={e=>updateRow(row.id,{amount:formatAmount(e.target.value)})}/></td>
                <td className="px-1 py-2"><input className={inputClass} type="number" min="1" max="31" value={row.day} disabled={row.saved} onChange={e=>updateRow(row.id,{day:e.target.value})}/></td>
                <td className="px-1 py-2"><input className={inputClass} type="number" min="1" max="12" value={row.month} disabled={row.saved} onChange={e=>updateRow(row.id,{month:e.target.value})}/></td>
                <td className="px-1 py-2"><input className={inputClass} type="number" min="1300" max="1500" value={row.year} disabled={row.saved} onChange={e=>updateRow(row.id,{year:e.target.value})}/></td>
                <td className="px-1 py-2"><input className={inputClass} value={row.serial} disabled={row.saved} onChange={e=>updateRow(row.id,{serial:e.target.value})}/></td>
                <td className="px-1 py-2"><select className={inputClass} value={row.bankCode} disabled={row.saved} onChange={e=>updateRow(row.id,{bankCode:e.target.value})}><option value="">بانک</option>{bankOptions.map(b=><option key={b.id} value={b.bankId}>{b.bankId}</option>)}</select></td>
                <td className="whitespace-nowrap px-2 py-2">{bankNames[row.bankCode]||banks.find(b=>b.bankId===row.bankCode)?.name||"—"}</td>
                <td className="px-1 py-2"><input className={inputClass} value={row.branchCode} disabled={row.saved} onChange={e=>updateRow(row.id,{branchCode:e.target.value})}/></td>
                <td className="px-1 py-2"><input className={inputClass} value={row.accountNumber} disabled={row.saved} onChange={e=>updateRow(row.id,{accountNumber:e.target.value})}/></td>
                <td className="whitespace-nowrap px-2 py-2">{row.days===null?"—":row.days.toLocaleString("fa-IR")}</td>
                <td className="whitespace-nowrap px-2 py-2 font-semibold">{row.valid?Math.floor(row.deduction).toLocaleString("fa-IR"):"—"}</td>
                <td className="whitespace-nowrap px-2 py-2 font-semibold">{row.valid?Math.floor(row.payment).toLocaleString("fa-IR"):"—"}</td>
                <td className="px-2 py-2"><button type="button" disabled={row.saved||saving} onClick={()=>setRows(current=>current.filter(r=>r.id!==row.id))} className="rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-700 hover:bg-red-100 disabled:opacity-40">حذف</button></td>
              </tr>)}
            </tbody>
            <tfoot className="bg-blue-50 font-bold"><tr><td colSpan={3} className="px-3 py-3">جمع کل</td><td className="px-3 py-3">{totalAmount.toLocaleString("fa-IR")}</td><td colSpan={9}></td><td className="px-3 py-3">{Math.floor(rows.reduce((s,r)=>s+r.deduction,0)).toLocaleString("fa-IR")}</td><td className="px-3 py-3">{Math.floor(rows.reduce((s,r)=>s+r.payment,0)).toLocaleString("fa-IR")}</td><td></td></tr></tfoot>
          </table>
        </div>
        <div className="space-y-1 border-t border-slate-200 p-4 text-sm">
          <p className="text-slate-700">جمع مبلغ چک‌ها: <strong>{totalAmount.toLocaleString("fa-IR")} ریال</strong>{maxAmountValue>0&&<> | حداکثر مجاز: {maxAmountValue.toLocaleString("fa-IR")} ریال | باقی‌مانده: {Math.max(0,maxAmountValue-totalAmount).toLocaleString("fa-IR")} ریال</>}</p>
          {(duplicate||amountViolation||rows.some(r=>r.violation))&&<p className="text-red-600">{duplicate?"شماره چک تکراری وجود دارد. ":""}{amountViolation?"جمع مبلغ چک‌ها از سقف مجاز بیشتر است. ":""}{rows.some(r=>r.violation)?"تاریخ سررسید یک یا چند چک از سقف ماه تعیین‌شده عبور کرده است.":""}</p>}
          <p className="text-slate-500">تعداد چک‌های انتخاب‌شده برای ذخیره: {selectedRows.length.toLocaleString("fa-IR")} | تعداد ذخیره‌شده: {rows.filter(r=>r.saved).length.toLocaleString("fa-IR")}</p>
        </div>
      </section>
      {error&&<div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
      {message&&<div role="status" className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{message}</div>}
    </div>
  );
}
