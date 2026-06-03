import {
  getOfficialSpeakingSetById,
  getRandomOfficialSpeakingSet,
  OFFICIAL_SPEAKING_SETS,
} from "@/lib/etsOfficialSpeaking";
import {
  getInterviewSessionForOfficialSet,
  type InterviewSession,
} from "@/lib/interviewPrompts";
import {
  getPromptsBySetId,
  type ListenRepeatPrompt,
} from "@/lib/prompts";
import { getOfficialSetIdForTest } from "@/lib/testLibrary/mockTestSets";

/** Full official Speaking section: 7 Listen & Repeat + 4 Interview. */
export const MOCK_EXAM_LISTEN_REPEAT_COUNT = 7;
export const MOCK_EXAM_RESPONSE_SECONDS = 45;
export const MOCK_EXAM_PREP_SECONDS = 0;

export interface MockExamPlan {
  listenRepeat: ListenRepeatPrompt[];
  interviewSession: InterviewSession;
  officialSetId: string;
  etsSource: string;
}

function planFromOfficialSetId(setId: string): MockExamPlan {
  const official = getOfficialSpeakingSetById(setId)!;
  const listenRepeat = getPromptsBySetId(setId);
  const interviewSession =
    getInterviewSessionForOfficialSet(setId) ??
    getInterviewSessionForOfficialSet(OFFICIAL_SPEAKING_SETS[0]!.id)!;

  return {
    listenRepeat,
    interviewSession,
    officialSetId: setId,
    etsSource: official.etsSource,
  };
}

export function buildDefaultMockExamPlan(): MockExamPlan {
  return planFromOfficialSetId(OFFICIAL_SPEAKING_SETS[0]!.id);
}

export function buildMockExamPlan(): MockExamPlan {
  const official = getRandomOfficialSpeakingSet();
  return planFromOfficialSetId(official.id);
}

export type TestExamMode = "full" | "listen_repeat" | "interview";

export function buildExamPlanForTest(testId: string): MockExamPlan {
  const officialSetId =
    getOfficialSetIdForTest(testId) ?? OFFICIAL_SPEAKING_SETS[0]!.id;
  return planFromOfficialSetId(officialSetId);
}

export const MOCK_EXAM_OVERVIEW = {
  listenRepeatCount: MOCK_EXAM_LISTEN_REPEAT_COUNT,
  interviewCount: 4,
  prepSeconds: MOCK_EXAM_PREP_SECONDS,
  responseSeconds: MOCK_EXAM_RESPONSE_SECONDS,
  estimatedMinutes: 8,
  officialSetCount: OFFICIAL_SPEAKING_SETS.length,
};
