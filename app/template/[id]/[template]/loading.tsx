export default function TemplateLoading() {
  return (
    <main className="app-loading" role="status" aria-live="polite" dir="rtl">
      <div className="app-loading__content">
        <span className="app-loading__spinner" aria-hidden="true" />
        <p className="app-loading__label">در حال آماده‌سازی سند و صفحات A4…</p>
      </div>
    </main>
  );
}
