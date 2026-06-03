import Image from "next/image";
import { EXAMINER_IMAGE_URL } from "@/lib/visualAssets";

export type ExamVisualVariant = "examiner" | "topic";

export interface ExamVisualPanelProps {
  variant: ExamVisualVariant;
  topicImageUrl?: string;
  topicLabel?: string;
  themeLabel?: string;
  compact?: boolean;
  className?: string;
}

export function ExamVisualPanel({
  variant,
  topicImageUrl,
  topicLabel,
  themeLabel,
  compact = false,
  className = "",
}: ExamVisualPanelProps) {
  const src = variant === "examiner" ? EXAMINER_IMAGE_URL : (topicImageUrl ?? EXAMINER_IMAGE_URL);
  const alt =
    variant === "examiner"
      ? "Interview examiner"
      : topicLabel
        ? `Topic: ${topicLabel}`
        : "Topic illustration";

  return (
    <section
      className={`overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-sm ${className}`}
    >
      <div
        className={`relative w-full ${
          compact ? "h-28" : "aspect-[16/10] sm:aspect-[2/1]"
        }`}
      >
        <Image
          src={src}
          alt={alt}
          fill
          className="object-cover object-center opacity-95"
          priority
          unoptimized
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900/80 via-slate-900/20 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-3 sm:p-4">
          {variant === "examiner" ? (
            <>
              <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-300">
                Virtual Interview
              </p>
              <p className="mt-1 text-sm font-medium text-white">
                Listen to each question — text is not shown on the real test
              </p>
            </>
          ) : (
            <>
              {themeLabel && (
                <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-300">
                  {themeLabel}
                </p>
              )}
              {topicLabel && (
                <p className="mt-1 text-sm font-medium text-white">{topicLabel}</p>
              )}
            </>
          )}
        </div>
      </div>
    </section>
  );
}
