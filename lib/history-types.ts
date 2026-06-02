import type {
  PracticeSessionRecord,
  SessionStatus,
  ToeflTaskNumber,
} from "@/lib/session-types";

export interface PracticeHistoryAudio {
  id: string;
  transcript: string | null;
  durationSeconds: number;
  audioUrl: string | null;
  storagePath: string;
  createdAt: string;
}

export interface PracticeHistoryScore {
  id: string;
  scaledScore: number;
  deliveryScore: number;
  languageUseScore: number;
  topicDevelopmentScore: number;
  rawTotalScore: number | null;
  overallFeedback: string | null;
  aiModel: string;
  createdAt: string;
}

export interface PracticeHistoryItem {
  session: PracticeSessionRecord;
  audio: PracticeHistoryAudio | null;
  score: PracticeHistoryScore | null;
}

export interface PracticeHistoryQuery {
  limit?: number;
  offset?: number;
  status?: SessionStatus;
  taskNumber?: ToeflTaskNumber;
}

export interface PracticeHistoryResponse {
  items: PracticeHistoryItem[];
  total: number;
  limit: number;
  offset: number;
}

export interface HistoryApiError {
  error: string;
}
