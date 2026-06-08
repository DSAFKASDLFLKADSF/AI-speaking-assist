export interface InterviewHintBullet {
  /** One angle or mini-argument the student can take. */
  claim: string;
  /** Short example phrases to expand the claim. */
  examples: string[];
}

export function formatHintExamples(examples: string[]): string {
  return examples.filter(Boolean).join(", ");
}

export function hintWordCount(bullets: InterviewHintBullet[]): number {
  return bullets
    .flatMap((b) => [b.claim, ...b.examples])
    .join(" ")
    .split(/\s+/)
    .filter(Boolean).length;
}
