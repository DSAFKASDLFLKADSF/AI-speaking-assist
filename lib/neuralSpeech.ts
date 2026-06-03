import { getInterviewPromptById } from "@/lib/interviewPrompts";
import { getPromptById } from "@/lib/prompts";

export type NeuralSpeechKind =
  | "listen_repeat"
  | "interview"
  | "custom";

export interface NeuralSpeechParams {
  kind: NeuralSpeechKind;
  /** Prompt id, e.g. lr-01 or iv-01-q1 */
  id?: string;
  /** Raw text when kind=custom or id lookup is skipped */
  text?: string;
}

export function resolveSpeechText(params: NeuralSpeechParams): string | null {
  if (params.kind === "listen_repeat" && params.id) {
    return getPromptById(params.id)?.transcript ?? null;
  }
  if (params.kind === "interview" && params.id) {
    return getInterviewPromptById(params.id)?.prompt ?? null;
  }
  return params.text?.trim() ?? null;
}

/** Browser-facing URL — proxied by /api/speech to Python neural TTS. */
export function getNeuralSpeechUrl(params: NeuralSpeechParams): string {
  const qs = new URLSearchParams();
  qs.set("kind", params.kind);
  if (params.id) qs.set("id", params.id);
  if (params.text) qs.set("text", params.text);
  return `/api/speech?${qs.toString()}`;
}
