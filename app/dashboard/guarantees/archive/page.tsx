"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

type GuaranteeRecord = {
  id: number;
  rowNumber: string | null;
  economicSectorCode: string | null;
  facilityNumber: string | null;
  iban: string | null;
  facilityTitle: string | null;
  currentStatus: string | null;
  startDate: string | null;
  paymentCount: string | null;
  duration: string | null;
  approvedAmount: string | null;
  remainingAmount: string | null;
  subFacilityType: string | null;
  customerNumber: string | null;
  fileSerial: string | null;
  endDate: string | null;
  mainFacilityType: string | null;
  branchCode: string | null;
  additionalDescription: string | null;
  lastModifiedDate: string | null;
  archiveNumber: string | null;
  notificationLetterDate: string | null;
  notificationLetterNumber: string | null;
  requirements: string | null;
  approvalAuthority: string | null;
  nationalCode: string | null;
  requestDate: string | null;
};

const columns: { key: keyof GuaranteeRecord; label: string }[] = [
  { key: "rowNumber", label: "ردیف" },
  { key: "economicSectorCode", label: "کد بخش اقتصادی" },
  { key: "facilityNumber", label: "شماره تسهیلات" },
  { key: "iban", label: "کد IBAN" },
  { key: "facilityTitle", label: "عنوان تسهیلات" },
  { key: "currentStatus", label: "وضعیت کنونی" },
  { key: "startDate", label: "تاریخ شروع" },
  { key: "paymentCount", label: "تعداد پرداخت‌ها" },
  { key: "duration", label: "مدت" },
  { key: "approvedAmount", label: "مبلغ مصوب" },
  { key: "remainingAmount", label: "مانده تسهیلات" },
  { key: "subFacilityType", label: "نوع فرعی تسهیلات" },
  { key: "customerNumber", label: "شماره مشتری" },
  { key: "fileSerial", label: "سریال پرونده" },
  { key: "endDate", label: "تاریخ پایان قرارداد" },
  { key: "mainFacilityType", label: "نوع اصلی تسهیلات" },
  { key: "branchCode", label: "کد شعبه" },
  { key: "additionalDescription", label: "توضیحات بیشتر" },
  { key: "lastModifiedDate", label: "تاریخ آخرین تغییر" },
  { key: "archiveNumber", label: "شماره بایگانی" },
  { key: "notificationLetterDate", label: "تاریخ نامه ابلاغیه" },
  { key: "notificationLetterNumber", label: "شماره نامه ابلاغیه" },
  { key: "requirements", label: "ملزومات پرونده" },
  { key: "approvalAuthority", label: "مرجع تصویب‌کننده" },
  { key: "nationalCode", label: "کد ملی مشتری" },
  { key: "requestDate", label: "تاریخ درخواست" },
];

