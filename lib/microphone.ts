export interface MicrophoneRequestOptions {
  examMode?: boolean;
}

export function isMicrophoneEnvironmentSupported(): boolean {
  if (typeof window === "undefined") return false;
  if (!window.isSecureContext) {
    const host = window.location.hostname;
    return (
      host === "localhost" || host === "127.0.0.1" || host === "[::1]"
    );
  }
  return Boolean(navigator.mediaDevices?.getUserMedia);
}

export function getMicrophoneEnvironmentError(): string | null {
  if (typeof window === "undefined") return null;

  if (!window.isSecureContext) {
    const host = window.location.hostname;
    const isLocal =
      host === "localhost" || host === "127.0.0.1" || host === "[::1]";
    if (!isLocal) {
      return "Microphone requires HTTPS (or use http://localhost:3000 locally).";
    }
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return "Microphone API is not available in this browser.";
  }

  return null;
}

export function formatMicrophoneError(err: unknown): string {
  if (err instanceof DOMException) {
    switch (err.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Microphone permission was blocked. Click the lock icon in the address bar → Microphone → Allow, then try again.";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "No microphone detected. Plug in a mic or check Windows Settings → Privacy → Microphone.";
      case "NotReadableError":
      case "TrackStartError":
        return "Microphone is in use by another app or blocked by Windows privacy settings.";
      case "SecurityError":
        return "Microphone blocked: open the site via http://localhost:3000 or HTTPS.";
      default:
        return err.message || "Failed to access microphone.";
    }
  }

  if (err instanceof Error) return err.message;
  return "Failed to access microphone.";
}

/** Call from a user click (button) so the browser shows the permission prompt. */
export async function requestMicrophoneStream(
  options: MicrophoneRequestOptions = {}
): Promise<MediaStream> {
  const envError = getMicrophoneEnvironmentError();
  if (envError) {
    throw new Error(envError);
  }

  const { examMode = false } = options;

  return navigator.mediaDevices.getUserMedia({
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
}

export function isLiveAudioStream(stream: MediaStream | null | undefined): boolean {
  return Boolean(
    stream?.getAudioTracks().some((track) => track.readyState === "live")
  );
}

export function releaseMicrophoneStream(
  stream: MediaStream | null | undefined
): void {
  stream?.getTracks().forEach((track) => track.stop());
}

/** Prompt for permission, then release the stream (keeps browser permission grant). */
export async function ensureMicrophonePermission(
  options: MicrophoneRequestOptions = {}
): Promise<void> {
  const stream = await requestMicrophoneStream(options);
  releaseMicrophoneStream(stream);
}
