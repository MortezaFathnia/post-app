"use client";

type TemplateToolbarProps = {
  backUrl: string;
};

export default function TemplateToolbar({
  backUrl,
}: TemplateToolbarProps) {
  return (
    <div className="template-toolbar">
      <button
        type="button"
        onClick={() => window.print()}
      >
        چاپ
      </button>

      <a href={backUrl}>
        بازگشت
      </a>
    </div>
  );
}