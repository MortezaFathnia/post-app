import type { ReactNode } from "react";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-900">
      <Sidebar />
      <main className="min-h-screen px-4 pb-8 pt-20 sm:px-6 lg:mr-64 lg:px-8 lg:pt-8">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
