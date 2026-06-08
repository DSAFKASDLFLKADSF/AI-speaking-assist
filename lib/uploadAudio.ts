import { getSupabase } from "@/lib/supabase";

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

const MIME_EXTENSION: Record<string, string> = {
  "audio/webm": "webm",
  "audio/webm;codecs=opus": "webm",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/mpeg": "mp3",
  "audio/mp4": "m4a",
  "audio/ogg": "ogg",
  "audio/ogg;codecs=opus": "ogg",
};

/** Supabase bucket allowed_mime_types use base types without codec suffix. */
function normalizeContentType(mimeType: string): string {
  const base = mimeType.split(";")[0]?.trim().toLowerCase();
  if (!base) return "audio/webm";
  if (base.startsWith("audio/")) return base;
  return "audio/webm";
}

function extensionFromMime(mimeType: string): string {
  return MIME_EXTENSION[mimeType] ?? "webm";
}

function buildStoragePath(
  userId: string,
  sessionId: string | undefined,
  fileName: string | undefined,
  mimeType: string
): string {
  if (fileName) {
    return `${userId}/${fileName}`;
  }

  const ext = extensionFromMime(mimeType);
  const id = crypto.randomUUID();
  const timestamp = Date.now();

  if (sessionId) {
    return `${userId}/${sessionId}/${timestamp}-${id}.${ext}`;
  }

  return `${userId}/${timestamp}-${id}.${ext}`;
}

async function resolveUserId(
  explicitUserId?: string,
  allowAnonymous?: boolean
): Promise<string> {
  if (explicitUserId) return explicitUserId;

  const supabase = getSupabase();
  // getSession() returns null when logged out; getUser() errors with "Auth session missing!"
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error) {
    throw new Error(`Failed to get user: ${error.message}`);
  }

  const user = session?.user;
  if (!user) {
    if (allowAnonymous) return "anonymous";
    throw new Error("User must be logged in to upload audio.");
  }

  return user.id;
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

  const bucket = options.bucket ?? AUDIO_BUCKET;
  const useSignedUrl = options.signed ?? true;
  const contentType = normalizeContentType(blob.type || "audio/webm");
  const userId = await resolveUserId(options.userId, options.allowAnonymous);
  const storagePath = buildStoragePath(
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
    const hint =
      uploadError.message.includes("400") ||
      /mime|content.?type/i.test(uploadError.message)
        ? " Check Supabase bucket allowed MIME types (run supabase/storage.sql)."
        : /policy|row-level|permission|denied/i.test(uploadError.message)
          ? " Check Storage RLS policies in supabase/storage.sql."
          : "";
    throw new Error(`Upload failed: ${uploadError.message}.${hint}`);
  }

  let audioUrl: string;

  if (useSignedUrl) {
    const { data, error: signError } = await supabase.storage
      .from(bucket)
      .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

    if (signError || !data?.signedUrl) {
      throw new Error(
        `Failed to create signed URL: ${signError?.message ?? "Unknown error"}`
      );
    }

    audioUrl = data.signedUrl;
  } else {
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    audioUrl = data.publicUrl;
  }

  return { audioUrl, storagePath, bucket };
}

/** Refresh a signed playback URL before sending audio to the Python API. */
export async function refreshSignedAudioUrl(
  storagePath: string,
  bucket: string = AUDIO_BUCKET
): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

  if (error || !data?.signedUrl) {
    throw new Error(
      `Failed to refresh audio URL: ${error?.message ?? "Unknown error"}`
    );
  }

  return data.signedUrl;
}
