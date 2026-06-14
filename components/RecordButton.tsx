"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { isLowMicQualityRecording } from "@/lib/examRecordings";

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
  /** Peak mic level 0–1 while recording (exam diagnostics). */
  peakLevel?: number;
  /** Exam mode: mic level or file size suggests little/no speech was captured. */
  lowMicQuality?: boolean;
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
  /** Exam mode: lighter noise processing, flags low mic level (does not block). */
  examMode?: boolean;
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

const MIN_RECORDING_MS = 400;

function flushRecorderData(recorder: MediaRecorder): void {
  if (recorder.state === "recording" && typeof recorder.requestData === "function") {
    try {
      recorder.requestData();
    } catch {
      // ignore — some browsers throw if no data yet
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recordingStartRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pendingStopRef = useRef(false);
  const stopRecordingRef = useRef<() => void>(() => undefined);
  const mountedRef = useRef(true);
  const peakLevelRef = useRef(0);
  const levelContextRef = useRef<AudioContext | null>(null);
  const levelRafRef = useRef(0);

  const updateStatus = useCallback(
    (next: RecordingStatus) => {
      setStatus(next);
      onStatusChange?.(next);
    },
    [onStatusChange]
  );

  const clearLevelMonitor = useCallback(() => {
    if (levelRafRef.current) {
      cancelAnimationFrame(levelRafRef.current);
      levelRafRef.current = 0;
    }
    if (levelContextRef.current) {
      void levelContextRef.current.close();
      levelContextRef.current = null;
    }
    peakLevelRef.current = 0;
  }, []);

  const startLevelMonitor = useCallback((stream: MediaStream) => {
    clearLevelMonitor();
    peakLevelRef.current = 0;
    const ctx = new AudioContext();
    levelContextRef.current = ctx;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i]! - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      const level = Math.min(1, rms * 4);
      if (level > peakLevelRef.current) {
        peakLevelRef.current = level;
      }
      levelRafRef.current = requestAnimationFrame(tick);
    };

    void ctx.resume().then(() => {
      levelRafRef.current = requestAnimationFrame(tick);
    });
  }, [clearLevelMonitor]);

  const stopStream = useCallback(() => {
    clearLevelMonitor();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    onStreamReady?.(null);
  }, [onStreamReady, clearLevelMonitor]);

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
      status === "recording" ||
      status === "requesting"
    ) {
      return;
    }

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

      const stream = await navigator.mediaDevices.getUserMedia({
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

      if (!mountedRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      if (pendingStopRef.current) {
        pendingStopRef.current = false;
        stream.getTracks().forEach((track) => track.stop());
        updateStatus("idle");
        return;
      }

      streamRef.current = stream;
      onStreamReady?.(stream);
      startLevelMonitor(stream);
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

        const durationMs = Date.now() - recordingStartRef.current;
        const peakLevel = peakLevelRef.current;

        stopStream();

        const blob = new Blob(chunksRef.current, { type: mimeType });

        chunksRef.current = [];
        mediaRecorderRef.current = null;
        pendingStopRef.current = false;

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
          peakLevel,
          blobSize: blob.size,
        });

        onRecordingComplete?.({
          blob,
          url,
          mimeType,
          durationMs,
          peakLevel,
          lowMicQuality,
        });
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

      if (pendingStopRef.current) {
        window.setTimeout(() => stopRecordingRef.current(), MIN_RECORDING_MS);
      }
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
    examMode,
    startLevelMonitor,
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
      window.setTimeout(() => stopRecordingRef.current(), MIN_RECORDING_MS - elapsed);
      return;
    }

    pendingStopRef.current = false;
    updateStatus("processing");
    clearTimer();
    flushRecorderData(recorder);
    recorder.stop();
  }, [updateStatus, clearTimer]);

  stopRecordingRef.current = stopRecording;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

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
