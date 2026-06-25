"use client";

import { useEffect, useState } from "react";

export interface LiveAudioLevelProps {
  active: boolean;
  stream: MediaStream | null;
  compact?: boolean;
  className?: string;
}

const BAR_COUNT = 24;

export function LiveAudioLevel({
  active,
  stream,
  compact = false,
  className = "",
}: LiveAudioLevelProps) {
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!active || !stream) {
      setLevel(0);
      return;
    }

    // Clone so level metering does not compete with MediaRecorder on the live track.
    let meterStream: MediaStream | null = null;
    try {
      meterStream = stream.clone();
    } catch {
      meterStream = stream;
    }

    const ctx = new AudioContext();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaStreamSource(meterStream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let rafId = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i += 1) {
        const v = (data[i]! - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      setLevel(Math.min(1, rms * 4));
      rafId = requestAnimationFrame(tick);
    };

    void ctx.resume().then(() => {
      rafId = requestAnimationFrame(tick);
    });

    return () => {
      cancelAnimationFrame(rafId);
      source.disconnect();
      void ctx.close();
      if (meterStream && meterStream !== stream) {
        meterStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [active, stream]);

  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 ${className}`}
      aria-hidden="true"
    >
      {!compact && (
        <p className="mb-2 text-xs font-medium text-slate-500">
          {active ? "Microphone level" : "Waiting for microphone…"}
        </p>
      )}
      <div
        className={`flex items-end justify-center gap-0.5 ${
          compact ? "h-8" : "h-10"
        }`}
      >
        {Array.from({ length: BAR_COUNT }, (_, i) => {
          const threshold = (i + 1) / BAR_COUNT;
          const lit = active && level >= threshold * 0.85;
          const height = 20 + (i / BAR_COUNT) * 80;
          return (
            <div
              key={i}
              className={`w-1 rounded-sm transition-all duration-75 ${
                lit ? "bg-emerald-500" : "bg-slate-200"
              }`}
              style={{ height: `${lit ? height : height * 0.35}%` }}
            />
          );
        })}
      </div>
    </div>
  );
}
