"use client";

import { LiveAudioLevel } from "@/components/LiveAudioLevel";
import type { RecordingStatus } from "@/components/RecordButton";

export interface ExamRecordingStripProps {
  label: string;
  sublabel?: string;
  timeLeft: number;
  totalSeconds: number;
  warningThreshold?: number;
  recordingStatus: RecordingStatus;
  micStream: MediaStream | null;
}

function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function ExamRecordingStrip({
  label,
  sublabel,
  timeLeft,
  totalSeconds,
  warningThreshold = 3,
  recordingStatus,
  micStream,
}: ExamRecordingStripProps) {
  const isRecording = recordingStatus === "recording";
  const isFinishing =
    timeLeft <= 0 &&
    (recordingStatus === "processing" || recordingStatus === "requesting");
  const warn = timeLeft <= warningThreshold && timeLeft > 0;
  const progress =
    totalSeconds > 0
      ? Math.min(
          100,
          isFinishing
            ? 100
            : ((totalSeconds - timeLeft) / totalSeconds) * 100
        )
      : 0;

  const displayTime = isFinishing ? "Saving…" : formatTime(timeLeft);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:px-6">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center gap-4">
          <div className="min-w-[5.5rem] shrink-0">
            <p className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
              {label}
            </p>
            <p
              className={`font-mono text-3xl font-semibold tabular-nums ${
                isFinishing
                  ? "text-base text-slate-600"
                  : warn
                    ? "text-red-600"
                    : "text-slate-900"
              }`}
              aria-live="polite"
            >
              {displayTime}
            </p>
            {sublabel && (
              <p className="mt-0.5 text-[10px] text-slate-400">{sublabel}</p>
            )}
          </div>

          <div className="min-w-0 flex-1">
            {micStream ? (
              <LiveAudioLevel
                active={isRecording}
                stream={micStream}
                compact
                className="border-0 bg-transparent px-0 py-0"
              />
            ) : (
              <div className="flex h-8 items-center justify-center gap-1">
                {isRecording
                  ? Array.from({ length: 24 }, (_, i) => (
                      <div
                        key={i}
                        className="w-1 animate-pulse rounded-sm bg-emerald-500"
                        style={{
                          height: `${20 + (i % 5) * 12}%`,
                          animationDelay: `${i * 40}ms`,
                        }}
                      />
                    ))
                  : (
                      <span className="text-xs text-slate-400">
                        {isFinishing
                          ? "Saving response…"
                          : recordingStatus === "requesting"
                            ? "Starting microphone…"
                            : "Ready to record"}
                      </span>
                    )}
              </div>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isRecording ? (
              <>
                <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
                <span className="text-xs font-medium text-red-700">REC</span>
              </>
            ) : recordingStatus === "requesting" ? (
              <span className="text-xs text-slate-500">Mic…</span>
            ) : null}
          </div>
        </div>

        <div className="mt-2 h-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              warn ? "bg-red-500" : "bg-slate-800"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
