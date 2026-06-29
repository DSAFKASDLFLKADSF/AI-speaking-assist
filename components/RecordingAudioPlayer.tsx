"use client";

export interface RecordingAudioPlayerProps {
  src: string;
  label?: string;
  className?: string;
}

export function RecordingAudioPlayer({
  src,
  label = "Your recording",
  className = "",
}: RecordingAudioPlayerProps) {
  if (!src?.trim()) return null;

  return (
    <div className={`rounded-lg border border-slate-200 bg-slate-50 p-3 ${className}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <audio
        controls
        preload="metadata"
        src={src}
        className="mt-2 w-full max-w-full"
      />
    </div>
  );
}
