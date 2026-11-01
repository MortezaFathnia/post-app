import Link from "next/link";

export default function DebtDocumentsReportsPage() {
  return (
    <div dir="rtl" className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">گزارش گیری اسناد خرید دین</h1>
        <p className="mt-2 text-sm text-slate-600">
          در این بخش گزارش‌های مربوط به اسناد خرید دین در دسترس قرار می‌گیرند.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-base font-bold text-slate-800">تنظیم گزارش‌ها</h2>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          صفحه گزارش‌گیری ایجاد شده است. برای پیاده‌سازی گزارش‌ها، معیارها و خروجی‌های موردنیاز باید مشخص شوند.
        </p>
        <Link
          href="/dashboard/debt-documents"
          className="mt-4 inline-flex rounded-xl border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-700 hover:bg-blue-50"
        >
          بازگشت به بایگانی اسناد خرید دین
        </Link>
      </section>
    </div>
  );
}
