import {
  INTERVIEW_SESSIONS,
  type InterviewPrompt,
} from "@/lib/interviewPrompts";
import {
  LISTEN_REPEAT_PROMPTS,
  type ListenRepeatPrompt,
} from "@/lib/prompts";

export type BenchmarkKind = "interview" | "listen_repeat";

export interface BenchmarkInterviewPayload {
  kind: "interview";
  interview: {
    audio_url: string;
    prompt: string;
    question_id: string;
    response_seconds: number;
    duration_ms: number;
    title: string;
  };
}

export interface BenchmarkListenRepeatPayload {
  kind: "listen_repeat";
  listen_repeat: {
    audio_url: string;
    reference_text: string;
    prompt_id: string;
    title: string;
  };
}

export type BenchmarkRunOnePayload =
  | BenchmarkInterviewPayload
  | BenchmarkListenRepeatPayload;

export function resolvePublicAssetUrl(
  origin: string,
  relativePath: string
): string {
  const base = origin.replace(/\/$/, "");
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;
  return `${base}${path}`;
}

export function interviewBenchmarkItems(
  count: number,
  origin: string
): BenchmarkInterviewPayload[] {
  const session = INTERVIEW_SESSIONS[0]!;
  const questions = session.questions.slice(0, Math.min(count, 4));

  return questions.map((q: InterviewPrompt) => ({
    kind: "interview" as const,
    interview: {
      audio_url: resolvePublicAssetUrl(
        origin,
        `/audio/interview/${q.id}.mp3`
      ),
      prompt: q.prompt,
      question_id: q.id,
      response_seconds: q.responseSeconds,
      duration_ms: q.responseSeconds * 1000,
      title: `${q.id} · ${q.taskLabel}`,
    },
  }));
}

export function listenRepeatBenchmarkItems(
  count: number,
  origin: string
): BenchmarkListenRepeatPayload[] {
  const prompts = LISTEN_REPEAT_PROMPTS.slice(0, Math.min(count, 7));

  return prompts.map((p: ListenRepeatPrompt) => ({
    kind: "listen_repeat" as const,
    listen_repeat: {
      audio_url: resolvePublicAssetUrl(origin, p.audioSrc),
      reference_text: p.transcript,
      prompt_id: p.id,
      title: `${p.id} · ${p.topic}`,
    },
  }));
}

export function buildBenchmarkPayloads(
  kind: BenchmarkKind,
  count: number,
  origin: string
): BenchmarkRunOnePayload[] {
  return kind === "interview"
    ? interviewBenchmarkItems(count, origin)
    : listenRepeatBenchmarkItems(count, origin);
}

export const STAGE_LABEL_ZH: Record<string, string> = {
  fetch_audio: "下载录音",
  transcribe: "语音转文字 (AssemblyAI)",
  audio_features: "语速 / 停顿 / 填充词分析",
  word_align: "与原文逐词对齐",
  build_prompt: "构建 GLM 评分提示",
  glm_scoring: "AI 评分与反馈 (GLM)",
  failed: "失败",
};

export function stageLabelZh(stageId: string, fallback: string): string {
  return STAGE_LABEL_ZH[stageId] ?? fallback;
}
