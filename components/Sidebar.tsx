"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useTheme } from "@/components/ThemeProvider";

const menuItems = [
  { title: "داشبورد", href: "/dashboard", icon: "▦", description: "نمای کلی سامانه" },
  { title: "قراردادها", href: "/dashboard/contracts", icon: "▤", description: "مشاهده قراردادهای ثبت‌شده" },
  { title: "ثبت قرارداد", href: "/dashboard/upload", icon: "+", description: "ثبت از طریق فایل Excel" },
  { title: "اسناد خرید دین", href: "/dashboard/debt-documents/upload", icon: "⇧", description: "بارگذاری اسناد خرید دین" },
  { title: "بایگانی تسهیلات", href: "/dashboard/bayegani", icon: "▣", description: "ورود و ویرایش فایل بایگانی" },
];

function isActivePath(pathname: string, href: string) {
  // Keep Dashboard active only on /dashboard, not on its child routes.
  if (href === "/dashboard") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:hidden">
        <button
          type="button"
          aria-label={mobileOpen ? "بستن منو" : "باز کردن منو"}
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen((open) => !open)}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-xl text-slate-700 hover:bg-slate-50"
        >
          {mobileOpen ? "×" : "☰"}
        </button>
        <Link href="/dashboard" className="font-bold text-slate-900">
          سامانه مدیریت قراردادها
        </Link>
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={theme === "dark" ? "فعال‌سازی تم روشن" : "فعال‌سازی تم تیره"}
          title={theme === "dark" ? "تم روشن" : "تم تیره"}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-lg text-slate-700 transition hover:bg-slate-100"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
      </header>

      {mobileOpen && (
        <button
          type="button"
          aria-label="بستن منو"
          onClick={() => setMobileOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed right-0 top-0 z-40 flex h-screen w-72 max-w-[85vw] flex-col border-l border-slate-200 bg-white shadow-xl transition-transform duration-200 lg:w-64 lg:translate-x-0 lg:shadow-none ${
          mobileOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"
        }`}
      >
        <div className="border-b border-slate-100 px-6 py-6">
          <Link href="/dashboard" onClick={() => setMobileOpen(false)} className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 text-xl font-bold text-white shadow-sm">
              پ
            </span>
            <span>
              <span className="block text-base font-extrabold text-slate-900">سامانه قراردادها</span>
              <span className="mt-1 block text-xs text-slate-500">مدیریت و ثبت تسهیلات</span>
            </span>
          </Link>
        </div>

        <div className="px-4 pt-6">
          <p className="mb-3 px-3 text-[11px] font-bold tracking-wide text-slate-400">منوی اصلی</p>
          <nav aria-label="منوی اصلی">
            <ul className="space-y-1.5">
              {menuItems.map((item) => {
                const active = isActivePath(pathname, item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`group flex items-center gap-3 rounded-xl px-3 py-3 text-right transition ${
                        active
                          ? "bg-blue-600 text-white shadow-md shadow-blue-600/15"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                      }`}
                    >
                      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg ${active ? "bg-white/15 text-white" : "bg-slate-100 text-slate-600 group-hover:bg-white"}`} aria-hidden="true">
                        {item.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{item.title}</span>
                        <span className={`mt-0.5 block text-[11px] ${active ? "text-blue-100" : "text-slate-400"}`}>
                          {item.description}
                        </span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div className="mt-auto p-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="mb-3 flex w-full items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            aria-label={theme === "dark" ? "فعال‌سازی تم روشن" : "فعال‌سازی تم تیره"}
          >
            <span>{theme === "dark" ? "تم روشن" : "تم تیره"}</span>
            <span aria-hidden="true" className="text-lg">{theme === "dark" ? "☀" : "☾"}</span>
          </button>
          <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
            <p className="text-sm font-bold text-slate-800">راهنمای سامانه</p>
            <p className="mt-1 text-xs leading-6 text-slate-600">برای ایجاد قرارداد، از بخش ثبت قرارداد فایل Excel مربوطه را بارگذاری کنید.</p>
            <Link
              href="/dashboard/upload"
              onClick={() => setMobileOpen(false)}
              className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-blue-700 hover:text-blue-800"
            >
              شروع ثبت قرارداد <span aria-hidden="true">←</span>
            </Link>
          </div>
          <p className="mt-4 text-center text-[10px] text-slate-400">سامانه مدیریت قراردادها</p>
        </div>
      </aside>
    </>
  );
}
