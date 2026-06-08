import type { ListenRepeatPrompt } from "@/lib/prompts";
import type { TestExamMode } from "@/lib/localHistory";

export type ExamStageLabel =
  | "Instruction"
  | "Listening"
  | "Preparation"
  | "Recording"
  | "Review"
  | "Analyzing"
  | "Completed";

export interface ExamProgressInfo {
  globalQuestion: number;
  globalTotal: number;
  sectionQuestion: number;
  sectionTotal: number;
  taskType: "Listen & Repeat" | "Virtual Interview";
  progressPercent: number;
}

const LR_COUNT = 7;
const IV_COUNT = 4;
const FULL_TOTAL = 11;

export function getListenRepeatRecordingSeconds(
  prompt: ListenRepeatPrompt
): number {
  // Official ETS response windows are calibrated to prompt length + buffer.
  return prompt.responseSeconds;
}

export function getExamProgress(
  mode: TestExamMode,
  lrIndex: number,
  ivIndex: number,
  inListenRepeat: boolean
): ExamProgressInfo {
  if (mode === "listen_repeat") {
    const sectionQuestion = lrIndex + 1;
    return {
      globalQuestion: sectionQuestion,
      globalTotal: LR_COUNT,
      sectionQuestion,
      sectionTotal: LR_COUNT,
      taskType: "Listen & Repeat",
      progressPercent: (sectionQuestion / LR_COUNT) * 100,
    };
  }

  if (mode === "interview") {
    const sectionQuestion = ivIndex + 1;
    return {
      globalQuestion: sectionQuestion,
      globalTotal: IV_COUNT,
      sectionQuestion,
      sectionTotal: IV_COUNT,
      taskType: "Virtual Interview",
      progressPercent: (sectionQuestion / IV_COUNT) * 100,
    };
  }

  if (inListenRepeat) {
    const globalQuestion = lrIndex + 1;
    return {
      globalQuestion,
      globalTotal: FULL_TOTAL,
      sectionQuestion: lrIndex + 1,
      sectionTotal: LR_COUNT,
      taskType: "Listen & Repeat",
      progressPercent: (globalQuestion / FULL_TOTAL) * 100,
    };
  }

  const globalQuestion = LR_COUNT + ivIndex + 1;
  return {
    globalQuestion,
    globalTotal: FULL_TOTAL,
    sectionQuestion: ivIndex + 1,
    sectionTotal: IV_COUNT,
    taskType: "Virtual Interview",
    progressPercent: (globalQuestion / FULL_TOTAL) * 100,
  };
}

export const PREP_TIME_OPTIONS = [0, 15, 30, 45] as const;
export type PrepTimeOption = (typeof PREP_TIME_OPTIONS)[number];

export function stageToLabel(stage: string): ExamStageLabel | null {
  if (stage === "ready" || stage.endsWith("instruction")) return "Instruction";
  if (stage.endsWith("_listen") || stage === "iv_intro") return "Listening";
  if (stage === "iv_preparing") return "Preparation";
  if (stage.endsWith("_recording")) return "Recording";
  if (stage.endsWith("_item_complete") || stage === "section_complete")
    return "Review";
  if (stage === "analyzing") return "Analyzing";
  if (stage === "results") return "Completed";
  return null;
}
