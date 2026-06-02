export type PracticeMode = "listen_repeat" | "interview" | "toefl_task";

export type ToeflTaskNumber = "1" | "2" | "3" | "4";

export type ToeflTaskType =
  | "independent"
  | "integrated_campus"
  | "integrated_academic"
  | "integrated_lecture";

export type SessionStatus =
  | "pending"
  | "preparing"
  | "recording"
  | "processing"
  | "completed"
  | "abandoned";

export interface CreatePracticeSessionRequest {
  /** Shorthand preset — maps to official TOEFL task timing when omitted. */
  mode?: PracticeMode;
  taskNumber?: ToeflTaskNumber;
  taskType?: ToeflTaskType;
  promptText: string;
  promptId?: string;
  readingPassage?: string;
  listeningTranscript?: string;
  audioPromptUrl?: string;
  prepTimeSeconds?: 15 | 20 | 30;
  responseTimeSeconds?: 45 | 60;
  status?: SessionStatus;
}

export interface PracticeSessionRecord {
  id: string;
  userId: string;
  taskNumber: ToeflTaskNumber;
  taskType: ToeflTaskType;
  promptText: string;
  promptId?: string;
  readingPassage: string | null;
  listeningTranscript: string | null;
  audioPromptUrl: string | null;
  prepTimeSeconds: number;
  responseTimeSeconds: number;
  status: SessionStatus;
  prepStartedAt: string | null;
  recordingStartedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePracticeSessionResponse {
  session: PracticeSessionRecord;
}

export interface SessionApiError {
  error: string;
}
