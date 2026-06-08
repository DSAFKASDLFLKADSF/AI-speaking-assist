/**
 * 2026 TOEFL Speaking — Take an Interview (Virtual Interview)
 *
 * Content from ETS official practice materials (see lib/etsOfficialSpeaking.ts).
 * Each session: 4 questions · 0s prep · 45s response.
 */

import {
  OFFICIAL_SPEAKING_SETS,
  type OfficialInterviewQuestionType,
} from "@/lib/etsOfficialSpeaking";
import type { InterviewHintBullet } from "@/lib/interviewHintContent";

export type InterviewQuestionType = OfficialInterviewQuestionType;

export const INTERVIEW_QUESTION_TYPE_LABEL: Record<
  InterviewQuestionType,
  string
> = {
  personal_recall: "Personal Recall · Experience",
  preference: "Preference · Feelings",
  opinion: "Opinion · Support",
  policy_prediction: "Policy · Prediction",
};

export interface InterviewPrompt {
  id: string;
  sessionId: string;
  sequence: 1 | 2 | 3 | 4;
  theme: string;
  topic: string;
  questionType: InterviewQuestionType;
  taskNumber: 1 | 2 | 3 | 4;
  taskLabel: string;
  prompt: string;
  prepSeconds: 0;
  responseSeconds: 45;
  hints: InterviewHintBullet[];
  etsSource: string;
}

export interface InterviewSession {
  id: string;
  theme: string;
  topic: string;
  intro: string;
  questions: InterviewPrompt[];
  etsSource: string;
  officialSetId: string;
}

const TIMING = { prepSeconds: 0 as const, responseSeconds: 45 as const };

function buildSessionsFromOfficial(): InterviewSession[] {
  return OFFICIAL_SPEAKING_SETS.map((set, setIndex) => {
    const sessionId = `iv-${String(setIndex + 1).padStart(2, "0")}`;
    const { interview, etsSource } = set;

    return {
      id: sessionId,
      theme: interview.theme,
      topic: interview.topic,
      intro: interview.intro,
      etsSource,
      officialSetId: set.id,
      questions: interview.questions.map((q, i) => {
        const sequence = (i + 1) as 1 | 2 | 3 | 4;
        return {
          id: `${sessionId}-q${sequence}`,
          sessionId,
          sequence,
          theme: interview.theme,
          topic: interview.topic,
          questionType: q.questionType,
          taskNumber: sequence,
          taskLabel: INTERVIEW_QUESTION_TYPE_LABEL[q.questionType],
          prompt: q.prompt,
          hints: q.hints,
          etsSource,
          ...TIMING,
        };
      }),
    };
  });
}

/** Four official Virtual Interview sessions (paired with official L&R sets). */
export const INTERVIEW_SESSIONS: InterviewSession[] = buildSessionsFromOfficial();

export const INTERVIEW_PROMPTS: InterviewPrompt[] = INTERVIEW_SESSIONS.flatMap(
  (s) => s.questions
);

export const DEFAULT_INTERVIEW_SESSION_ID = "iv-01";

export const INTERVIEW_TOPICS = Array.from(
  new Set(INTERVIEW_SESSIONS.map((s) => s.topic))
);

export function getInterviewSessionById(id: string): InterviewSession | undefined {
  return INTERVIEW_SESSIONS.find((s) => s.id === id);
}

export function getInterviewPromptById(id: string): InterviewPrompt | undefined {
  return INTERVIEW_PROMPTS.find((q) => q.id === id);
}

export function getInterviewSessionsByTopic(topic: string): InterviewSession[] {
  return INTERVIEW_SESSIONS.filter((s) => s.topic === topic);
}

export function getRandomInterviewSession(): InterviewSession {
  const index = Math.floor(Math.random() * INTERVIEW_SESSIONS.length);
  return INTERVIEW_SESSIONS[index]!;
}

export function getInterviewSessionForOfficialSet(
  officialSetId: string
): InterviewSession | undefined {
  return INTERVIEW_SESSIONS.find((s) => s.officialSetId === officialSetId);
}

export function getOfficialSetIdForSession(sessionId: string): string | undefined {
  return getInterviewSessionById(sessionId)?.officialSetId;
}
