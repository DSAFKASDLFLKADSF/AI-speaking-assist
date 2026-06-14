import type { InterviewScores } from "@/components/InterviewScoreCard";
import type { AnalyzeInterviewResponse } from "@/lib/analyze-interview-types";
import type { AnalyzeSpeechResponse } from "@/lib/analyze-speech-types";
import {
  formatSpeakingBand,
  SPEAKING_BAND_MAX,
} from "@/lib/toeflSpeakingBand";

const STORAGE_KEY = "toefl-speaking-local-history";
const MAX_ENTRIES = 100;

export type LocalPracticeMode = "listen_repeat" | "interview" | "mock_exam";

export interface LocalListenRepeatDetail {
  promptId: string;
  title: string;
  score: number;
  scoreSummary: string;
  feedbackSummary: string;
  /** Full prompt text for history detail view */
  original?: string;
  /** Full scoring payload when saved after a completed exam */
  analysis?: AnalyzeSpeechResponse;
}

export interface LocalInterviewDetail {
  questionId: string;
  title?: string;
  sessionTheme: string;
  promptPreview: string;
  scores: InterviewScores;
  scoreSummary: string;
  feedbackSummary: string;
  /** Full question text for history detail view */
  promptText?: string;
  /** Full scoring payload when saved after a completed exam */
  analysis?: AnalyzeInterviewResponse;
}

export interface LocalMockExamDetail {
  sessionId: string;
  sessionTheme: string;
  listenRepeat: LocalListenRepeatDetail[];
  interview: LocalInterviewDetail[];
  /** Section band 1–6 (0.5 steps), from summed item scores. */
  listenRepeatAvg: number;
  /** Section band 1–6 (0.5 steps), from summed item scores. */
  interviewAvg: number;
  /** Overall Speaking band 1–6 (0.5 steps), from all item scores. */
  overallScore: number;
}

export interface LocalHistoryEntry {
  id: string;
  mode: LocalPracticeMode;
  createdAt: string;
  title: string;
  summary: string;
  testSetId?: string;
  examMode?: TestExamMode;
  promptId?: string;
  questionId?: string;
  listenRepeatScore?: number;
  interviewScores?: InterviewScores;
  mockExam?: LocalMockExamDetail;
  overallFeedback?: string;
}

export type TestExamMode = "full" | "listen_repeat" | "interview";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readAll(): LocalHistoryEntry[] {
  if (!isBrowser()) return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as LocalHistoryEntry[];
  } catch {
    return [];
  }
}

function writeAll(entries: LocalHistoryEntry[]): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(entries.slice(0, MAX_ENTRIES))
  );
}

function newId(): string {
  return `local-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function getLocalHistory(): LocalHistoryEntry[] {
  return readAll().sort(
    (a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function addLocalHistoryEntry(
  entry: Omit<LocalHistoryEntry, "id" | "createdAt"> & {
    id?: string;
    createdAt?: string;
  }
): LocalHistoryEntry {
  const record: LocalHistoryEntry = {
    id: entry.id ?? newId(),
    createdAt: entry.createdAt ?? new Date().toISOString(),
    mode: entry.mode,
    title: entry.title,
    summary: entry.summary,
    testSetId: entry.testSetId,
    examMode: entry.examMode,
    listenRepeatScore: entry.listenRepeatScore,
    interviewScores: entry.interviewScores,
    mockExam: entry.mockExam,
    overallFeedback: entry.overallFeedback,
    promptId: entry.promptId,
    questionId: entry.questionId,
  };

  const next = [record, ...readAll()].slice(0, MAX_ENTRIES);
  writeAll(next);
  return record;
}

export function clearLocalHistory(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function interviewScoresAverage(scores: InterviewScores): number {
  return (
    (scores.topic + scores.pace + scores.pronunciation + scores.grammar) / 4
  );
}

export function saveListenRepeatLocalHistory(input: {
  promptId: string;
  title: string;
  score: number;
  scoreSummary: string;
  feedbackSummary: string;
}): LocalHistoryEntry {
  return addLocalHistoryEntry({
    mode: "listen_repeat",
    title: input.title,
    summary: input.scoreSummary,
    promptId: input.promptId,
    listenRepeatScore: input.score,
    overallFeedback: input.feedbackSummary,
  });
}

export function saveInterviewLocalHistory(input: {
  sessionTheme: string;
  questionId: string;
  promptPreview: string;
  scores: InterviewScores;
  scoreSummary: string;
  feedbackSummary: string;
}): LocalHistoryEntry {
  return addLocalHistoryEntry({
    mode: "interview",
    title: `${input.sessionTheme} · Interview`,
    summary: input.scoreSummary,
    questionId: input.questionId,
    interviewScores: input.scores,
    overallFeedback: input.feedbackSummary,
  });
}

export function saveMockExamLocalHistory(
  detail: LocalMockExamDetail,
  meta?: { testSetId?: string; examMode?: TestExamMode; title?: string }
): LocalHistoryEntry {
  return addLocalHistoryEntry({
    mode: "mock_exam",
    testSetId: meta?.testSetId,
    examMode: meta?.examMode ?? "full",
    title: meta?.title ?? `Full Mock · ${detail.sessionTheme}`,
    summary: `Listen & Repeat ${formatSpeakingBand(detail.listenRepeatAvg)}/${SPEAKING_BAND_MAX} · Interview ${formatSpeakingBand(detail.interviewAvg)}/${SPEAKING_BAND_MAX} · Overall ${formatSpeakingBand(detail.overallScore)}/${SPEAKING_BAND_MAX}`,
    mockExam: detail,
    overallFeedback: `Completed ${detail.listenRepeat.length} Listen & Repeat prompts and ${detail.interview.length} interview questions.`,
  });
}

export function getHistoryForTestSet(testSetId: string): LocalHistoryEntry[] {
  return getLocalHistory().filter((e) => e.testSetId === testSetId);
}
