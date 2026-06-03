import {
  OFFICIAL_SPEAKING_SETS,
  type OfficialSpeakingSet,
} from "@/lib/etsOfficialSpeaking";

export interface ListenRepeatPrompt {
  id: string;
  title: string;
  topic: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  audioSrc: string;
  transcript: string;
  /** Official ETS practice set id, e.g. ets-tr-01 */
  setId: string;
  /** Scene-setting directions from the official test */
  scenario: string;
  sentenceIndex: number;
  responseSeconds: number;
  etsSource: string;
}

function difficultyForIndex(index: number): ListenRepeatPrompt["difficulty"] {
  if (index <= 2) return "beginner";
  if (index <= 5) return "intermediate";
  return "advanced";
}

function flattenOfficialListenRepeat(
  sets: OfficialSpeakingSet[]
): ListenRepeatPrompt[] {
  const prompts: ListenRepeatPrompt[] = [];
  let globalIndex = 0;

  for (const set of sets) {
    const { listenRepeat, etsSource, id: setId } = set;
    listenRepeat.sentences.forEach((sentence, i) => {
      globalIndex += 1;
      const sentenceIndex = i + 1;
      const id = `lr-${String(globalIndex).padStart(2, "0")}`;
      prompts.push({
        id,
        title: set.title,
        topic: listenRepeat.topic,
        difficulty: difficultyForIndex(sentenceIndex),
        audioSrc: `/audio/listen-repeat/${id}.mp3`,
        transcript: sentence.text,
        setId,
        scenario: listenRepeat.scenario,
        sentenceIndex,
        responseSeconds: sentence.responseSeconds,
        etsSource,
      });
    });
  }

  return prompts;
}

/** All official Listen & Repeat items (4 sets × 7 sentences = 28). */
export const LISTEN_REPEAT_PROMPTS: ListenRepeatPrompt[] =
  flattenOfficialListenRepeat(OFFICIAL_SPEAKING_SETS);

export const DEFAULT_PROMPT_ID = "lr-01";

export function getPromptById(id: string): ListenRepeatPrompt | undefined {
  return LISTEN_REPEAT_PROMPTS.find((p) => p.id === id);
}

export function getPromptsBySetId(setId: string): ListenRepeatPrompt[] {
  return LISTEN_REPEAT_PROMPTS.filter((p) => p.setId === setId);
}

export function getPromptsByTopic(topic: string): ListenRepeatPrompt[] {
  return LISTEN_REPEAT_PROMPTS.filter((p) => p.topic === topic);
}

export function getPromptsByDifficulty(
  difficulty: ListenRepeatPrompt["difficulty"]
): ListenRepeatPrompt[] {
  return LISTEN_REPEAT_PROMPTS.filter((p) => p.difficulty === difficulty);
}

export const PROMPT_TOPICS = Array.from(
  new Set(LISTEN_REPEAT_PROMPTS.map((p) => p.topic))
);

export function getOfficialSetForPrompt(
  prompt: ListenRepeatPrompt
): OfficialSpeakingSet | undefined {
  return OFFICIAL_SPEAKING_SETS.find((s) => s.id === prompt.setId);
}
