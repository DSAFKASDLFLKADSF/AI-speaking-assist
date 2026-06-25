import path from "path";

export const LOCAL_AUDIO_BUCKET = "local";

const MIME_EXTENSION: Record<string, string> = {
  "audio/webm": "webm",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
};

export function getAudioStorageRoot(): string {
  return (
    process.env.AUDIO_STORAGE_DIR ??
    path.join(process.cwd(), "uploads", "audio")
  );
}

export function normalizeAudioContentType(mimeType: string): string {
  const base = mimeType.split(";")[0]?.trim().toLowerCase();
  if (!base) return "audio/webm";
  if (base.startsWith("audio/")) return base;
  return "audio/webm";
}

export function extensionFromAudioMime(mimeType: string): string {
  const normalized = normalizeAudioContentType(mimeType);
  return MIME_EXTENSION[normalized] ?? "webm";
}

export function buildAudioStoragePath(
  userId: string,
  sessionId: string | undefined,
  fileName: string | undefined,
  mimeType: string
): string {
  if (fileName) {
    return `${userId}/${fileName}`;
  }

  const ext = extensionFromAudioMime(mimeType);
  const id = crypto.randomUUID();
  const timestamp = Date.now();

  if (sessionId) {
    return `${userId}/${sessionId}/${timestamp}-${id}.${ext}`;
  }

  return `${userId}/${timestamp}-${id}.${ext}`;
}

export function resolvePublicAudioUrl(storagePath: string): string {
  const origin = (
    process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"
  ).replace(/\/$/, "");
  return `${origin}/api/audio/file?path=${encodeURIComponent(storagePath)}`;
}

/** URL for Python/Node on the same machine (avoids localhost vs 127.0.0.1 issues). */
export function resolveInternalAudioUrl(storagePath: string): string {
  const origin = (
    process.env.INTERNAL_APP_URL ??
    process.env.NEXT_PUBLIC_APP_URL ??
    "http://127.0.0.1:3000"
  ).replace(/\/$/, "");
  return `${origin}/api/audio/file?path=${encodeURIComponent(storagePath)}`;
}

/** Rewrite a browser audio URL so the Python service can fetch it locally. */
export function rewriteAudioUrlForPythonFetch(audioUrl: string): string {
  try {
    const parsed = new URL(audioUrl);
    if (!parsed.pathname.startsWith("/api/audio/file")) {
      return audioUrl;
    }
    const internal = new URL(
      process.env.INTERNAL_APP_URL ??
        process.env.NEXT_PUBLIC_APP_URL ??
        "http://127.0.0.1:3000"
    );
    return `${internal.origin}${parsed.pathname}${parsed.search}`;
  } catch {
    return audioUrl;
  }
}

/** Reject path traversal; returns absolute path under the audio root. */
export function resolveAudioFilePath(storagePath: string): string | null {
  const normalized = storagePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (!normalized || normalized.includes("..")) {
    return null;
  }

  const root = path.resolve(getAudioStorageRoot());
  const fullPath = path.resolve(root, normalized);
  if (!fullPath.startsWith(`${root}${path.sep}`) && fullPath !== root) {
    return null;
  }

  return fullPath;
}
