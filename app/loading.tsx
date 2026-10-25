export default function Loading() {
  return (
    <main className="app-loading" role="status" aria-live="polite" dir="rtl">
      <div className="app-loading__content">
        <span className="app-loading__spinner" aria-hidden="true" />
        <p className="app-loading__label">لطفاً صبر کنید، سامانه در حال بارگذاری است…</p>
      </div>
    </main>
  );
}
