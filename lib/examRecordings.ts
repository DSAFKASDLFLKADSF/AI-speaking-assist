import type { MockExamPlan } from "@/lib/mockExamConfig";
import type { TestExamMode } from "@/lib/localHistory";

export interface ExamRecordingRef {
  kind: "listen_repeat" | "interview";
  promptId?: string;
  questionId?: string;
  title: string;
}

export function recordingKey(r: ExamRecordingRef): string {
  if (r.kind === "listen_repeat") {
    return `lr:${r.promptId ?? r.title}`;
  }
  return `iv:${r.questionId ?? r.title}`;
}

/** Keep the latest take per question (fixes resume / re-record duplicates). */
export function dedupeRecordings<T extends ExamRecordingRef>(recordings: T[]): T[] {
  const byKey = new Map<string, T>();
  for (const recording of recordings) {
    byKey.set(recordingKey(recording), recording);
  }
  return Array.from(byKey.values());
}

export function getExpectedRecordingCount(mode: TestExamMode): number {
  switch (mode) {
    case "listen_repeat":
      return 7;
    case "interview":
      return 4;
    case "full":
      return 11;
  }
}

/** Ordered recordings for this test plan only — one per question. */
export function getScoringRecordings<T extends ExamRecordingRef>(
  recordings: T[],
  plan: MockExamPlan,
  mode: TestExamMode
): T[] {
  const deduped = dedupeRecordings(recordings);

  const lr =
    mode === "interview"
      ? []
      : plan.listenRepeat
          .map((prompt) =>
            deduped.find(
              (r) => r.kind === "listen_repeat" && r.promptId === prompt.id
            )
          )
          .filter((r): r is T => r != null);

  const iv =
    mode === "listen_repeat"
      ? []
      : plan.interviewSession.questions
          .map((question) =>
            deduped.find(
              (r) => r.kind === "interview" && r.questionId === question.id
            )
          )
          .filter((r): r is T => r != null);

  return [...lr, ...iv];
}

export function countRemovedDuplicates<T extends ExamRecordingRef>(
  recordings: T[]
): number {
  return recordings.length - dedupeRecordings(recordings).length;
}

export function countExtraRecordings<T extends ExamRecordingRef>(
  recordings: T[],
  plan: MockExamPlan,
  mode: TestExamMode
): number {
  return dedupeRecordings(recordings).length - getScoringRecordings(recordings, plan, mode).length;
}

export function upsertRecording<T extends ExamRecordingRef>(
  recordings: T[],
  next: T
): T[] {
  const key = recordingKey(next);
  return [...recordings.filter((r) => recordingKey(r) !== key), next];
}

export interface AnalysisResultRow<T extends ExamRecordingRef, A> {
  pending: T;
  analysis?: A;
}

/** Merge newly scored rows with prior results so every question appears once. */
export function mergeExamAnalysisResults<
  T extends ExamRecordingRef,
  AL,
  AI,
>(
  allRecordings: T[],
  newListenRepeat: AnalysisResultRow<T, AL>[],
  newInterview: AnalysisResultRow<T, AI>[],
  previous?: {
    listenRepeat?: AnalysisResultRow<T, AL>[];
    interview?: AnalysisResultRow<T, AI>[];
  } | null
): {
  listenRepeat: AnalysisResultRow<T, AL>[];
  interview: AnalysisResultRow<T, AI>[];
} {
  const mergeSection = <A,>(
    items: T[],
    newRows: AnalysisResultRow<T, A>[],
    previousRows: AnalysisResultRow<T, A>[] | undefined
  ): AnalysisResultRow<T, A>[] =>
    items.map((pending) => {
      const key = recordingKey(pending);
      const pendingPath =
        "storagePath" in pending
          ? (pending as { storagePath?: string }).storagePath
          : undefined;
      const fromNew = newRows.find((row) => recordingKey(row.pending) === key);
      if (fromNew?.analysis) return fromNew;
      const fromOld = previousRows?.find(
        (row) => recordingKey(row.pending) === key
      );
      if (
        fromOld?.analysis &&
        (!pendingPath ||
          !("storagePath" in fromOld.pending) ||
          (fromOld.pending as { storagePath?: string }).storagePath ===
            pendingPath)
      ) {
        return { pending, analysis: fromOld.analysis };
      }
      if (fromNew) return fromNew;
      if (fromOld && !fromOld.analysis) return { pending };
      return { pending };
    });

  return {
    listenRepeat: mergeSection(
      allRecordings.filter((r) => r.kind === "listen_repeat"),
      newListenRepeat,
      previous?.listenRepeat
    ),
    interview: mergeSection(
      allRecordings.filter((r) => r.kind === "interview"),
      newInterview,
      previous?.interview
    ),
  };
}

