/** Per-question progress within a test set (Supabase-ready shape). */

export type QuestionStatus = "not_started" | "in_progress" | "completed";

export interface TestQuestionProgress {
  /** Global label: Q1–Q7 (L&R) or Q8–Q11 (Interview) */
  label: string;
  /** 1-based index within section */
  sequence: number;
  /** Reference to prompt in lib/prompts or lib/interviewPrompts */
  promptRefId: string;
  status: QuestionStatus;
  /** 1–5 when completed; null otherwise */
  score: number | null;
  completedAt: string | null;
}

export type TestSetCompletionStatus =
  | "not_started"
  | "in_progress"
  | "completed";

export interface TestSetScores {
  listenRepeatAverage: number | null;
  interviewAverage: number | null;
}

export interface TestSet {
  id: string;
  title: string;
  subtitle: string;
  userCount: number;
  lastAttemptAt: string | null;
  completionStatus: TestSetCompletionStatus;
  listenRepeatQuestions: TestQuestionProgress[];
  interviewQuestions: TestQuestionProgress[];
  scores: TestSetScores;
}

/** Future Supabase row mapping */
export interface TestSetUserProgressRow {
  id: string;
  user_id: string;
  test_set_id: string;
  question_label: string;
  prompt_ref_id: string;
  score: number | null;
  status: QuestionStatus;
  completed_at: string | null;
  updated_at: string;
}
