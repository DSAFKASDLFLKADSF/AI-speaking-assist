export type {
  ListenRepeatPrompt as ToeflPrompt,
} from "@/lib/prompts";
export {
  DEFAULT_PROMPT_ID,
  LISTEN_REPEAT_PROMPTS as TOEFL_PROMPTS,
  getPromptById,
  getPromptsByDifficulty,
  getPromptsByTopic,
  PROMPT_TOPICS,
} from "@/lib/prompts";

// Legacy aliases for integrated-task fields (Listen & Repeat uses topic as taskLabel)
export type ToeflTaskNumber = "1" | "2" | "3" | "4";
