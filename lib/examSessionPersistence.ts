import type { PrepTimeOption } from "@/lib/examFlow";
import type { TestExamMode } from "@/lib/localHistory";

export interface PersistedPendingRecording {
  kind: "listen_repeat" | "interview";
  promptId?: string;
  questionId?: string;
  promptText: string;
  original?: string;
  title: string;
  responseSeconds: number;
  audioUrl: string;
  storagePath: string;
  durationMs: number;
  lowMicQuality?: boolean;
}

export type PersistedExamStage =
  | "ready"
  | "lr_instruction"
  | "lr_listen"
  | "lr_recording"
  | "lr_item_complete"
  | "section_break"
  | "iv_instruction"
  | "iv_intro"
  | "iv_question_listen"
  | "iv_preparing"
  | "iv_recording"
  | "iv_item_complete"
  | "section_complete"
  | "analyzing"
  | "results";

export interface PersistedExamResults {
  listenRepeat: Array<{
    pending: PersistedPendingRecording;
    analysis?: unknown;
  }>;
  interview: Array<{
    pending: PersistedPendingRecording;
    analysis?: unknown;
  }>;
  summary: unknown | null;
  scored: boolean;
}

export interface PersistedExamDraft {
  testId: string;
  mode: TestExamMode;
  testTitle: string;
  stage: PersistedExamStage;
  lrIndex: number;
  ivIndex: number;
  recordings: PersistedPendingRecording[];
  results: PersistedExamResults | null;
  /** In-progress per-question scores (pipeline while taking the exam). */
  partialResults?: PersistedExamResults | null;
  wantScoring: boolean;
  prepChoice: PrepTimeOption | "custom";
  customPrepSeconds: number;
  showHint: boolean;
  errorMessage: string | null;
  updatedAt: string;
}

const KEY_PREFIX = "toefl-exam-draft:";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function storageKey(testId: string, mode: TestExamMode): string {
  return `${KEY_PREFIX}${testId}:${mode}`;
}

export interface SanitizeRestoredStageContext {
  mode: TestExamMode;
  lrIndex: number;
  ivIndex: number;
  lrTotal: number;
  ivTotal: number;
}

function countRecordingsByKind(
  recordings: PersistedPendingRecording[],
  kind: PersistedPendingRecording["kind"]
): number {
  const ids = new Set<string>();
  for (const recording of recordings) {
    if (recording.kind !== kind) continue;
    const id =
      kind === "listen_repeat"
        ? (recording.promptId ?? recording.title)
        : (recording.questionId ?? recording.title);
    ids.add(id);
  }
  return ids.size;
}

/** Avoid restoring into a live recording / analysis state after refresh. */
export function sanitizeRestoredStage(
  stage: PersistedExamStage,
  recordings: PersistedPendingRecording[],
  results: PersistedExamResults | null,
  context?: SanitizeRestoredStageContext
): PersistedExamStage {
  if (results) return "results";
  if (stage === "analyzing") {
    return recordings.length > 0 ? "section_complete" : "ready";
  }

  const lrDone =
    context != null
      ? countRecordingsByKind(recordings, "listen_repeat") >= context.lrTotal
      : false;
  const ivDone =
    context != null
      ? countRecordingsByKind(recordings, "interview") >= context.ivTotal
      : false;

  if (context?.mode === "full" && stage === "section_complete" && lrDone && !ivDone) {
    return countRecordingsByKind(recordings, "interview") === 0
      ? "section_break"
      : "iv_item_complete";
  }

  if (
    stage === "lr_recording" ||
    stage === "iv_recording" ||
    stage === "iv_preparing" ||
    stage === "lr_listen" ||
    stage === "iv_question_listen" ||
    stage === "iv_intro"
  ) {
    if (recordings.length === 0) {
      return stage === "iv_recording" ||
        stage === "iv_preparing" ||
        stage === "iv_question_listen" ||
        stage === "iv_intro"
        ? "iv_instruction"
        : "lr_instruction";
    }

    if (context?.mode === "full" && lrDone && stage.startsWith("lr")) {
      return "section_break";
    }

    return stage.startsWith("iv") ? "iv_item_complete" : "lr_item_complete";
  }

  return stage;
}

export function loadExamDraft(
  testId: string,
  mode: TestExamMode
): PersistedExamDraft | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.sessionStorage.getItem(storageKey(testId, mode));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PersistedExamDraft;
    if (parsed.testId !== testId || parsed.mode !== mode) return null;
    if (!Array.isArray(parsed.recordings)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveExamDraft(draft: PersistedExamDraft): void {
  if (!isBrowser()) return;
  if (draft.stage === "ready" && draft.recordings.length === 0) {
    clearExamDraft(draft.testId, draft.mode);
    return;
  }
  try {
    window.sessionStorage.setItem(
      storageKey(draft.testId, draft.mode),
      JSON.stringify({ ...draft, updatedAt: new Date().toISOString() })
    );
  } catch {
    // Quota exceeded or private mode — ignore.
  }
}

export function clearExamDraft(testId: string, mode: TestExamMode): void {
  if (!isBrowser()) return;
  window.sessionStorage.removeItem(storageKey(testId, mode));
}

export function findLatestExamDraft(): PersistedExamDraft | null {
  if (!isBrowser()) return null;
  let latest: PersistedExamDraft | null = null;
  for (let i = 0; i < window.sessionStorage.length; i += 1) {
    const key = window.sessionStorage.key(i);
    if (!key?.startsWith(KEY_PREFIX)) continue;
    try {
      const raw = window.sessionStorage.getItem(key);
      if (!raw) continue;
      const parsed = JSON.parse(raw) as PersistedExamDraft;
      if (!parsed.recordings?.length) continue;
      if (
        !latest ||
        new Date(parsed.updatedAt).getTime() >
          new Date(latest.updatedAt).getTime()
      ) {
        latest = parsed;
      }
    } catch {
      // skip
    }
  }
  return latest;
}
