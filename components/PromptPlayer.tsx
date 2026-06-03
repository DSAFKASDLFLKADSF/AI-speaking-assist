"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { PromptAudioPlayer } from "@/components/PromptAudioPlayer";
import {
  DEFAULT_PROMPT_ID,
  getPromptById,
  type ListenRepeatPrompt,
} from "@/lib/prompts";

export interface PromptPlayerProps {
  promptId?: string;
  prompt?: ListenRepeatPrompt;
  className?: string;
  showTranscript?: boolean;
  autoPlay?: boolean;
  examMode?: boolean;
  onPlayStateChange?: (playing: boolean) => void;
  onEnded?: () => void;
}

export function PromptPlayer({
  promptId = DEFAULT_PROMPT_ID,
  prompt: promptOverride,
  className = "",
  showTranscript = true,
  autoPlay = false,
  examMode = false,
  onPlayStateChange,
  onEnded,
}: PromptPlayerProps) {
  const prompt = promptOverride ?? getPromptById(promptId);
  const [playKey, setPlayKey] = useState(0);
  const prevIdRef = useRef<string | undefined>();

  useEffect(() => {
    if (prompt?.id !== prevIdRef.current) {
      prevIdRef.current = prompt?.id;
      setPlayKey((k) => k + 1);
    }
  }, [prompt?.id]);

  const handlePlayStateChange = useCallback(
    (playing: boolean) => {
      onPlayStateChange?.(playing);
    },
    [onPlayStateChange]
  );

  if (!prompt) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        Prompt not found: {promptId}
      </div>
    );
  }

  return (
    <div className={className}>
      {!examMode && (
        <>
          <div className="flex items-baseline justify-between gap-2">
            <h2 className="text-sm font-medium text-slate-900">{prompt.title}</h2>
            <span className="shrink-0 text-xs capitalize text-slate-500">
              {prompt.difficulty}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">{prompt.topic}</p>
        </>
      )}

      <PromptAudioPlayer
        key={`${prompt.id}-${playKey}`}
        text={prompt.transcript}
        speechKind="listen_repeat"
        speechId={prompt.id}
        audioSrc={prompt.audioSrc}
        label="Play model sentence"
        autoPlay={autoPlay}
        examMode={examMode}
        onPlayStateChange={handlePlayStateChange}
        onEnded={onEnded}
        className="mt-4"
      />

      {showTranscript && !examMode && (
        <p className="mt-4 rounded-lg bg-slate-50 p-3 text-sm leading-relaxed text-slate-700">
          {prompt.transcript}
        </p>
      )}
    </div>
  );
}
