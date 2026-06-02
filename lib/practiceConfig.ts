import { LISTEN_REPEAT_PROMPTS } from "@/lib/prompts";
import { MOCK_EXAM_LISTEN_REPEAT_COUNT } from "@/lib/mockExamConfig";

/** Prompts per Listen & Repeat section practice (matches full mock section size). */
export const LISTEN_REPEAT_SECTION_COUNT = MOCK_EXAM_LISTEN_REPEAT_COUNT;

export function getListenRepeatSectionPrompts() {
  return LISTEN_REPEAT_PROMPTS.slice(0, LISTEN_REPEAT_SECTION_COUNT);
}

export type PracticeFormat = "section" | "single";

export const PRACTICE_FORMAT_LABEL: Record<PracticeFormat, string> = {
  section: "Section mock (all items)",
  single: "Single-item drill",
};
