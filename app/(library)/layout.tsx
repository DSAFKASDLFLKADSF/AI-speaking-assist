"use client";

import { DashboardShell } from "@/components/dashboard/DashboardShell";

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardShell>{children}</DashboardShell>;
}
