import { OFFICIAL_SPEAKING_SETS } from "@/lib/etsOfficialSpeaking";
import {
  getInterviewSessionForOfficialSet,
} from "@/lib/interviewPrompts";
import { getPromptsBySetId } from "@/lib/prompts";
import type {
  TestQuestionProgress,
  TestSet,
  TestSetCompletionStatus,
} from "@/lib/testLibrary/types";

export const LISTEN_REPEAT_PER_SET = 7;
export const INTERVIEW_PER_SET = 4;

const EMPTY_LR: (number | null)[] = [null, null, null, null, null, null, null];
const EMPTY_IV: (number | null)[] = [null, null, null, null];

function lrLabel(n: number): string {
  return `Q${n}`;
}

function ivLabel(n: number): string {
  return `Q${LISTEN_REPEAT_PER_SET + n}`;
}

function buildListenRepeatQuestions(
  officialSetId: string,
  scores: (number | null)[]
): TestQuestionProgress[] {
  const prompts = getPromptsBySetId(officialSetId);
  const firstOpen = scores.findIndex((s) => s == null);

  return scores.map((score, i) => {
    const prompt = prompts[i]!;
    let status: TestQuestionProgress["status"] = "not_started";
    if (score != null) status = "completed";
    else if (i === firstOpen && scores.some((s) => s != null)) status = "in_progress";

    return {
      label: lrLabel(i + 1),
      sequence: i + 1,
      promptRefId: prompt.id,
      status,
      score,
      completedAt: score != null ? new Date().toISOString() : null,
    };
  });
}

function buildInterviewQuestions(
  officialSetId: string,
  scores: (number | null)[]
): TestQuestionProgress[] {
  const session = getInterviewSessionForOfficialSet(officialSetId)!;
  const firstOpen = scores.findIndex((s) => s == null);

  return scores.map((score, i) => {
    const q = session.questions[i]!;
    let status: TestQuestionProgress["status"] = "not_started";
    if (score != null) status = "completed";
    else if (i === firstOpen && scores.some((s) => s != null)) status = "in_progress";

    return {
      label: ivLabel(i + 1),
      sequence: i + 1,
      promptRefId: q.id,
      status,
      score,
      completedAt: score != null ? new Date().toISOString() : null,
    };
  });
}

function deriveCompletion(
  lr: TestQuestionProgress[],
  iv: TestQuestionProgress[]
): TestSetCompletionStatus {
  const all = [...lr, ...iv];
  if (all.every((q) => q.status === "not_started")) return "not_started";
  if (all.every((q) => q.status === "completed")) return "completed";
  return "in_progress";
}

function makeSet(
  id: string,
  officialSetId: string,
  userCount: number
): TestSet {
  const official = OFFICIAL_SPEAKING_SETS.find((s) => s.id === officialSetId)!;
  const listenRepeatQuestions = buildListenRepeatQuestions(officialSetId, EMPTY_LR);
  const interviewQuestions = buildInterviewQuestions(officialSetId, EMPTY_IV);

  return {
    id,
    title: official.title,
    subtitle: official.subtitle,
    userCount,
    lastAttemptAt: null,
    completionStatus: deriveCompletion(listenRepeatQuestions, interviewQuestions),
    listenRepeatQuestions,
    interviewQuestions,
    scores: {
      listenRepeatAverage: null,
      interviewAverage: null,
    },
  };
}

/** Official ETS sets + custom practice tests mapped to dashboard cards. */
const TEST_TO_OFFICIAL_SET: Record<string, string> = {
  "test-01": "ets-tr-01",
  "test-02": "ets-fl-01",
  "test-03": "ets-fl-02",
  "test-04": "ets-tr-02",
  "test-05": "custom-01",
  "test-06": "custom-02",
  "test-07": "custom-03",
  "test-08": "custom-04",
};

/** One card per speaking practice set (7 L&R + 4 Interview). */
export const MOCK_TEST_SETS: TestSet[] = [
  makeSet("test-01", "ets-tr-01", 2847),
  makeSet("test-02", "ets-fl-01", 1923),
  makeSet("test-03", "ets-fl-02", 3102),
  makeSet("test-04", "ets-tr-02", 1567),
  makeSet("test-05", "custom-01", 1240),
  makeSet("test-06", "custom-02", 986),
  makeSet("test-07", "custom-03", 1105),
  makeSet("test-08", "custom-04", 872),
];

export function getTestSetById(id: string): TestSet | undefined {
  return MOCK_TEST_SETS.find((t) => t.id === id);
}

export function formatUserCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function getOfficialSetIdForTest(testId: string): string | undefined {
  return TEST_TO_OFFICIAL_SET[testId];
}
