"use client";

type UploadLoadingOverlayProps = {
  open: boolean;
  title?: string;
  description?: string;
};

export default function UploadLoadingOverlay({
  open,
  title = "در حال بارگذاری فایل Excel...",
  description = "لطفاً تا پایان پردازش فایل، این صفحه را نبندید.",
}: UploadLoadingOverlayProps) {
  if (!open) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"
      dir="rtl"
    >
      <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        <div className="mx-auto mb-5 h-14 w-14 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600 dark:border-slate-700 dark:border-t-blue-400" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-700">
          <div className="h-full w-1/3 animate-[upload-progress_1.4s_ease-in-out_infinite] rounded-full bg-blue-600 dark:bg-blue-400" />
        </div>
        <style jsx>{`
          @keyframes upload-progress {
            0% { transform: translateX(300%); }
            100% { transform: translateX(-300%); }
          }
        `}</style>
      </div>
    </div>
  );
}
