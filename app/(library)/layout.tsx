"use client";

import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { SurveyProvider } from "@/components/survey/SurveyProvider";

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardShell>
      {children}
      <SurveyProvider />
    </DashboardShell>
  );
}