const IS_DEV = process.env.NODE_ENV === "development";

export function formatUploadError(message: string): string {
  if (/logged in to upload/i.test(message)) {
    return "Could not save your recording. Please sign in and try again.";
  }
  if (/policy|row-level|permission|denied|RLS|supabase/i.test(message)) {
    return "Could not save your recording. Please try again in a moment.";
  }
  if (/mime|content.?type|400/i.test(message)) {
    return "Could not save your recording (unsupported audio format). Try recording again.";
  }
  if (
    /ECONNREFUSED|fetch failed|Failed to fetch|network error|\b502\b|\b503\b|\b504\b/i.test(
      message
    )
  ) {
    return IS_DEV
      ? "Could not upload recording — server unreachable. Is the app running?"
      : "Could not save your recording. Check your connection and try again.";
  }
  if (/upload failed/i.test(message)) {
    return "Could not save your recording. Please try again.";
  }
  return message;
}

export function formatAnalysisError(message: string): string {
  if (/empty transcript|no speech detected/i.test(message)) {
    return "No speech detected — the recording may be empty or too quiet. Try re-recording.";
  }
  if (/ASSEMBLYAI|assemblyai|transcri/i.test(message)) {
    return "Speech recognition failed. Try re-recording in a quiet place.";
  }
  if (/GLM|zhipu|rate limit|429/i.test(message)) {
    return "Scoring service is busy. Wait a moment and tap “Score recordings” again.";
  }
  if (/timeout|timed out/i.test(message)) {
    return "Scoring took too long. Try again.";
  }
  if (/401|403|api key|unauthorized/i.test(message)) {
    return IS_DEV
      ? "Scoring service authentication failed (check server API keys)."
      : "Scoring is temporarily unavailable. Please try again later.";
  }
  if (
    /ECONNREFUSED|fetch failed|Failed to fetch|network error|\b502\b|\b503\b|\b504\b|Cannot reach Python/i.test(
      message
    )
  ) {
    return IS_DEV
      ? "Scoring service unreachable. Start the Python API on port 8000."
      : "Scoring is temporarily unavailable. Please try again later.";
  }
  if (/Poll failed|Request failed/i.test(message)) {
    return "Scoring failed. Please try again.";
  }
  return message.length > 120 ? `${message.slice(0, 117)}…` : message;
}

export function needsInterviewContinuation(
  mode: TestExamMode,
  recordings: ExamRecordingRef[],
  plan: MockExamPlan
): boolean {
  if (mode !== "full") return false;
  const scoring = getScoringRecordings(recordings, plan, mode);
  const lrCount = scoring.filter((r) => r.kind === "listen_repeat").length;
  const ivCount = scoring.filter((r) => r.kind === "interview").length;
  return (
    lrCount >= plan.listenRepeat.length &&
    ivCount < plan.interviewSession.questions.length
  );
}

