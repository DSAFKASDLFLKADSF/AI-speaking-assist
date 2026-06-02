import type { PracticeFormat } from "@/lib/practiceConfig";
import { PRACTICE_FORMAT_LABEL } from "@/lib/practiceConfig";

export interface PracticeFormatSelectorProps {
  value: PracticeFormat;
  onChange: (value: PracticeFormat) => void;
  disabled?: boolean;
  sectionDescription: string;
  singleDescription: string;
}

export function PracticeFormatSelector({
  value,
  onChange,
  disabled = false,
  sectionDescription,
  singleDescription,
}: PracticeFormatSelectorProps) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <h2 className="text-sm font-medium text-slate-900">Practice format</h2>
      <p className="mt-1 text-xs text-slate-500">
        Section mock runs every item in one sitting, like the real test section.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {(["section", "single"] as const).map((format) => (
          <button
            key={format}
            type="button"
            disabled={disabled}
            onClick={() => onChange(format)}
            className={`rounded-lg border p-4 text-left transition-colors disabled:opacity-50 ${
              value === format
                ? "border-slate-900 bg-slate-50 ring-1 ring-slate-900"
                : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <p className="text-sm font-medium text-slate-900">
              {PRACTICE_FORMAT_LABEL[format]}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {format === "section" ? sectionDescription : singleDescription}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
