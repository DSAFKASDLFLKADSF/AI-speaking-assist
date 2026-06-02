"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface PromptAudioPlayerProps {
  text: string;
  /** Optional pre-recorded question audio */
  audioSrc?: string;
  label?: string;
  autoPlay?: boolean;
  disabled?: boolean;
  onPlayStateChange?: (playing: boolean) => void;
  onEnded?: () => void;
  className?: string;
}

function speakWithBrowserTts(
  text: string,
  onEnd: () => void
): SpeechSynthesisUtterance | null {
  if (typeof window === "undefined" || !window.speechSynthesis) return null;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en-US";
  utterance.rate = 0.92;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  window.speechSynthesis.speak(utterance);
  return utterance;
}

export function PromptAudioPlayer({
  text,
  audioSrc,
  label = "Play question audio",
  autoPlay = false,
  disabled = false,
  onPlayStateChange,
  onEnded,
  className = "",
}: PromptAudioPlayerProps) {
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const autoPlayedRef = useRef(false);

  const stop = useCallback(() => {
    window.speechSynthesis?.cancel();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
    }
    setPlaying(false);
    onPlayStateChange?.(false);
  }, [onPlayStateChange]);

  const handleEnded = useCallback(() => {
    setPlaying(false);
    onPlayStateChange?.(false);
    onEnded?.();
  }, [onEnded, onPlayStateChange]);

  const play = useCallback(async () => {
    if (disabled || !text.trim()) return;
    stop();

    if (audioSrc) {
      try {
        const audio = new Audio(audioSrc);
        audioRef.current = audio;
        audio.onended = () => handleEnded();
        audio.onerror = () => handleEnded();
        setPlaying(true);
        onPlayStateChange?.(true);
        await audio.play();
      } catch {
        const utterance = speakWithBrowserTts(text, handleEnded);
        if (utterance) {
          setPlaying(true);
          onPlayStateChange?.(true);
        }
      }
      return;
    }

    const utterance = speakWithBrowserTts(text, handleEnded);
    if (utterance) {
      setPlaying(true);
      onPlayStateChange?.(true);
    }
  }, [audioSrc, disabled, handleEnded, onPlayStateChange, stop, text]);

  useEffect(() => {
    if (!autoPlay || disabled || autoPlayedRef.current) return;
    autoPlayedRef.current = true;
    const t = window.setTimeout(() => void play(), 400);
    return () => window.clearTimeout(t);
  }, [autoPlay, disabled, play]);

  useEffect(() => {
    autoPlayedRef.current = false;
  }, [text, audioSrc]);

  useEffect(() => () => stop(), [stop]);

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
        {playing ? "Stop audio" : label}
      </button>
      <p className="mt-2 text-xs text-slate-500">
        {audioSrc
          ? "Recorded question audio (TTS fallback if unavailable)."
          : "Browser voice reads the question — like the live interview."}
      </p>
    </div>
  );
}
