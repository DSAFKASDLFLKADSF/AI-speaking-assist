"use client";

import { ExamVisualPanel } from "@/components/ExamVisualPanel";
import { PromptPlayer } from "@/components/PromptPlayer";
import type { ListenRepeatPrompt } from "@/lib/prompts";
import { getTopicImageUrl } from "@/lib/visualAssets";

export interface ListenRepeatVisualPanelProps {
  prompt: ListenRepeatPrompt;
  examMode: boolean;
  showTranscript: boolean;
  className?: string;
}

export function ListenRepeatVisualPanel({
  prompt,
  examMode,
  showTranscript,
  className = "",
}: ListenRepeatVisualPanelProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <ExamVisualPanel
        variant="topic"
        topicImageUrl={getTopicImageUrl(prompt.topic)}
        topicLabel={prompt.topic}
        themeLabel={prompt.title}
      />

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Listen & Repeat · {examMode ? "Section mock" : "Practice"}
        </p>
        {examMode && (
          <p className="mt-2 text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">
            Transcript hidden during the run — listen to the model audio only.
          </p>
        )}
        <PromptPlayer
          prompt={prompt}
          showTranscript={!examMode && showTranscript}
          className="mt-4"
        />
      </section>
    </div>
  );
}
