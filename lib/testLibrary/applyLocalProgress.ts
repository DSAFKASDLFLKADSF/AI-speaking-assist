import {
  getLocalHistory,
  interviewScoresAverage,
} from "@/lib/localHistory";
import { getTestSetById, MOCK_TEST_SETS } from "@/lib/testLibrary/mockTestSets";
import { averageScores, normalizeScore } from "@/lib/testLibrary/scores";
import type { TestQuestionProgress, TestSet } from "@/lib/testLibrary/types";

/** Latest score per prompt / question id from device practice history. */
function buildScoreMaps(testSetId?: string) {
  const lr = new Map<string, { score: number; at: string }>();
  const iv = new Map<string, { score: number; at: string }>();

  for (const entry of getLocalHistory()) {
    if (
      testSetId &&
      entry.testSetId &&
      entry.testSetId !== testSetId
    ) {
      continue;
    }
    if (entry.promptId && entry.listenRepeatScore != null) {
      const score = normalizeScore(entry.listenRepeatScore);
      if (score == null) continue;
      const prev = lr.get(entry.promptId);
      if (!prev || entry.createdAt > prev.at) {
        lr.set(entry.promptId, {
          score,
          at: entry.createdAt,
        });
      }
    }
    if (entry.questionId && entry.interviewScores) {
      const avg = interviewScoresAverage(entry.interviewScores);
      const score = normalizeScore(avg);
      if (score == null) continue;
      const prev = iv.get(entry.questionId);
      if (!prev || entry.createdAt > prev.at) {
        iv.set(entry.questionId, { score, at: entry.createdAt });
      }
    }
    if (entry.mockExam) {
      for (const item of entry.mockExam.listenRepeat) {
        const score = normalizeScore(item.score);
        if (score == null) continue;
        const prev = lr.get(item.promptId);
        if (!prev || entry.createdAt > prev.at) {
          lr.set(item.promptId, { score, at: entry.createdAt });
        }
      }
      for (const item of entry.mockExam.interview) {
        const avg = interviewScoresAverage(item.scores);
        const score = normalizeScore(avg);
        if (score == null) continue;
        const prev = iv.get(item.questionId);
        if (!prev || entry.createdAt > prev.at) {
          iv.set(item.questionId, { score, at: entry.createdAt });
        }
      }
    }
  }

  return { lr, iv };
}

function applyScoresToQuestions(
  questions: TestQuestionProgress[],
  scores: Map<string, { score: number; at: string }>
): TestQuestionProgress[] {
  const updated: TestQuestionProgress[] = questions.map((q) => {
    const hit = scores.get(q.promptRefId);
    if (!hit) return { ...q, score: null, status: "not_started", completedAt: null };
    return {
      ...q,
      score: hit.score,
      status: "completed",
      completedAt: hit.at,
    };
  });

  const firstOpen = updated.findIndex((q) => q.status !== "completed");
  if (firstOpen >= 0 && updated.some((q) => q.status === "completed")) {
    updated[firstOpen] = { ...updated[firstOpen]!, status: "in_progress" };
  }

  return updated;
}

export function applyLocalProgressToTestSets(sets: TestSet[]): TestSet[] {
  if (typeof window === "undefined") return sets;

  return sets.map((set) => {
    const { lr, iv } = buildScoreMaps(set.id);
    let latestAt: string | null = null;

    const listenRepeatQuestions = applyScoresToQuestions(
      set.listenRepeatQuestions.map((q) => ({
        ...q,
        score: null,
        status: "not_started" as const,
        completedAt: null,
      })),
      lr
    );
    const interviewQuestions = applyScoresToQuestions(
      set.interviewQuestions.map((q) => ({
        ...q,
        score: null,
        status: "not_started" as const,
        completedAt: null,
      })),
      iv
    );

    for (const q of [...listenRepeatQuestions, ...interviewQuestions]) {
      if (q.completedAt && (!latestAt || q.completedAt > latestAt)) {
        latestAt = q.completedAt;
      }
    }

    const all = [...listenRepeatQuestions, ...interviewQuestions];
    const completionStatus = all.every((q) => q.status === "not_started")
      ? ("not_started" as const)
      : all.every((q) => q.status === "completed")
        ? ("completed" as const)
        : ("in_progress" as const);

    return {
      ...set,
      listenRepeatQuestions,
      interviewQuestions,
      lastAttemptAt: latestAt,
      completionStatus,
      scores: {
        listenRepeatAverage: averageScores(listenRepeatQuestions),
        interviewAverage: averageScores(interviewQuestions),
      },
    };
  });
}

export function getTestSetWithProgress(id: string): TestSet | undefined {
  const base = getTestSetById(id);
  if (!base) return undefined;
  if (typeof window === "undefined") return base;
  return applyLocalProgressToTestSets([base])[0];
}

export function getAllTestSetsWithProgress(): TestSet[] {
  if (typeof window === "undefined") return MOCK_TEST_SETS;
  return applyLocalProgressToTestSets(MOCK_TEST_SETS);
}