export default function BayeganiGuaranteesPage() {
  const [records, setRecords] = useState<GuaranteeRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const firstRecord = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastRecord = Math.min(page * pageSize, total);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: String(pageSize),
        search,
      });
      const response = await fetch(`/api/bayegani-guarantees?${params.toString()}`, { cache: "no-store" });
      const result = await response.json().catch(() => null);
      if (!result) throw new Error(`پاسخ نامعتبر از سرور دریافت شد (HTTP ${response.status}).`);
      if (!response.ok || !result.success) throw new Error(result.error || "دریافت اطلاعات ناموفق بود.");
      setRecords(result.records);
      setTotal(result.total);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "خطا در دریافت اطلاعات ضمانتنامه.");
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search]);

  useEffect(() => {
    void loadRecords();
  }, [loadRecords]);

  async function uploadFile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!file) {
      setError("فایل Excel را انتخاب کنید.");
      return;
    }

    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/bayegani-guarantees", { method: "POST", body: form });
      const result = await response.json().catch(() => null);
      if (!result) throw new Error(`پاسخ نامعتبر از سرور دریافت شد (HTTP ${response.status}).`);
      if (!response.ok || !result.success) throw new Error(result.error || "بارگذاری فایل ناموفق بود.");

      setMessage(`عملیات با موفقیت انجام شد؛ ${result.created} رکورد جدید اضافه و ${result.updated} رکورد به‌روزرسانی شد. مجموع ردیف‌های فایل: ${result.detected}.`);
      setFile(null);
      const input = document.getElementById("guarantee-excel-file") as HTMLInputElement | null;
      if (input) input.value = "";
      setPage(1);
      await loadRecords();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "خطا در بارگذاری فایل.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <main dir="rtl" className="space-y-6">
      <header>
        <p className="text-sm font-semibold text-emerald-700">ضمانتنامه</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">بایگانی ضمانتنامه</h1>
        <p className="mt-2 text-sm text-slate-500">
          ثبت و مشاهده اطلاعات ضمانتنامه‌ها بر اساس شماره تسهیلات
        </p>
      </header>

      <form onSubmit={uploadFile} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="font-bold text-slate-900">بارگذاری فایل Excel ضمانتنامه</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          فایل Excel شامل ستون‌های بایگانی ضمانتنامه را انتخاب کنید. رکوردهای دارای شماره تسهیلات مشابه به‌روزرسانی می‌شوند و رکوردهای جدید اضافه خواهند شد؛ رکوردهایی که در فایل نیستند حذف نمی‌شوند.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            id="guarantee-excel-file"
            type="file"
            accept=".xlsx,.xls"
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            disabled={uploading}
            className="min-w-0 flex-1 rounded-xl border border-slate-300 bg-white p-3 text-sm"
          />
          <button
            type="submit"
            disabled={uploading || !file}
            className="rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {uploading ? "در حال ثبت اطلاعات..." : "بارگذاری و ذخیره در پایگاه داده"}
          </button>
        </div>
        {message && <p className="mt-3 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{message}</p>}
        {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-bold text-slate-900">فهرست ضمانتنامه‌ها</h2>
              <p className="mt-1 text-xs text-slate-500">تعداد کل رکوردها: {total.toLocaleString("fa-IR")}</p>
            </div>
            <button
              type="button"
              onClick={() => void loadRecords()}
              disabled={loading}
              className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              {loading ? "در حال دریافت..." : "به‌روزرسانی جدول"}
            </button>
          </div>
          <div className="mt-4 border-t border-slate-100 pt-4">
            <input
              value={search}
              onChange={(event) => { setSearch(event.target.value); setPage(1); }}
              placeholder="جستجو بر اساس شماره تسهیلات، عنوان، شماره مشتری، کد ملی، بایگانی یا شعبه..."
              aria-label="جستجوی ضمانتنامه"
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {error && <p className="m-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">در حال دریافت اطلاعات...</div>
        ) : records.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">رکوردی پیدا نشد. فایل Excel را بارگذاری کنید یا عبارت جستجو را تغییر دهید.</div>
        ) : (
          <div className="max-h-[70vh] overflow-auto">
            <table className="w-full min-w-[2600px] text-right text-xs">
              <thead className="sticky top-0 z-10 bg-slate-50 text-slate-700">
                <tr>
                  {columns.map((column) => (
                    <th key={column.key} className="whitespace-nowrap border-b border-slate-200 px-3 py-3 font-bold">{column.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {records.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50">
                    {columns.map((column) => (
                      <td key={column.key} className="max-w-[320px] whitespace-nowrap px-3 py-3 text-slate-700" title={record[column.key] ?? ""}>
                        {record[column.key] || "—"}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-col gap-3 border-t border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => setPage(1)} disabled={page <= 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">اولین</button>
            <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page <= 1} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">قبلی</button>
            <span className="px-2 text-sm text-slate-600">صفحه {page.toLocaleString("fa-IR")} از {totalPages.toLocaleString("fa-IR")}</span>
            <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page >= totalPages} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">بعدی</button>
            <button type="button" onClick={() => setPage(totalPages)} disabled={page >= totalPages} className="rounded-lg border border-slate-300 px-3 py-2 text-sm disabled:opacity-40">آخرین</button>
            <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }} aria-label="تعداد رکورد در هر صفحه" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm">
              <option value={10}>۱۰ در صفحه</option>
              <option value={20}>۲۰ در صفحه</option>
              <option value={50}>۵۰ در صفحه</option>
              <option value={100}>۱۰۰ در صفحه</option>
            </select>
          </div>
          <p className="text-sm text-slate-600">
            نمایش {firstRecord.toLocaleString("fa-IR")} تا {lastRecord.toLocaleString("fa-IR")} از {total.toLocaleString("fa-IR")} رکورد
          </p>
        </div>
      </section>
    </main>
  );
}
