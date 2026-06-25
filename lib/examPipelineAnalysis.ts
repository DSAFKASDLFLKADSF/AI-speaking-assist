import type { AnalyzeInterviewResponse } from "@/lib/analyze-interview-types";
import type { AnalyzeSpeechResponse } from "@/lib/analyze-speech-types";
import {
  analyzeInterview,
  analyzeSpeech,
  ApiError,
} from "@/lib/api";
import { formatAnalysisError, recordingKey } from "@/lib/examRecordings";
import { refreshSignedAudioUrl } from "@/lib/uploadAudio";

export const PIPELINE_MAX_CONCURRENT = 1;

export interface ExamRecordingForAnalysis {
  kind: "listen_repeat" | "interview";
  promptId?: string;
  questionId?: string;
  title: string;
  promptText: string;
  original?: string;
  audioUrl: string;
  storagePath: string;
  bucket?: string;
  responseSeconds: number;
  durationMs: number;
}

export type PipelineItemOutcome =
  | { status: "done"; analysis: AnalyzeSpeechResponse | AnalyzeInterviewResponse }
  | { status: "failed"; error: string };

export interface PipelinePartialResults {
  listenRepeat: Array<{
    pending: ExamRecordingForAnalysis;
    analysis?: AnalyzeSpeechResponse;
    error?: string;
  }>;
  interview: Array<{
    pending: ExamRecordingForAnalysis;
    analysis?: AnalyzeInterviewResponse;
    error?: string;
  }>;
}

export function emptyPipelinePartial(): PipelinePartialResults {
  return { listenRepeat: [], interview: [] };
}

function upsertPipelineRow<T extends ExamRecordingForAnalysis, A>(
  rows: Array<{ pending: T; analysis?: A; error?: string }>,
  recording: T,
  outcome: PipelineItemOutcome
): Array<{ pending: T; analysis?: A; error?: string }> {
  const key = recordingKey(recording);
  const filtered = rows.filter((row) => recordingKey(row.pending) !== key);
  if (outcome.status === "done") {
    return [...filtered, { pending: recording, analysis: outcome.analysis as A }];
  }
  return [...filtered, { pending: recording, error: outcome.error }];
}

export function applyPipelineOutcome(
  partial: PipelinePartialResults,
  recording: ExamRecordingForAnalysis,
  outcome: PipelineItemOutcome
): PipelinePartialResults {
  if (recording.kind === "listen_repeat") {
    return {
      ...partial,
      listenRepeat: upsertPipelineRow(
        partial.listenRepeat,
        recording,
        outcome
      ),
    };
  }
  return {
    ...partial,
    interview: upsertPipelineRow(partial.interview, recording, outcome),
  };
}

export function getPipelineAnalysis(
  partial: PipelinePartialResults,
  recording: ExamRecordingForAnalysis
): AnalyzeSpeechResponse | AnalyzeInterviewResponse | undefined {
  const key = recordingKey(recording);
  const rows =
    recording.kind === "listen_repeat" ? partial.listenRepeat : partial.interview;
  const row = rows.find((r) => recordingKey(r.pending) === key);
  if (!row?.analysis) return undefined;
  // Re-record: same question key but new upload — ignore stale analysis.
  if (row.pending.storagePath !== recording.storagePath) return undefined;
  return row.analysis;
}

/** Drop cached score for a question (before re-record or re-score). */
export function clearPipelineEntry(
  partial: PipelinePartialResults,
  recording: ExamRecordingForAnalysis
): PipelinePartialResults {
  const key = recordingKey(recording);
  if (recording.kind === "listen_repeat") {
    return {
      ...partial,
      listenRepeat: partial.listenRepeat.filter(
        (row) => recordingKey(row.pending) !== key
      ),
    };
  }
  return {
    ...partial,
    interview: partial.interview.filter(
      (row) => recordingKey(row.pending) !== key
    ),
  };
}

export function needsPipelineAnalysis(
  partial: PipelinePartialResults,
  recording: ExamRecordingForAnalysis
): boolean {
  return getPipelineAnalysis(partial, recording) === undefined;
}

export function countPipelineScored(partial: PipelinePartialResults): number {
  return (
    partial.listenRepeat.filter((row) => row.analysis).length +
    partial.interview.filter((row) => row.analysis).length
  );
}

export function countPipelineInFlight(
  partial: PipelinePartialResults,
  recordings: ExamRecordingForAnalysis[]
): number {
  let inFlight = 0;
  for (const recording of recordings) {
    if (getPipelineAnalysis(partial, recording)) continue;
    const key = recordingKey(recording);
    const rows =
      recording.kind === "listen_repeat"
        ? partial.listenRepeat
        : partial.interview;
    const row = rows.find((r) => recordingKey(r.pending) === key);
    if (
      row?.error &&
      row.pending.storagePath === recording.storagePath
    ) {
      continue;
    }
    inFlight += 1;
  }
  return inFlight;
}

async function resolveAudioUrl(recording: ExamRecordingForAnalysis): Promise<string> {
  try {
    return await refreshSignedAudioUrl(
      recording.storagePath,
      recording.bucket
    );
  } catch {
    return recording.audioUrl;
  }
}

