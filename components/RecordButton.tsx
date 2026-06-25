"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isLowMicQualityRecording } from "@/lib/examRecordings";
import {
  formatMicrophoneError,
  getMicrophoneEnvironmentError,
  releaseMicrophoneStream,
} from "@/lib/microphone";

export type RecordingStatus =
  | "idle"
  | "requesting"
  | "recording"
  | "processing"
  | "error";

export interface RecordingResult {
  blob: Blob;
  url: string;
  mimeType: string;
  durationMs: number;
  peakLevel?: number;
  lowMicQuality?: boolean;
}

export interface RecordButtonProps {
  onRecordingComplete?: (result: RecordingResult) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onStatusChange?: (status: RecordingStatus) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  startSignal?: number;
  stopSignal?: number;
  hideControls?: boolean;
  examMode?: boolean;
  /** Non-exam only — exam mode skips stream sharing to avoid level-meter conflicts. */
  onStreamReady?: (stream: MediaStream | null) => void;
  className?: string;
}

const MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

const MIN_RECORDING_MS = 400;

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
}

function flushRecorderData(recorder: MediaRecorder): void {
  if (recorder.state === "recording" && typeof recorder.requestData === "function") {
    try {
      recorder.requestData();
    } catch {
      // ignore
    }
  }
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const STATUS_LABEL: Record<RecordingStatus, string> = {
  idle: "Press the button to start",
  requesting: "Requesting microphone access…",
  recording: "Recording in progress…",
  processing: "Processing recording…",
  error: "Recording failed",
};

export function RecordButton({
  onRecordingComplete,
  onRecordingStart,
  onRecordingStop,
  onStatusChange,
  onError,
  disabled = false,
  startSignal = 0,
  stopSignal = 0,
  hideControls = false,
  examMode = false,
  onStreamReady,
  className = "",
}: RecordButtonProps) {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const statusRef = useRef<RecordingStatus>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingStopRef = useRef(false);
  const stopRecordingRef = useRef<() => void>(() => undefined);
  const activeSessionRef = useRef(0);

  const updateStatus = useCallback(
    (next: RecordingStatus) => {
      statusRef.current = next;
      setStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange]
  );

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      releaseMicrophoneStream(streamRef.current);
      streamRef.current = null;
      if (!examMode) {
        onStreamReady?.(null);
      }
    }
  }, [onStreamReady, examMode]);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const handleError = useCallback(
    (error: Error) => {
      clearTimer();
      stopStream();
      mediaRecorderRef.current = null;
      chunksRef.current = [];
      setErrorMessage(error.message);
      updateStatus("error");
      onError?.(error);
    },
    [clearTimer, stopStream, updateStatus, onError]
  );

  const startRecording = useCallback(async () => {
    if (
      disabled ||
      statusRef.current === "recording" ||
      statusRef.current === "requesting"
    ) {
      return;
    }

    setErrorMessage(null);
    updateStatus("requesting");

    const sessionId = ++activeSessionRef.current;
    let stream: MediaStream | null = null;

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error(
          getMicrophoneEnvironmentError() ??
            "Microphone access is not supported in this browser."
        );
      }

      stream = await navigator.mediaDevices.getUserMedia({
        audio: examMode
          ? {
              echoCancellation: true,
              noiseSuppression: false,
              autoGainControl: true,
            }
          : {
              echoCancellation: true,
              noiseSuppression: true,
              autoGainControl: true,
            },
      });

      if (sessionId !== activeSessionRef.current) {
        releaseMicrophoneStream(stream);
        return;
      }

      if (pendingStopRef.current) {
        pendingStopRef.current = false;
        releaseMicrophoneStream(stream);
        updateStatus("idle");
        return;
      }

      const mimeType = getSupportedMimeType();
      let mediaRecorder: MediaRecorder;
      let resolvedMime = mimeType || "audio/webm";

      try {
        mediaRecorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
        resolvedMime = mediaRecorder.mimeType || resolvedMime;
      } catch {
        mediaRecorder = new MediaRecorder(stream);
        resolvedMime = mediaRecorder.mimeType || "audio/webm";
      }

      streamRef.current = stream;
      if (!examMode) {
        onStreamReady?.(stream);
      }

      chunksRef.current = [];
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        if (sessionId === activeSessionRef.current) {
          handleError(new Error("MediaRecorder encountered an error."));
        }
      };

      mediaRecorder.onstop = () => {
        if (sessionId !== activeSessionRef.current) {
          return;
        }

        clearTimer();

        const durationMs = Date.now() - recordingStartRef.current;
        const blob = new Blob(chunksRef.current, { type: resolvedMime });

        chunksRef.current = [];
        mediaRecorderRef.current = null;
        pendingStopRef.current = false;

        stopStream();
        setElapsedMs(0);
        onRecordingStop?.();

        if (blob.size === 0) {
          handleError(
            new Error(
              "Recording is empty. Check your microphone and try again."
            )
          );
          return;
        }

        const url = URL.createObjectURL(blob);
        const lowMicQuality = isLowMicQualityRecording({
          examMode,
          durationMs,
          peakLevel: 0,
          blobSize: blob.size,
        });

        onRecordingComplete?.({
          blob,
          url,
          mimeType: resolvedMime,
          durationMs,
          peakLevel: 0,
          lowMicQuality,
        });
        updateStatus("idle");
      };

      // No timeslice — one blob on stop (reliable on Windows; timeslice caused empty files).
      mediaRecorder.start();
      recordingStartRef.current = Date.now();
      setElapsedMs(0);

      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - recordingStartRef.current);
      }, 200);

      updateStatus("recording");
      onRecordingStart?.();

      if (pendingStopRef.current) {
        window.setTimeout(() => stopRecordingRef.current(), MIN_RECORDING_MS);
      }
    } catch (err) {
      if (stream) releaseMicrophoneStream(stream);
      if (sessionId === activeSessionRef.current) {
        handleError(new Error(formatMicrophoneError(err)));
      }
    }
  }, [
    disabled,
    updateStatus,
    onRecordingStart,
    onRecordingStop,
    onRecordingComplete,
    onStreamReady,
    handleError,
    clearTimer,
    stopStream,
    examMode,
  ]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder) {
      pendingStopRef.current = true;
      return;
    }

    if (recorder.state === "inactive") {
      pendingStopRef.current = false;
      return;
    }

    if (recorder.state !== "recording") {
      pendingStopRef.current = true;
      return;
    }

    const elapsed = Date.now() - recordingStartRef.current;
    if (elapsed < MIN_RECORDING_MS) {
      window.setTimeout(
        () => stopRecordingRef.current(),
        MIN_RECORDING_MS - elapsed
      );
      return;
    }

    pendingStopRef.current = false;
    updateStatus("processing");
    clearTimer();
    flushRecorderData(recorder);
    recorder.stop();
  }, [updateStatus, clearTimer]);

  stopRecordingRef.current = stopRecording;

  const lastStartSignal = useRef(startSignal);
  const lastStopSignal = useRef(stopSignal);

  useEffect(() => {
    if (
      startSignal > lastStartSignal.current &&
      !disabled &&
      (status === "idle" || status === "error" || status === "processing")
    ) {
      lastStartSignal.current = startSignal;
      if (status === "processing") {
        clearTimer();
        stopStream();
        mediaRecorderRef.current = null;
        chunksRef.current = [];
        setErrorMessage(null);
      }
      void startRecording();
    }
  }, [startSignal, disabled, status, startRecording, clearTimer, stopStream]);

  useEffect(() => {
    if (
      stopSignal > lastStopSignal.current &&
      (status === "recording" || status === "requesting")
    ) {
      lastStopSignal.current = stopSignal;
      stopRecording();
    }
  }, [stopSignal, status, stopRecording]);

  useEffect(() => {
    return () => {
      activeSessionRef.current += 1;
      clearTimer();
      const recorder = mediaRecorderRef.current;
      if (recorder?.state === "recording") {
        try {
          flushRecorderData(recorder);
          recorder.stop();
        } catch {
          // ignore
        }
      }
      stopStream();
    };
  }, [clearTimer, stopStream]);

  const isRecording = status === "recording";
  const isBusy =
    status === "requesting" || status === "processing" || disabled;

  return (
    <div className={`flex flex-col items-center gap-3 ${className}`}>
      {!hideControls ? (
        <button
          type="button"
          onClick={() => {
            if (status === "recording") stopRecording();
            else if (status === "idle" || status === "error") void startRecording();
          }}
          disabled={isBusy}
          aria-label={isRecording ? "Stop recording" : "Start recording"}
          aria-pressed={isRecording}
          className={`flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            isRecording
              ? "bg-red-600 text-white hover:bg-red-700"
              : "bg-slate-900 text-white hover:bg-slate-800"
          }`}
        >
          <span
            className={`h-2.5 w-2.5 rounded-full ${
              isRecording ? "animate-pulse bg-white" : "bg-red-400"
            }`}
          />
          {isRecording ? "Stop Recording" : "Start Recording"}
        </button>
      ) : isRecording ? (
        <div className="flex items-center gap-2 rounded-full bg-red-50 px-4 py-2 text-sm font-medium text-red-700">
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-red-600" />
          Recording…
        </div>
      ) : status === "requesting" ? (
        <p className="text-xs text-slate-500">Preparing microphone…</p>
      ) : null}

      {!hideControls && (
        <div className="text-center" role="status" aria-live="polite">
          <p className="text-xs text-slate-500">
            {STATUS_LABEL[status]}
            {isRecording && (
              <span className="ml-1 font-mono text-slate-700">
                {formatDuration(elapsedMs)}
              </span>
            )}
          </p>
          {errorMessage && (
            <p className="mt-1 text-xs text-red-600">{errorMessage}</p>
          )}
        </div>
      )}
    </div>
  );
}
