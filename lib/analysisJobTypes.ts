export type AnalysisJobStatus = "pending" | "running" | "done" | "failed";

export interface AnalysisJobCreatedResponse {
  jobId: string;
  status: "pending";
}

export interface AnalysisJobPollResponse<T = unknown> {
  jobId: string;
  status: AnalysisJobStatus;
  error?: string;
  result?: T;
}
