"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
}

export interface RecordButtonProps {
  onRecordingComplete?: (result: RecordingResult) => void;
  onRecordingStart?: () => void;
  onRecordingStop?: () => void;
  onStatusChange?: (status: RecordingStatus) => void;
  onError?: (error: Error) => void;
  disabled?: boolean;
  /** Increment to programmatically start when idle */
  startSignal?: number;
  /** Increment to programmatically stop when recording */
  stopSignal?: number;
  /** Hide manual start/stop — exam automation only */
  hideControls?: boolean;
  /** Called when mic stream is live (for level meters) */
  onStreamReady?: (stream: MediaStream | null) => void;
  className?: string;
}

const MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const;

function getSupportedMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "";
  for (const type of MIME_TYPES) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "";
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
  onStreamReady,
  className = "",
}: RecordButtonProps) {
  const [status, setStatus] = useState<RecordingStatus>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const updateStatus = useCallback(
    (next: RecordingStatus) => {
      setStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange]
  );

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    onStreamReady?.(null);
  }, [onStreamReady]);

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
    if (disabled || status === "recording" || status === "requesting") return;

    setErrorMessage(null);
    updateStatus("requesting");

    try {
      if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
        throw new Error("Microphone access is not supported in this browser.");
      }

      const mimeType = getSupportedMimeType();
      if (!mimeType) {
        throw new Error("No supported audio recording format found.");
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      onStreamReady?.(stream);
      chunksRef.current = [];

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = () => {
        handleError(new Error("MediaRecorder encountered an error."));
      };

      mediaRecorder.onstop = () => {
        clearTimer();
        stopStream();

        const durationMs = Date.now() - recordingStartRef.current;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);

        chunksRef.current = [];
        mediaRecorderRef.current = null;

        setElapsedMs(0);
        onRecordingStop?.();
        onRecordingComplete?.({ blob, url, mimeType, durationMs });
        updateStatus("idle");
      };

      mediaRecorder.start(250);
      recordingStartRef.current = Date.now();
      setElapsedMs(0);

      timerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - recordingStartRef.current);
      }, 200);

      updateStatus("recording");
      onRecordingStart?.();
    } catch (err) {
      handleError(
        err instanceof Error ? err : new Error("Failed to start recording.")
      );
    }
  }, [
    disabled,
    status,
    updateStatus,
    onRecordingStart,
    onRecordingStop,
    onRecordingComplete,
    onStreamReady,
    handleError,
    clearTimer,
    stopStream,
  ]);

  const stopRecording = useCallback(() => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state !== "recording") return;

    updateStatus("processing");
    clearTimer();
    recorder.stop();
  }, [updateStatus, clearTimer]);

  const handleToggle = () => {
    if (status === "recording") {
      stopRecording();
    } else if (status === "idle" || status === "error") {
      void startRecording();
    }
  };

  const lastStartSignal = useRef(0);
  const lastStopSignal = useRef(0);

  useEffect(() => {
    if (
      startSignal > lastStartSignal.current &&
      !disabled &&
      (status === "idle" || status === "error")
    ) {
      lastStartSignal.current = startSignal;
      void startRecording();
    }
  }, [startSignal, disabled, status, startRecording]);

  useEffect(() => {
    if (
      stopSignal > lastStopSignal.current &&
      status === "recording"
    ) {
      lastStopSignal.current = stopSignal;
      stopRecording();
    }
  }, [stopSignal, status, stopRecording]);

  useEffect(() => {
    return () => {
      clearTimer();
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
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
          onClick={handleToggle}
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
      {hideControls && errorMessage && (
        <p className="text-xs text-red-600">{errorMessage}</p>
      )}
    </div>
  );
}
