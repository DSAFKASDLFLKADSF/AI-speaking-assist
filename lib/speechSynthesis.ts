/**
 * Browser speech synthesis helpers — picks the most natural en-US voice available.
 */

const VOICE_PREFERENCES = [
  "jenny",
  "aria",
  "samantha",
  "google us english",
  "microsoft zira",
  "microsoft david",
  "english united states",
  "en-us",
  "en_us",
];

let voicesCache: SpeechSynthesisVoice[] | null = null;

export function getSpeechVoices(): SpeechSynthesisVoice[] {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  if (voicesCache?.length) return voicesCache;
  voicesCache = window.speechSynthesis.getVoices();
  return voicesCache;
}

export function waitForSpeechVoices(timeoutMs = 3000): Promise<SpeechSynthesisVoice[]> {
  return new Promise((resolve) => {
    const existing = getSpeechVoices();
    if (existing.length > 0) {
      resolve(existing);
      return;
    }

    const finish = () => {
      voicesCache = window.speechSynthesis.getVoices();
      resolve(voicesCache);
    };

    window.speechSynthesis.addEventListener("voiceschanged", finish, {
      once: true,
    });

    window.setTimeout(finish, timeoutMs);
  });
}

function scoreVoice(voice: SpeechSynthesisVoice): number {
  const name = voice.name.toLowerCase();
  const lang = voice.lang.toLowerCase();
  let score = 0;

  if (lang.startsWith("en-us") || lang === "en_us") score += 40;
  else if (lang.startsWith("en")) score += 20;

  for (let i = 0; i < VOICE_PREFERENCES.length; i += 1) {
    if (name.includes(VOICE_PREFERENCES[i]!)) {
      score += 50 - i * 3;
    }
  }

  if (name.includes("natural") || name.includes("neural")) score += 25;
  if (voice.localService === false) score += 5;
  if (name.includes("google")) score += 8;

  return score;
}

export async function pickEnglishVoice(): Promise<SpeechSynthesisVoice | null> {
  const voices = await waitForSpeechVoices();
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  if (english.length === 0) return null;

  return english.sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null;
}

export function cancelSpeech(): void {
  if (typeof window !== "undefined") {
    window.speechSynthesis?.cancel();
  }
}

export interface SpeakOptions {
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: Error) => void;
}

export async function speakText(
  text: string,
  options: SpeakOptions = {}
): Promise<void> {
  if (typeof window === "undefined" || !window.speechSynthesis) {
    options.onError?.(new Error("Speech synthesis is not supported."));
    return;
  }

  const trimmed = text.trim();
  if (!trimmed) {
    options.onError?.(new Error("Nothing to speak."));
    return;
  }

  cancelSpeech();
  const voice = await pickEnglishVoice();

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(trimmed);
    utterance.lang = "en-US";
    utterance.rate = options.rate ?? 0.92;
    utterance.pitch = options.pitch ?? 1;
    if (voice) utterance.voice = voice;

    utterance.onstart = () => options.onStart?.();

    const finish = () => {
      options.onEnd?.();
      resolve();
    };

    utterance.onend = finish;
    utterance.onerror = () => {
      options.onError?.(new Error("Speech playback failed."));
      finish();
    };

    window.speechSynthesis.speak(utterance);
  });
}

/** Quick probe: does a remote audio URL return playable audio? */
export async function probeAudioUrl(url: string): Promise<boolean> {
  if (typeof window === "undefined" || !url) return false;
  try {
    const res = await fetch(url, { method: "HEAD" });
    if (!res.ok) return false;
    const type = res.headers.get("content-type") ?? "";
    return type.startsWith("audio/") || url.endsWith(".wav") || url.endsWith(".mp3");
  } catch {
    return false;
  }
}