export function canFinishExam(
  mode: TestExamMode,
  recordings: ExamRecordingRef[],
  plan: MockExamPlan
): boolean {
  const scoring = getScoringRecordings(recordings, plan, mode);
  if (mode === "listen_repeat") {
    return scoring.length >= plan.listenRepeat.length;
  }
  if (mode === "interview") {
    return scoring.length >= plan.interviewSession.questions.length;
  }
  return scoring.length >= getExpectedRecordingCount("full");
}

export function findResumeIvIndex(
  recordings: ExamRecordingRef[],
  plan: MockExamPlan
): number {
  for (let i = 0; i < plan.interviewSession.questions.length; i += 1) {
    const question = plan.interviewSession.questions[i]!;
    const hasRecording = recordings.some(
      (r) => r.kind === "interview" && r.questionId === question.id
    );
    if (!hasRecording) return i;
  }
  return Math.max(0, plan.interviewSession.questions.length - 1);
}

export const LOW_MIC_QUALITY_HINT =
  "Microphone level was too low — nothing usable may have been captured. Check your input device, speak closer to the mic, and use headphones if the prompt plays through speakers.";

/** Peak mic RMS (0–1) below this suggests silence or wrong input device. */
export const MIN_RECORDING_PEAK_LEVEL = 0.04;

/** WebM with only a container header and no speech is typically ~8–10KB. */
export const MIN_RECORDING_BLOB_BYTES = 10_000;

/**
 * Heuristic for exam recordings: UI level meters can show activity while
 * MediaRecorder captured almost nothing — use peak level AND file size.
 */
export function isLowMicQualityRecording(params: {
  examMode: boolean;
  durationMs: number;
  peakLevel: number;
  blobSize: number;
}): boolean {
  const { examMode, durationMs, peakLevel, blobSize } = params;
  if (!examMode || durationMs < 1500) return false;

  if (blobSize < MIN_RECORDING_BLOB_BYTES) return true;

  const expectedMinBytes =
    8_000 + Math.floor((durationMs / 1000) * 2_000);
  return peakLevel < MIN_RECORDING_PEAK_LEVEL && blobSize < expectedMinBytes;
}

export function buildLowMicQualityWarning(
  recordings: Array<{ title: string; lowMicQuality?: boolean }>
): string | null {
  const flagged = recordings.filter((r) => r.lowMicQuality);
  if (flagged.length === 0) return null;
  if (flagged.length === 1) {
    return `${flagged[0]!.title}: ${LOW_MIC_QUALITY_HINT}`;
  }
  const titles = flagged.map((r) => r.title).join(", ");
  return `${flagged.length} recordings (${titles}) may have low mic levels. ${LOW_MIC_QUALITY_HINT}`;
}

export function buildBatchAnalysisErrorMessage(
  failures: Array<{ title: string; message: string }>,
  scoredCount: number,
  totalCount: number
): string | null {
  if (failures.length === 0) return null;

  const seen = new Set<string>();
  const unique = failures.filter((f) => {
    const key = `${f.title}\0${f.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const detail = unique
    .map((f) => `${f.title}: ${formatAnalysisError(f.message)}`)
    .join(" ");
  if (scoredCount < totalCount) {
    return `${scoredCount} of ${totalCount} questions scored. ${detail}`;
  }
  return detail;
}

export function collectUnscoredFailures(
  partial: {
    listenRepeat: Array<{
      pending: ExamRecordingRef;
      analysis?: unknown;
      error?: string;
    }>;
    interview: Array<{
      pending: ExamRecordingRef;
      analysis?: unknown;
      error?: string;
    }>;
  }
): Array<{ title: string; message: string }> {
  const failures: Array<{ title: string; message: string }> = [];
  const seen = new Set<string>();

  for (const row of [...partial.listenRepeat, ...partial.interview]) {
    if (row.analysis || !row.error) continue;
    const key = recordingKey(row.pending);
    if (seen.has(key)) continue;
    seen.add(key);
    failures.push({ title: row.pending.title, message: row.error });
  }

  return failures;
}
