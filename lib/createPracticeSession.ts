import { queryOne } from "@/lib/db";
import { mapPracticeSessionRow } from "@/lib/practiceSessionMapper";
import type {
  CreatePracticeSessionRequest,
  PracticeSessionRecord,
  SessionStatus,
  ToeflTaskNumber,
  ToeflTaskType,
} from "@/lib/session-types";

interface ResolvedTaskConfig {
  taskNumber: ToeflTaskNumber;
  taskType: ToeflTaskType;
  prepTimeSeconds: 15 | 20 | 30;
  responseTimeSeconds: 45 | 60;
}

const TASK_CONFIG: Record<
  ToeflTaskNumber,
  {
    taskType: ToeflTaskType;
    prepTimeSeconds: 15 | 20 | 30;
    responseTimeSeconds: 45 | 60;
  }
> = {
  "1": {
    taskType: "independent",
    prepTimeSeconds: 15,
    responseTimeSeconds: 45,
  },
  "2": {
    taskType: "integrated_campus",
    prepTimeSeconds: 30,
    responseTimeSeconds: 60,
  },
  "3": {
    taskType: "integrated_academic",
    prepTimeSeconds: 30,
    responseTimeSeconds: 60,
  },
  "4": {
    taskType: "integrated_lecture",
    prepTimeSeconds: 20,
    responseTimeSeconds: 60,
  },
};

export class PracticeSessionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PracticeSessionValidationError";
  }
}

function resolveTaskConfig(
  input: CreatePracticeSessionRequest
): ResolvedTaskConfig {
  const mode = input.mode ?? "toefl_task";

  if (mode === "listen_repeat" || mode === "interview") {
    return { taskNumber: "1", ...TASK_CONFIG["1"] };
  }

  const taskNumber = input.taskNumber ?? "1";
  const preset = TASK_CONFIG[taskNumber];

  if (!preset) {
    throw new PracticeSessionValidationError("Invalid taskNumber.");
  }

  const taskType = input.taskType ?? preset.taskType;
  const prepTimeSeconds = input.prepTimeSeconds ?? preset.prepTimeSeconds;
  const responseTimeSeconds =
    input.responseTimeSeconds ?? preset.responseTimeSeconds;

  if (taskType !== preset.taskType) {
    throw new PracticeSessionValidationError(
      `taskType "${taskType}" does not match task ${taskNumber}.`
    );
  }

  if (
    prepTimeSeconds !== preset.prepTimeSeconds ||
    responseTimeSeconds !== preset.responseTimeSeconds
  ) {
    throw new PracticeSessionValidationError(
      `Timing for task ${taskNumber} must be ${preset.prepTimeSeconds}s prep / ${preset.responseTimeSeconds}s response.`
    );
  }

  return {
    taskNumber,
    taskType,
    prepTimeSeconds,
    responseTimeSeconds,
  };
}

export async function createPracticeSession(
  userId: string,
  input: CreatePracticeSessionRequest
): Promise<PracticeSessionRecord> {
  const promptText = input.promptText?.trim();
  if (!promptText) {
    throw new PracticeSessionValidationError("promptText is required.");
  }

  const task = resolveTaskConfig(input);
  const status: SessionStatus = input.status ?? "pending";

  const row = await queryOne<Record<string, unknown>>(
    `INSERT INTO practice_sessions (
      user_id, task_number, task_type, prompt_text,
      reading_passage, listening_transcript, audio_prompt_url,
      prep_time_seconds, response_time_seconds, status
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *`,
    [
      userId,
      task.taskNumber,
      task.taskType,
      promptText,
      input.readingPassage?.trim() || null,
      input.listeningTranscript?.trim() || null,
      input.audioPromptUrl?.trim() || null,
      task.prepTimeSeconds,
      task.responseTimeSeconds,
      status,
    ]
  );

  if (!row) {
    throw new Error("Failed to create practice session.");
  }

  const session = mapPracticeSessionRow(row);

  if (input.promptId) {
    return { ...session, promptId: input.promptId };
  }

  return session;
}
