"use client";

import { ExamVisualPanel } from "@/components/ExamVisualPanel";
import { PromptPlayer } from "@/components/PromptPlayer";
import type { ListenRepeatPrompt } from "@/lib/prompts";
import { getListenRepeatSceneVisual } from "@/lib/visualAssets";

export interface ListenRepeatVisualPanelProps {
  prompt: ListenRepeatPrompt;
  examMode: boolean;
  showTranscript: boolean;
  autoPlay?: boolean;
  onAudioEnded?: () => void;
  className?: string;
}

export function ListenRepeatVisualPanel({
  prompt,
  examMode,
  showTranscript,
  autoPlay = examMode,
  onAudioEnded,
  className = "",
}: ListenRepeatVisualPanelProps) {
  const scene = getListenRepeatSceneVisual(prompt.setId, prompt.sentenceIndex);

  return (
    <div className={`${examMode ? "space-y-3" : "space-y-4"} ${className}`}>
      <ExamVisualPanel
        variant="topic"
        topicImageUrl={scene.topicImageUrl}
        topicLabel={scene.sceneLabel}
        themeLabel={examMode ? prompt.scenario : prompt.title}
        compact={examMode}
      />

      <section
        className={`rounded-xl border border-slate-200 bg-white shadow-sm ${
          examMode ? "p-4" : "p-5 sm:p-6"
        }`}
      >
        {examMode && (
          <p className="text-xs font-medium text-slate-600">
            Listen & Repeat · Q{prompt.sentenceIndex}/7 — listen once, then repeat
          </p>
        )}
        {!examMode && showTranscript && (
          <PromptPlayer
            prompt={prompt}
            showTranscript
            autoPlay={autoPlay}
            examMode={examMode}
            onEnded={onAudioEnded}
          />
        )}
        {examMode && (
          <PromptPlayer
            prompt={prompt}
            showTranscript={false}
            autoPlay={autoPlay}
            examMode
            onEnded={onAudioEnded}
            className="mt-3"
          />
        )}
        {!examMode && !showTranscript && (
          <PromptPlayer
            prompt={prompt}
            showTranscript={false}
            autoPlay={autoPlay}
            examMode={examMode}
            onEnded={onAudioEnded}
          />
        )}
      </section>
    </div>
  );
}
