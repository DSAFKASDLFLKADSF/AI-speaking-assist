import type { SurveyStatus } from "@/lib/surveys/types";

const PREFIX = "toefl-survey-state:";

function key(viewerKey: string): string {
  return `${PREFIX}${viewerKey}`;
}

export interface SurveyLocalState extends SurveyStatus {
  preCompletedAt?: string;
  postCompletedAt?: string;
}

export function getViewerSurveyKey(
  userId: string | null,
  clientId?: string | null
): string {
  if (userId) return userId;
  if (clientId) return `client:${clientId}`;
  return "anonymous";
}

export function readSurveyLocalState(viewerKey: string): SurveyLocalState {
  if (typeof window === "undefined") {
    return {
      preCompleted: false,
      postCompleted: false,
      postPending: false,
      preMinimized: false,
    };
  }
  try {
    const raw = localStorage.getItem(key(viewerKey));
    if (!raw) {
      return {
        preCompleted: false,
        postCompleted: false,
        postPending: false,
        preMinimized: false,
      };
    }
    return JSON.parse(raw) as SurveyLocalState;
  } catch {
    return {
      preCompleted: false,
      postCompleted: false,
      postPending: false,
      preMinimized: false,
    };
  }
}

export function writeSurveyLocalState(
  viewerKey: string,
  patch: Partial<SurveyLocalState>
): SurveyLocalState {
  const next = { ...readSurveyLocalState(viewerKey), ...patch };
  if (typeof window !== "undefined") {
    localStorage.setItem(key(viewerKey), JSON.stringify(next));
  }
  return next;
}

export const SURVEY_PRACTICE_COMPLETE_EVENT = "toefl-survey-practice-complete";

export function markPracticeCompleteForSurvey(viewerKey: string): void {
  const state = readSurveyLocalState(viewerKey);
  if (state.postCompleted) return;
  writeSurveyLocalState(viewerKey, { postPending: true });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SURVEY_PRACTICE_COMPLETE_EVENT));
  }
}
