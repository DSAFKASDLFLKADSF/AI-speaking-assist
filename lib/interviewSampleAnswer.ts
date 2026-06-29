import type { InterviewPrompt } from "@/lib/interviewPrompts";

/** Band-4 style example built from official hint bullets (shown during practice). */
export function buildInterviewSampleAnswer(question: InterviewPrompt): string {
  const primary = question.hints[0];
  const secondary = question.hints[1];
  if (!primary) {
    return "Give a clear main point in your first sentence, then add one specific example and a brief reason why it matters to you.";
  }

  const ex1 = primary.examples[0] ?? "a concrete detail from your life";
  const ex2 = secondary?.examples[0];

  let answer = `Personally, I think ${primary.claim.toLowerCase()}. `;
  answer += `For example, ${ex1} has helped me stay focused when things get busy. `;
  if (secondary && ex2) {
    answer += `I also try to ${secondary.claim.toLowerCase()}, such as ${ex2}. `;
  }
  answer += `Overall, this approach keeps my answer organized and easy to follow within 45 seconds.`;
  return answer;
}
