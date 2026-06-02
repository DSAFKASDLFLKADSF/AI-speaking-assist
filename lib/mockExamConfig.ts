import {
  getRandomInterviewSession,
  type InterviewSession,
} from "@/lib/interviewPrompts";
import {
  LISTEN_REPEAT_PROMPTS,
  type ListenRepeatPrompt,
} from "@/lib/prompts";

export const MOCK_EXAM_LISTEN_REPEAT_COUNT = 5;
export const MOCK_EXAM_RESPONSE_SECONDS = 45;
export const MOCK_EXAM_PREP_SECONDS = 0;

export interface MockExamPlan {
  listenRepeat: ListenRepeatPrompt[];
  interviewSession: InterviewSession;
}

function shuffle<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

export function buildMockExamPlan(): MockExamPlan {
  const listenRepeat = shuffle(LISTEN_REPEAT_PROMPTS).slice(
    0,
    MOCK_EXAM_LISTEN_REPEAT_COUNT
  );
  return {
    listenRepeat,
    interviewSession: getRandomInterviewSession(),
  };
}

export const MOCK_EXAM_OVERVIEW = {
  listenRepeatCount: MOCK_EXAM_LISTEN_REPEAT_COUNT,
  interviewCount: 4,
  prepSeconds: MOCK_EXAM_PREP_SECONDS,
  responseSeconds: MOCK_EXAM_RESPONSE_SECONDS,
  estimatedMinutes: 14,
};