export async function analyzeExamRecording(
  recording: ExamRecordingForAnalysis,
  onStatus?: (status: string) => void
): Promise<AnalyzeSpeechResponse | AnalyzeInterviewResponse> {
  const audioUrl = await resolveAudioUrl(recording);

  if (recording.kind === "listen_repeat") {
    return analyzeSpeech(
      {
        audioUrl,
        storagePath: recording.storagePath,
        original: recording.original ?? recording.promptText,
        promptId: recording.promptId,
      },
      { onStatus }
    );
  }

  return analyzeInterview(
    {
      audioUrl,
      storagePath: recording.storagePath,
      prompt: recording.promptText,
      questionId: recording.questionId,
      responseSeconds: recording.responseSeconds,
      durationMs: recording.durationMs,
    },
    { onStatus }
  );
}

export function formatPipelineError(err: unknown): string {
  if (err instanceof ApiError) {
    return formatAnalysisError(err.message);
  }
  return formatAnalysisError(
    err instanceof Error ? err.message : "Analysis failed."
  );
}

type QueueItem = {
  key: string;
  recording: ExamRecordingForAnalysis;
  generation: number;
};

export interface ExamAnalysisPipelineOptions {
  maxConcurrent?: number;
  onItemDone: (
    recording: ExamRecordingForAnalysis,
    outcome: PipelineItemOutcome
  ) => void;
}

/** Background analysis queue — submit while the user continues the exam. */
export class ExamAnalysisPipeline {
  private readonly maxConcurrent: number;

  private readonly onItemDone: ExamAnalysisPipelineOptions["onItemDone"];

  private readonly generations = new Map<string, number>();

  private queue: QueueItem[] = [];

  private activeCount = 0;

  private idleWaiters: Array<() => void> = [];

  /** Incremented on reset — in-flight jobs from before reset must not write results. */
  private runEpoch = 0;

  constructor(options: ExamAnalysisPipelineOptions) {
    this.maxConcurrent = options.maxConcurrent ?? PIPELINE_MAX_CONCURRENT;
    this.onItemDone = options.onItemDone;
  }

  enqueue(recording: ExamRecordingForAnalysis): void {
    const key = recordingKey(recording);
    const generation = (this.generations.get(key) ?? 0) + 1;
    this.generations.set(key, generation);
    this.queue = this.queue.filter((item) => item.key !== key);
    this.queue.push({ key, recording, generation });
    this.pump();
  }

  reset(): void {
    this.runEpoch += 1;
    this.queue = [];
    this.generations.clear();
  }

  waitForIdle(): Promise<void> {
    if (this.activeCount === 0 && this.queue.length === 0) {
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.idleWaiters.push(resolve);
    });
  }

  private notifyIdleIfReady(): void {
    if (this.activeCount === 0 && this.queue.length === 0) {
      const waiters = this.idleWaiters;
      this.idleWaiters = [];
      waiters.forEach((resolve) => resolve());
    }
  }

  private pump(): void {
    while (this.activeCount < this.maxConcurrent && this.queue.length > 0) {
      const item = this.queue.shift()!;
      this.activeCount += 1;
      void this.runItem(item).finally(() => {
        this.activeCount -= 1;
        this.pump();
        this.notifyIdleIfReady();
      });
    }
  }

  private async runItem(item: QueueItem): Promise<void> {
    const epoch = this.runEpoch;
    const { recording, generation } = item;
    if (this.generations.get(item.key) !== generation) return;

    try {
      const analysis = await analyzeExamRecording(recording);
      if (this.runEpoch !== epoch) return;
      if (this.generations.get(item.key) !== generation) return;
      this.onItemDone(recording, { status: "done", analysis });
    } catch (err) {
      if (this.runEpoch !== epoch) return;
      if (this.generations.get(item.key) !== generation) return;
      this.onItemDone(recording, {
        status: "failed",
        error: formatPipelineError(err),
      });
    }
  }
}

/** Run analyses in parallel with a concurrency cap (for end-of-exam catch-up). */
export async function analyzeExamRecordingsParallel<T extends ExamRecordingForAnalysis>(
  items: T[],
  options: {
    maxConcurrent?: number;
    onProgress?: (done: number, total: number, title: string | null) => void;
    onStatus?: (status: string) => void;
  } = {}
): Promise<
  Array<{
    pending: T;
    analysis?: AnalyzeSpeechResponse | AnalyzeInterviewResponse;
    error?: string;
  }>
> {
  const maxConcurrent = options.maxConcurrent ?? PIPELINE_MAX_CONCURRENT;
  const results: Array<{
    pending: T;
    analysis?: AnalyzeSpeechResponse | AnalyzeInterviewResponse;
    error?: string;
  }> = [];
  let done = 0;

  const runOne = async (item: T) => {
    options.onProgress?.(done, items.length, item.title);
    try {
      const analysis = await analyzeExamRecording(item, options.onStatus);
      results.push({ pending: item, analysis });
    } catch (err) {
      results.push({
        pending: item,
        error: formatPipelineError(err),
      });
    }
    done += 1;
    options.onProgress?.(done, items.length, null);
  };

  let index = 0;
  const workers = Array.from(
    { length: Math.min(maxConcurrent, items.length) },
    async () => {
      while (index < items.length) {
        const current = items[index]!;
        index += 1;
        await runOne(current);
      }
    }
  );

  await Promise.all(workers);
  return results;
}
