"use client";

export type SurveyFABVariant = "pre" | "post";

export interface SurveyFABProps {
  variant: SurveyFABVariant;
  onClick: () => void;
}

function SurveyIcon() {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M9 12h6M9 16h4" />
    </svg>
  );
}

const COPY: Record<
  SurveyFABVariant,
  { title: string; subtitle: string; aria: string }
> = {
  pre: {
    title: "使用前测",
    subtitle: "约 3–5 分钟",
    aria: "填写使用前测问卷",
  },
  post: {
    title: "使用后测",
    subtitle: "约 3 分钟",
    aria: "填写使用后测问卷",
  },
};

export function SurveyFAB({ variant, onClick }: SurveyFABProps) {
  const copy = COPY[variant];

  return (
    <div className="fixed bottom-6 right-6 z-[90] flex flex-col items-end gap-2">
      <button
        type="button"
        onClick={onClick}
        title={copy.aria}
        aria-label={copy.aria}
        className="group relative flex items-center gap-3 rounded-2xl border border-white/10 bg-gradient-to-br from-[#1e3a5f] via-[#243f66] to-[#1a3354] py-2.5 pl-2.5 pr-4 text-white shadow-[0_8px_30px_rgba(30,58,95,0.35)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_36px_rgba(30,58,95,0.45)] active:scale-[0.98]"
      >
        <span
          className="pointer-events-none absolute inset-0 rounded-2xl bg-white/0 transition-colors group-hover:bg-white/[0.04]"
          aria-hidden
        />

        <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/12 ring-1 ring-white/20 backdrop-blur-sm">
          <SurveyIcon />
        </span>

        <span className="relative min-w-0 text-left leading-tight">
          <span className="block text-sm font-semibold tracking-tight">
            {copy.title}
          </span>
          <span className="mt-0.5 block text-[11px] font-normal text-white/70">
            {copy.subtitle}
          </span>
        </span>

        <span
          className="relative ml-0.5 text-white/50 transition-transform group-hover:translate-x-0.5"
          aria-hidden
        >
          <svg
            className="h-4 w-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </span>

        <span
          className="absolute -right-1 -top-1 flex h-3 w-3"
          aria-hidden
        >
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-60" />
          <span className="relative inline-flex h-3 w-3 rounded-full bg-amber-400 ring-2 ring-[#1e3a5f]" />
        </span>
      </button>
    </div>
  );
}
