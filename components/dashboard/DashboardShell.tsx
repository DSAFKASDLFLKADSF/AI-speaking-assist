"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { isAdminUser } from "@/lib/auth/admins";
import { useAuthSession } from "@/lib/auth/useAuthSession";
import { HeaderActions } from "@/components/dashboard/HeaderActions";

const BASE_SIDEBAR_ITEMS = [
  {
    href: "/dashboard",
    label: "Test Library",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
      </svg>
    ),
  },
  {
    href: "/growth",
    label: "Growth",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
      </svg>
    ),
  },
] as const;

const ADMIN_SIDEBAR_ITEMS = [
  {
    href: "/admin/scoring-benchmark",
    label: "Dev benchmark",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    href: "/admin/survey-analytics",
    label: "Survey stats",
    icon: (
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
] as const;

function pageTitleForPath(pathname: string): string {
  if (pathname.startsWith("/admin/scoring-benchmark")) return "Developer benchmark";
  if (pathname.startsWith("/admin/survey-analytics")) return "Survey analytics";
  if (pathname.startsWith("/growth")) return "Growth";
  if (pathname.startsWith("/test/")) return "Practice Test";
  return "Test Library";
}

export interface DashboardShellProps {
  children: ReactNode;
}

export function DashboardShell({ children }: DashboardShellProps) {
  const pathname = usePathname();
  const { user } = useAuthSession();
  const isAdmin = Boolean(user && isAdminUser(user));
  const sidebarItems = isAdmin
    ? [...BASE_SIDEBAR_ITEMS, ...ADMIN_SIDEBAR_ITEMS]
    : [...BASE_SIDEBAR_ITEMS];
  const pageTitle = pageTitleForPath(pathname);

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === "/dashboard" || pathname.startsWith("/test/");
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="flex min-h-screen bg-slate-100">
      <aside className="fixed inset-y-0 left-0 z-40 flex w-14 flex-col items-center border-r border-slate-200 bg-white py-4 md:w-16">
        <Link
          href="/"
          className="mb-6 flex h-9 w-9 items-center justify-center rounded-lg bg-[#1e3a5f] text-xs font-bold text-white transition-opacity hover:opacity-90"
          title="TOEFL Speaking AI — Home"
          aria-label="TOEFL Speaking AI — Home"
        >
          T
        </Link>
        <nav className="flex flex-1 flex-col gap-2" aria-label="App sections">
          {sidebarItems.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                aria-current={active ? "page" : undefined}
                className={`flex h-10 w-10 items-center justify-center rounded-lg transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-600"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-800"
                }`}
              >
                {item.icon}
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col pl-14 md:pl-16">
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <Link
              href="/"
              className="shrink-0 text-sm font-semibold tracking-tight text-slate-900 transition-colors hover:text-blue-700 sm:text-base"
            >
              TOEFL Speaking AI
            </Link>
            <span className="text-slate-300" aria-hidden="true">
              /
            </span>
            <span className="truncate text-sm text-slate-600">{pageTitle}</span>
          </div>
          <HeaderActions />
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
