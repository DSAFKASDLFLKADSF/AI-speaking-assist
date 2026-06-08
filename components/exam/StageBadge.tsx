import type { ExamStageLabel } from "@/lib/examFlow";

const STAGE_STYLES: Record<ExamStageLabel, string> = {
  Instruction: "bg-slate-100 text-slate-700",
  Listening: "bg-blue-100 text-blue-800",
  Preparation: "bg-violet-100 text-violet-800",
  Recording: "bg-red-100 text-red-800",
  Review: "bg-amber-100 text-amber-900",
  Analyzing: "bg-indigo-100 text-indigo-800",
  Completed: "bg-emerald-100 text-emerald-800",
};

export function StageBadge({ label }: { label: ExamStageLabel }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${STAGE_STYLES[label]}`}
    >
      {label}
    </span>
  );
}
