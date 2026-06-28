import { fetchCurrentUser } from "@/lib/auth/client";
import { formatUploadError } from "@/lib/examRecordings";
import {
  LOCAL_AUDIO_BUCKET,
  buildAudioStoragePath,
  normalizeAudioContentType,
  resolvePublicAudioUrl,
} from "@/lib/audioStorage";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export const AUDIO_BUCKET =
  process.env.NEXT_PUBLIC_SUPABASE_AUDIO_BUCKET ?? "audio-responses";

const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface UploadAudioOptions {
  userId?: string;
  sessionId?: string;
  fileName?: string;
  bucket?: string;
  /** Use signed URL (private bucket). Default true. */
  signed?: boolean;
  /** Allow upload to anonymous/ prefix when user is not logged in */
  allowAnonymous?: boolean;
}

export interface UploadAudioResult {
  audioUrl: string;
  storagePath: string;
  bucket: string;
}

async function resolveUserId(
  explicitUserId?: string,
  allowAnonymous?: boolean
): Promise<string> {
  if (explicitUserId) return explicitUserId;

  const user = await fetchCurrentUser();
  if (user) return user.id;

  if (allowAnonymous) return "anonymous";
  throw new Error("User must be logged in to upload audio.");
}

function preferLocalAudioStorage(): boolean {
  if (process.env.NEXT_PUBLIC_AUDIO_STORAGE === "local") return true;
  if (process.env.NEXT_PUBLIC_AUDIO_STORAGE === "supabase") return false;
  return process.env.NODE_ENV === "development" || !isSupabaseConfigured();
}

function isNetworkUploadError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  return /fetch failed|failed to fetch|network error|ECONNREFUSED|ENOTFOUND/i.test(
    message
  );
}

async function uploadAudioLocal(
  blob: Blob,
  options: UploadAudioOptions
): Promise<UploadAudioResult> {
  const userId = await resolveUserId(options.userId, options.allowAnonymous);

  const formData = new FormData();
  formData.append("file", blob, options.fileName ?? "recording.webm");
  formData.append("userId", userId);
  if (options.sessionId) formData.append("sessionId", options.sessionId);
  if (options.fileName) formData.append("fileName", options.fileName);
  if (options.allowAnonymous) formData.append("allowAnonymous", "true");

  const response = await fetch("/api/audio/upload", {
    method: "POST",
    body: formData,
  });

  const payload = (await response.json().catch(() => ({}))) as {
    error?: string;
    audioUrl?: string;
    storagePath?: string;
    bucket?: string;
  };

  if (!response.ok) {
    throw new Error(
      formatUploadError(`Upload failed: ${payload.error ?? response.statusText}`)
    );
  }

  if (!payload.audioUrl || !payload.storagePath) {
    throw new Error(formatUploadError("Upload failed: invalid server response."));
  }

  const audioUrl =
    typeof window !== "undefined"
      ? payload.audioUrl.startsWith("http")
        ? payload.audioUrl
        : `${window.location.origin}${payload.audioUrl}`
      : payload.audioUrl;

  return {
    audioUrl,
    storagePath: payload.storagePath,
    bucket: payload.bucket ?? LOCAL_AUDIO_BUCKET,
  };
}

async function uploadAudioSupabase(
  blob: Blob,
  options: UploadAudioOptions
): Promise<UploadAudioResult> {
  const bucket = options.bucket ?? AUDIO_BUCKET;
  const useSignedUrl = options.signed ?? true;
  const contentType = normalizeAudioContentType(blob.type || "audio/webm");
  const userId = await resolveUserId(options.userId, options.allowAnonymous);
  const storagePath = buildAudioStoragePath(
    userId,
    options.sessionId,
    options.fileName,
    contentType
  );

  const supabase = getSupabase();
  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(storagePath, blob, {
      contentType,
      upsert: false,
      cacheControl: "3600",
    });

  if (uploadError) {
    throw new Error(formatUploadError(`Upload failed: ${uploadError.message}`));
  }

  let audioUrl: string;

  if (useSignedUrl) {
    const { data, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (signError || !data?.signedUrl) {
      throw new Error(
        formatUploadError(
          `Failed to create signed URL: ${signError?.message ?? "Unknown error"}`
        )
      );
    }

    audioUrl = data.signedUrl;
  } else {
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    audioUrl = data.publicUrl;
  }

  return { audioUrl, storagePath, bucket };
}

/**
 * Upload a recorded audio blob to Supabase Storage.
 * @returns Public or signed URL for playback (`audioUrl`) and the storage path.
 */
export async function uploadAudio(
  blob: Blob,
  options: UploadAudioOptions = {}
): Promise<string> {
  const result = await uploadAudioWithMeta(blob, options);
  return result.audioUrl;
}

/**
 * Upload a recorded audio blob and return full upload metadata.
 */
export async function uploadAudioWithMeta(
  blob: Blob,
  options: UploadAudioOptions = {}
): Promise<UploadAudioResult> {
  if (!blob.size) {
    throw new Error(
      "Recording is empty. Check your microphone and try again."
    );
  }

  if (preferLocalAudioStorage() || !isSupabaseConfigured()) {
    return uploadAudioLocal(blob, options);
  }

  try {
    return await uploadAudioSupabase(blob, options);
  } catch (err) {
    if (isNetworkUploadError(err)) {
      return uploadAudioLocal(blob, options);
    }
    throw err;
  }
}

/** Refresh a signed playback URL before sending audio to the Python API. */
export async function refreshSignedAudioUrl(
  storagePath: string,
  bucket: string = AUDIO_BUCKET
): Promise<string> {
  if (bucket === LOCAL_AUDIO_BUCKET || preferLocalAudioStorage()) {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/api/audio/file?path=${encodeURIComponent(storagePath)}`;
    }
    return resolvePublicAudioUrl(storagePath);
  }

  if (!isSupabaseConfigured()) {
    return resolvePublicAudioUrl(storagePath);
  }

  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    return resolvePublicAudioUrl(storagePath);
  }

  return data.signedUrl;
}
