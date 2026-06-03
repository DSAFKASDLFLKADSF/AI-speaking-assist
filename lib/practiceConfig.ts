import { OFFICIAL_SPEAKING_SETS } from "@/lib/etsOfficialSpeaking";
import { getPromptsBySetId } from "@/lib/prompts";
import { MOCK_EXAM_LISTEN_REPEAT_COUNT } from "@/lib/mockExamConfig";

/** Prompts per Listen & Repeat section practice (official set = 7 items). */
export const LISTEN_REPEAT_SECTION_COUNT = MOCK_EXAM_LISTEN_REPEAT_COUNT;

/** First official ETS set (university orientation). */
export function getListenRepeatSectionPrompts() {
  return getPromptsBySetId(OFFICIAL_SPEAKING_SETS[0]!.id);
}

export type PracticeFormat = "section" | "single";

export const PRACTICE_FORMAT_LABEL: Record<PracticeFormat, string> = {
  section: "Section mock (all items)",
  single: "Single-item drill",
};
