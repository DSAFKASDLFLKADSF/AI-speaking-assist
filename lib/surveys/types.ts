export type SurveyType = "pre" | "post";

export type ResolutionLevel = "resolved" | "partial" | "unresolved";

/** Pre-survey (前测) answers */
export interface PreSurveyAnswers {
  grade?: string;
  gradeOther?: string;
  practiceMethods?: string[];
  weeklySpeakingHours?: string;
  lastSpeakingScore?: string;
  tutorProblems?: string[];
  tutorProblemsOther?: string;
  platformProblems?: string[];
  platformProblemsOther?: string;
  selfStudyProblems?: string[];
  selfStudyProblemsOther?: string;
  aiAppPriorities?: string[];
  aiAppPrioritiesOther?: string;
  willingnessToPay?: string;
  willingnessToPayCustom?: string;
  hopedChange?: string;
}

/** Post-survey (后测) answers */
export interface PostSurveyAnswers {
  completePracticeCount?: string;
  taskTypesUsed?: string[];
  usageProblems?: string[];
  usageProblemsOther?: string;
  tutorProblemResolution?: Record<string, ResolutionLevel | "na">;
  platformProblemResolution?: Record<string, ResolutionLevel | "na">;
  selfStudyProblemResolution?: Record<string, ResolutionLevel | "na">;
  continueUsing?: string;
  willingnessToPay?: string;
  willingnessToPayCustom?: string;
  topImprovement?: string;
}

export type SurveyAnswers = PreSurveyAnswers | PostSurveyAnswers;

export interface SurveyStatus {
  preCompleted: boolean;
  postCompleted: boolean;
  postPending: boolean;
  preMinimized: boolean;
}

export interface SurveyResponseRow {
  id: string;
  userId: string | null;
  clientId: string | null;
  surveyType: SurveyType;
  answers: SurveyAnswers;
  createdAt: string;
  userEmail?: string | null;
}
