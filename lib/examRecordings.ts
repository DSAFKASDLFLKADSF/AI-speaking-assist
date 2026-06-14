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

export function formatAnalysisError(message: string): string {
  if (/empty transcript/i.test(message)) {
    return "No speech detected (recording empty or too quiet). Re-record that question if needed.";
  }
  if (
    /ECONNREFUSED|fetch failed|Failed to fetch|network error|\b502\b|\b503\b|\b504\b/i.test(
      message
    )
  ) {
    return `${message} Make sure the Python API is running on port 8000.`;
  }
  return message;
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
  const detail = failures
    .map((f) => `${f.title}: ${formatAnalysisError(f.message)}`)
    .join(" ");
  if (scoredCount < totalCount) {
    return `${scoredCount} of ${totalCount} questions scored. ${detail}`;
  }
  return detail;
}
