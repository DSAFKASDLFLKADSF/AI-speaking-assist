import { DashboardGrid } from "@/components/dashboard/DashboardGrid";

export const metadata = {
  title: "Test Library | TOEFL Speaking AI",
};

export default function DashboardPage() {
  return (
    <div className="mx-auto max-w-[1600px]">
      <header className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
          TOEFL iBT · Speaking Section
        </p>
        <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
          Practice Test Library
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">
          Four full official ETS Speaking practice sets (Jan 2026 format): Listen
          & Repeat (Q1–Q7) and Virtual Interview (Q8–Q11) from ETS public PDFs.
        </p>
      </header>

      <DashboardGrid />
    </div>
  );
}
