"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  getNeuralSpeechUrl,
  type NeuralSpeechKind,
} from "@/lib/neuralSpeech";
import { cancelSpeech, probeAudioUrl, speakText } from "@/lib/speechSynthesis";

export interface PromptAudioPlayerProps {
  text: string;
  speechKind?: NeuralSpeechKind;
  speechId?: string;
  audioSrc?: string;
  label?: string;
  autoPlay?: boolean;
  disabled?: boolean;
  onPlayStateChange?: (playing: boolean) => void;
  onEnded?: () => void;
  /** Test mode: auto-play once, no replay controls */
  examMode?: boolean;
  className?: string;
}

export function PromptAudioPlayer({
  text,
  speechKind = "custom",
  speechId,
  audioSrc,
  label = "Play audio",
  autoPlay = false,
  disabled = false,
  onPlayStateChange,
  onEnded,
  examMode = false,
  className = "",
}: PromptAudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const [mode, setMode] = useState<"static" | "neural" | "browser">("static");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayedRef = useRef(false);
  const staticOkRef = useRef(false);
  const endedRef = useRef(false);

  const neuralUrl = getNeuralSpeechUrl({
    kind: speechKind,
    id: speechId,
    text: speechKind === "custom" ? text : undefined,
  });

  useEffect(() => {
    staticOkRef.current = false;
    endedRef.current = false;
    if (!audioSrc) return;
    void probeAudioUrl(audioSrc).then((ok) => {
      staticOkRef.current = ok;
    });
  }, [audioSrc]);

  const stop = useCallback(() => {
    if (examMode) return;
    cancelSpeech();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    onPlayStateChange?.(false);
  }, [examMode, onPlayStateChange]);

  const handleEnded = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    setPlaying(false);
    onPlayStateChange?.(false);
    onEnded?.();
  }, [onEnded, onPlayStateChange]);

  const playBrowserTts = useCallback(async () => {
    setMode("browser");
    setPlaying(true);
    onPlayStateChange?.(true);
    await speakText(text, { rate: 0.9, onEnd: handleEnded, onError: handleEnded });
  }, [text, handleEnded, onPlayStateChange]);

  const playUrl = useCallback(
    async (url: string, source: "static" | "neural") => {
      const audio = new Audio(url);
      audioRef.current = audio;
      audio.onended = () => handleEnded();
      audio.onerror = () => {
        if (source === "static") {
          void playUrl(neuralUrl, "neural").catch(() => void playBrowserTts());
          return;
        }
        void playBrowserTts();
      };
      setMode(source);
      setPlaying(true);
      onPlayStateChange?.(true);
      await audio.play();
    },
    [handleEnded, neuralUrl, onPlayStateChange, playBrowserTts]
  );

  const play = useCallback(async () => {
    if (disabled || !text.trim() || (examMode && endedRef.current)) return;
    if (!examMode) stop();

    if (audioSrc && staticOkRef.current) {
      try {
        await playUrl(audioSrc, "static");
        return;
      } catch {
        // try neural
      }
    }

    try {
      await playUrl(neuralUrl, "neural");
    } catch {
      if (audioSrc) {
        try {
          await playUrl(audioSrc, "static");
          return;
        } catch {
          // fall through
        }
      }
      await playBrowserTts();
    }
  }, [disabled, text, examMode, stop, audioSrc, playUrl, neuralUrl, playBrowserTts]);

  useEffect(() => {
    if (!autoPlay || disabled || autoPlayedRef.current) return;

    let cancelled = false;

    const run = async () => {
      if (audioSrc) {
        staticOkRef.current = await probeAudioUrl(audioSrc);
      }
      if (cancelled || autoPlayedRef.current) return;
      autoPlayedRef.current = true;
      await play();
    };

    const t = window.setTimeout(() => void run(), examMode ? 300 : 400);

    return () => {
      cancelled = true;
      window.clearTimeout(t);
    };
  }, [autoPlay, disabled, play, audioSrc, examMode]);

  useEffect(() => {
    autoPlayedRef.current = false;
    endedRef.current = false;
  }, [text, speechId, audioSrc, neuralUrl]);

  useEffect(
    () => () => {
      cancelSpeech();
      const audio = audioRef.current;
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
        audioRef.current = null;
      }
    },
    [text, speechId, audioSrc]
  );

  if (examMode) {
    return (
      <div className={className} aria-live="polite">
        <p className="text-sm font-medium text-slate-800">
          {playing ? "Playing prompt…" : endedRef.current ? "Prompt finished" : "Listen carefully"}
        </p>
        <p className="mt-1 text-xs text-slate-500">
          Audio plays once. You cannot replay or skip.
        </p>
      </div>
    );
  }

  const modeLabel =
    mode === "static" || mode === "neural"
      ? "Natural English voice (Microsoft neural — TOEFL-style clarity)."
      : "Using browser voice fallback — start Python API for better audio.";

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => (playing ? stop() : void play())}
        disabled={disabled}
        className="inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <span
          className={`h-2 w-2 rounded-full ${playing ? "animate-pulse bg-white" : "bg-red-400"}`}
          aria-hidden="true"
        />
        {playing ? "Stop" : label}
      </button>
      <p className="mt-2 text-xs text-slate-500">{modeLabel}</p>
    </div>
  );
}
