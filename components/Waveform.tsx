"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type WaveSurfer from "wavesurfer.js";

export interface WaveformProps {
  /** Audio source URL (blob URL or remote URL) */
  url?: string | null;
  height?: number;
  className?: string;
  /** Show built-in play / pause button */
  showControls?: boolean;
  /** Pulsing indicator when recording and no URL yet */
  active?: boolean;
  placeholder?: string;
  onPlayStateChange?: (playing: boolean) => void;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function Waveform({
  url,
  height = 96,
  className = "",
  showControls = true,
  active = false,
  placeholder = "No audio loaded",
  onPlayStateChange,
  onReady,
  onError,
}: WaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);

  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handlePlayStateChange = useCallback(
    (playing: boolean) => {
      setIsPlaying(playing);
      onPlayStateChange?.(playing);
    },
    [onPlayStateChange]
  );

  useEffect(() => {
    if (!url || !containerRef.current) return;

    let cancelled = false;

    setErrorMessage(null);
    setIsLoading(true);
    setIsReady(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);

    async function initWaveform() {
      try {
        const { default: WaveSurferLib } = await import("wavesurfer.js");
        if (cancelled || !containerRef.current) return;

        const ws = WaveSurferLib.create({
          container: containerRef.current,
          height,
          waveColor: "#cbd5e1",
          progressColor: "#0f172a",
          cursorColor: "#64748b",
          cursorWidth: 1,
          barWidth: 2,
          barGap: 2,
          barRadius: 2,
          normalize: true,
          interact: true,
          dragToSeek: true,
          fillParent: true,
        });

        wavesurferRef.current = ws;

        ws.on("ready", (dur) => {
          setDuration(dur);
          setIsReady(true);
          setIsLoading(false);
          onReady?.();
        });

        ws.on("play", () => handlePlayStateChange(true));
        ws.on("pause", () => handlePlayStateChange(false));
        ws.on("finish", () => handlePlayStateChange(false));
        ws.on("timeupdate", (time) => setCurrentTime(time));
        ws.on("error", (err) => {
          setErrorMessage(err.message);
          setIsLoading(false);
          onError?.(err);
        });

        await ws.load(url!);
      } catch (err) {
        if (cancelled) return;
        const message =
          err instanceof Error ? err.message : "Failed to load waveform.";
        setErrorMessage(message);
        setIsLoading(false);
        onError?.(err instanceof Error ? err : new Error(message));
      }
    }

    void initWaveform();

    return () => {
      cancelled = true;
      wavesurferRef.current?.destroy();
      wavesurferRef.current = null;
    };
  }, [url, height, handlePlayStateChange, onReady, onError]);

  const togglePlayPause = () => {
    const ws = wavesurferRef.current;
    if (!ws || !isReady) return;
    void ws.playPause();
  };

  if (!url) {
    return (
      <div
        className={`flex h-24 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 ${className}`}
      >
        {active ? (
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
            Recording…
          </div>
        ) : (
          <p className="text-sm text-slate-400">{placeholder}</p>
        )}
      </div>
    );
  }

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50 p-3 ${className}`}
    >
      <div className="flex items-center gap-3">
        {showControls && (
          <button
            type="button"
            onClick={togglePlayPause}
            disabled={!isReady || isLoading}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-900 text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isPlaying ? (
              <svg
                className="h-4 w-4"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
              </svg>
            ) : (
              <svg
                className="h-4 w-4 translate-x-0.5"
                fill="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7L8 5z" />
              </svg>
            )}
          </button>
        )}

        <div className="relative min-w-0 flex-1">
          <div ref={containerRef} className="w-full" />
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80">
              <span className="text-xs text-slate-500">Loading waveform…</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between px-1">
        <p className="font-mono text-xs text-slate-500">
          {formatTime(currentTime)} / {formatTime(duration)}
        </p>
        <p className="text-xs text-slate-400" role="status" aria-live="polite">
          {isLoading
            ? "Loading…"
            : isPlaying
              ? "Playing"
              : isReady
                ? "Ready"
                : ""}
        </p>
      </div>

      {errorMessage && (
        <p className="mt-2 text-xs text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
