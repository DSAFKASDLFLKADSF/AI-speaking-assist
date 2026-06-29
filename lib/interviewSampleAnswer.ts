import type { InterviewQuestionType, InterviewPrompt } from "@/lib/interviewPrompts";
import type { InterviewHintBullet } from "@/lib/interviewHintContent";

function joinExamplePhrases(examples: string[], max = 3): string {
  const parts = examples.filter(Boolean).slice(0, max);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0]!;
  if (parts.length === 2) return `${parts[0]} and ${parts[1]}`;
  return `${parts.slice(0, -1).join(", ")}, and ${parts[parts.length - 1]}`;
}

function lowerClaim(claim: string): string {
  const trimmed = claim.replace(/\.$/, "").trim();
  return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
}

function isFirstPersonClaim(claim: string): boolean {
  return /^I[\s']/i.test(claim.trim());
}

/** Imperative hint → "I try to …"; already first-person → use as-is. */
function recallAction(bullet: InterviewHintBullet): string {
  const claim = bullet.claim.replace(/\.$/, "").trim();
  const examples = ex(bullet);
  if (isFirstPersonClaim(claim)) {
    return examples ? `${claim}, and I especially ${examples}.` : `${claim}.`;
  }
  const lc = lowerClaim(claim);
  return examples ? `I try to ${lc} — for example, I ${examples}.` : `I try to ${lc}.`;
}

/** Statement hint for preference/opinion/prediction. */
function statementClause(bullet: InterviewHintBullet, prefix = ""): string {
  const claim = bullet.claim.replace(/\.$/, "").trim();
  const examples = ex(bullet);
  const body = prefix
    ? `${prefix}${claim.charAt(0).toLowerCase() + claim.slice(1)}`
    : claim;
  return examples ? `${body}, such as ${examples}.` : `${body}.`;
}

function seedFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h;
}

function variantIndex(id: string, count: number): number {
  return seedFromId(id) % count;
}

function ex(bullet: InterviewHintBullet, max = 3): string {
  return joinExamplePhrases(bullet.examples, max);
}

type HintTriple = [InterviewHintBullet, InterviewHintBullet?, InterviewHintBullet?];

// --- personal_recall ---

function recallVariant0([h1, h2, h3]: HintTriple): string[] {
  const parts = [
    "Sure — a couple of habits have made a real difference for me.",
    recallAction(h1),
  ];
  if (h2) {
    parts.push(
      isFirstPersonClaim(h2.claim)
        ? `Another point is that ${lowerClaim(h2.claim)}${ex(h2) ? ` — ${ex(h2)}` : ""}.`
        : `Another thing is ${lowerClaim(h2.claim)}${ex(h2) ? ` — I ${ex(h2)} whenever I can` : ""}.`
    );
  }
  if (h3) {
    parts.push(
      ex(h3)
        ? `And if I'm overwhelmed, I ${ex(h3)} instead of pushing through alone.`
        : isFirstPersonClaim(h3.claim)
          ? `${h3.claim}.`
          : `And if I'm overwhelmed, I ${lowerClaim(h3.claim)}.`
    );
  }
  parts.push(
    "None of that is perfect, but together it keeps me from feeling like work takes over everything."
  );
  return parts;
}

function recallVariant1([h1, h2, h3]: HintTriple): string[] {
  const parts = [
    "When things get busy, I fall back on a few routines that actually stick.",
  ];
  if (h1) {
    parts.push(
      isFirstPersonClaim(h1.claim)
        ? `Mainly, ${lowerClaim(h1.claim)}${ex(h1) ? ` — ${ex(h1)}` : ""}.`
        : recallAction(h1).replace(/^I try to /, "Mainly, I ")
    );
  }
  if (h2) {
    parts.push(
      isFirstPersonClaim(h2.claim)
        ? `I also ${lowerClaim(h2.claim)}${ex(h2) ? `, whether that means ${ex(h2)}` : ""}.`
        : ex(h2)
          ? `I also focus on ${lowerClaim(h2.claim)}, whether that means ${ex(h2)}.`
          : `I also focus on ${lowerClaim(h2.claim)}.`
    );
  }
  if (h3) {
    parts.push(
      `On top of that, ${lowerClaim(h3.claim)}${ex(h3) ? `, such as ${ex(h3)}` : ""}.`
    );
  }
  parts.push("That balance helps me show up with more energy the next day.");
  return parts;
}

function recallVariant2([h1, h2, h3]: HintTriple): string[] {
  const parts = [
    "Honestly, the approach that's helped me most is simple but easy to skip.",
    isFirstPersonClaim(h1.claim) ? `${h1.claim}.` : `${h1.claim}.`,
  ];
  if (ex(h1)) parts.push(`Concretely, that looks like ${ex(h1)}.`);
  if (h2) {
    parts.push(
      isFirstPersonClaim(h2.claim)
        ? `${h2.claim}${ex(h2) ? ` — ${ex(h2)}` : ""}.`
        : ex(h2)
          ? `Beyond that, I ${lowerClaim(h2.claim)}; ${ex(h2)} are small choices, but they add up.`
          : `Beyond that, I ${lowerClaim(h2.claim)}.`
    );
  }
  if (h3) {
    parts.push(statementClause(h3, "When I need backup, "));
  }
  parts.push("It's not about doing everything perfectly — just protecting time that matters.");
  return parts;
}

function recallVariant3([h1, h2, h3]: HintTriple): string[] {
  const parts = ["I'd point to two strategies, and they work best together."];
  if (h2) {
    const fmt = (h: InterviewHintBullet) =>
      isFirstPersonClaim(h.claim)
        ? `${h.claim}${ex(h) ? ` — ${ex(h)}` : ""}`
        : `${lowerClaim(h.claim)}${ex(h) ? `, like ${ex(h)}` : ""}`;
    parts.push(`First, ${fmt(h1)}. Second, ${fmt(h2)}.`);
  } else {
    parts.push(recallAction(h1));
  }
  if (h3) {
    parts.push(
      `When pressure builds, ${lowerClaim(h3.claim)}${ex(h3) ? ` — ${ex(h3)}` : ""}.`
    );
  }
  parts.push("Those choices keep my weeks predictable enough that I can actually rest.");
  return parts;
}

const RECALL_BUILDERS = [recallVariant0, recallVariant1, recallVariant2, recallVariant3];

// --- preference ---

function preferenceVariant0([h1, h2, h3]: HintTriple): string[] {
  const parts = [
    "Yes, absolutely — that would affect whether I'd want to join a company.",
    statementClause(h1),
  ];
  if (h2) {
    parts.push(
      ex(h2)
        ? `I also weigh ${lowerClaim(h2.claim)} — ${ex(h2)} matter a lot.`
        : statementClause(h2)
    );
  }
  if (h3) {
    parts.push(
      `That said, ${lowerClaim(h3.claim)}${ex(h3) ? `, like ${ex(h3)}` : ""}, still shapes my choice.`
    );
  }
  parts.push("A generous policy means little if the team culture ignores it.");
  return parts;
}

function preferenceVariant1([h1, h2, h3]: HintTriple): string[] {
  const parts = [
    "It depends on the role, but generally yes — I'd pay attention to those programs.",
  ];
  if (h2 && h1) {
    parts.push(
      ex(h2) && ex(h1)
        ? `Flexibility is a big one for me: ${lowerClaim(h2.claim)}, including ${ex(h2)}. Benefits like ${ex(h1)} would pull me in too.`
        : `${h2.claim}. ${h1.claim}.`
    );
  } else if (h1) {
    parts.push(ex(h1) ? `${h1.claim} — ${ex(h1)}.` : `${h1.claim}.`);
  }
  if (h3) {
    parts.push(`Even so, ${lowerClaim(h3.claim)}${ex(h3) ? ` (${ex(h3)})` : ""} is something I'd ask about in interviews.`);
  }
  parts.push("I'd rather take a slightly lower offer at a humane workplace than burn out somewhere flashy.");
  return parts;
}

function preferenceVariant2([h1, h2, h3]: HintTriple): string[] {
  const parts = [
    "For me it's not just salary — how a company treats balance signals how it treats people.",
  ];
  if (h1) parts.push(statementClause(h1));
  if (h2) parts.push(statementClause(h2, "Equally, "));
  if (h3) {
    parts.push(
      ex(h3)
        ? `I'd also ask about ${lowerClaim(h3.claim)} — ${ex(h3)} tell you a lot.`
        : statementClause(h3, "I'd also ask about ")
    );
  }
  parts.push("If those boxes are checked, I'm much more likely to say yes.");
  return parts;
}

function preferenceVariant3([h1, h2, h3]: HintTriple): string[] {
  const parts = [
    "Short answer: yes. Longer answer — I'd compare offers side by side.",
  ];
  if (h1) parts.push(ex(h1) ? `Perks such as ${ex(h1)} would stand out immediately.` : `${h1.claim}.`);
  if (h2) parts.push(ex(h2) ? `But I'd also look at ${lowerClaim(h2.claim)} — ${ex(h2)}.` : h2 ? `${h2.claim}.` : "");
  if (h3) parts.push(`Culture-wise, ${lowerClaim(h3!.claim)}${ex(h3!) ? `, e.g. ${ex(h3!)}` : ""}.`);
  parts.push("The best package on paper still loses to a manager who texts you at midnight.");
  return parts.filter(Boolean);
}

const PREFERENCE_BUILDERS = [
  preferenceVariant0,
  preferenceVariant1,
  preferenceVariant2,
  preferenceVariant3,
];

// --- opinion ---

function opinionVariant0([h1, h2, h3]: HintTriple): string[] {
  const parts = [
    "Overall I think it's a smart move, with a few guardrails.",
  ];
  if (h1) parts.push(ex(h1) ? `${h1.claim} — ${ex(h1)} can help people focus.` : `${h1.claim}.`);
  if (h2) parts.push(ex(h2) ? `The risk is ${lowerClaim(h2.claim)}: ${ex(h2)}.` : `${h2.claim}.`);
  if (h3) parts.push(ex(h3) ? `So ${lowerClaim(h3.claim)}, like ${ex(h3)}, seems necessary.` : `${h3.claim}.`);
  parts.push("Done well, flexibility raises output; done poorly, it erodes trust.");
  return parts;
}

function opinionVariant1([h1, h2, h3]: HintTriple): string[] {
  const parts = ["I'm mostly in favor, though not blindly."];
  if (h1) parts.push(statementClause(h1, "On one hand, "));
  if (h2) {
    parts.push(
      ex(h2)
        ? `Still, ${lowerClaim(h2.claim)} is a real concern — ${ex(h2)} can hurt collaboration.`
        : statementClause(h2, "Still, ")
    );
  }
  if (h3) {
    parts.push(
      ex(h3)
        ? `That's why ${lowerClaim(h3.claim)}, including ${ex(h3)}, matters.`
        : statementClause(h3, "That's why ")
    );
  }
  parts.push("Hybrid models with accountability beat either extreme.");
  return parts;
}

function opinionVariant2([h1, h2, h3]: HintTriple): string[] {
  const parts = [
    "It can work, but companies have to mean it — not just offer it on a careers page.",
  ];
  if (h1) {
    parts.push(
      ex(h1)
        ? `${h1.claim}: employees often benefit from ${ex(h1)}.`
        : `${h1.claim}.`
    );
  }
  if (h2) {
    parts.push(
      ex(h2)
        ? `The downside is ${lowerClaim(h2.claim)} — things like ${ex(h2)} can slip through the cracks.`
        : `${h2.claim}.`
    );
  }
  if (h3) {
    parts.push(
      ex(h3)
        ? `Leaders can offset that with ${lowerClaim(h3.claim)}, including ${ex(h3)}.`
        : `${h3.claim}.`
    );
  }
  parts.push("Trust and measurable goals matter more than where someone sits.");
  return parts;
}

function opinionVariant3([h1, h2, h3]: HintTriple): string[] {
  const parts = [
    "I'd say yes, it's a good strategy, because the old one-size-fits-all schedule is fading.",
  ];
  if (h3) parts.push(ex(h3) ? `${h3.claim}: ${ex(h3)}.` : `${h3.claim}.`);
  if (h1) parts.push(ex(h1) ? `Workers gain when they ${ex(h1)}.` : `${h1.claim}.`);
  if (h2) parts.push(`Managers should watch for ${lowerClaim(h2!.claim)}${ex(h2!) ? ` — ${ex(h2!)}` : ""}.`);
  parts.push("The companies that adapt early will probably retain talent longer.");
  return parts;
}

const OPINION_BUILDERS = [opinionVariant0, opinionVariant1, opinionVariant2, opinionVariant3];

// --- policy_prediction ---

function predictionVariant0([h1, h2, h3]: HintTriple): string[] {
  const parts = [
    "I don't think everyone will choose the same path, but the center of gravity is shifting.",
  ];
  if (h1) parts.push(ex(h1) ? `${h1.claim}, partly because of ${ex(h1)}.` : `${h1.claim}.`);
  if (h2) parts.push(ex(h2) ? `At the same time, ${lowerClaim(h2.claim)} — ${ex(h2)}.` : `${h2.claim}.`);
  if (h3) parts.push(ex(h3) ? `So ${lowerClaim(h3.claim)} will still matter, especially ${ex(h3)}.` : `${h3.claim}.`);
  parts.push("Future workers will probably negotiate balance instead of accepting burnout as normal.");
  return parts;
}

function predictionVariant1([h1, h2, h3]: HintTriple): string[] {
  const parts = [
    "My guess is attitudes will keep changing, especially among younger employees.",
  ];
  if (h1) {
    parts.push(
      ex(h1)
        ? `We're already seeing ${ex(h1)}, which connects to ${lowerClaim(h1.claim)}.`
        : `${h1.claim}.`
    );
  }
  if (h2) {
    parts.push(
      ex(h2)
        ? `Yet ${lowerClaim(h2.claim)} won't vanish — ${ex(h2)} still shape daily life.`
        : `${h2.claim}.`
    );
  }
  if (h3) {
    parts.push(
      ex(h3)
        ? `How people ${ex(h3)} will also affect ${lowerClaim(h3.claim)}.`
        : `${h3.claim}.`
    );
  }
  parts.push(
    "So it'll be a mix: more respect for personal life, but work still central for many."
  );
  return parts;
}

function predictionVariant2([h1, h2, h3]: HintTriple): string[] {
  const parts = [
    "Looking five or ten years out, I'd bet on more balance, not less.",
  ];
  if (h2) parts.push(ex(h2) ? `Even when ${ex(h2)}, people push back against ${lowerClaim(h2.claim)}.` : `${h2.claim}.`);
  if (h1) parts.push(ex(h1) ? `${h1.claim}, driven by things like ${ex(h1)}.` : `${h1.claim}.`);
  if (h3) parts.push(`${h3!.claim}${ex(h3!) ? ` — ${ex(h3!)}` : ""}.`);
  parts.push("Norms change slowly, but the direction feels clear to me.");
  return parts;
}

function predictionVariant3([h1, h2, h3]: HintTriple): string[] {
  const parts = [
    "Hard to predict one universal attitude, but a few forces stand out.",
  ];
  if (h1) parts.push(statementClause(h1));
  if (h2) {
    parts.push(
      ex(h2)
        ? `Meanwhile, ${lowerClaim(h2.claim)}: ${ex(h2)}.`
        : statementClause(h2, "Meanwhile, ")
    );
  }
  if (h3) {
    parts.push(
      ex(h3)
        ? `At the same time, ${lowerClaim(h3.claim)} — ${ex(h3)} — still influences decisions.`
        : statementClause(h3, "At the same time, ")
    );
  }
  parts.push(
    "People will keep juggling both, but the balance point is moving toward personal life."
  );
  return parts;
}

const PREDICTION_BUILDERS = [
  predictionVariant0,
  predictionVariant1,
  predictionVariant2,
  predictionVariant3,
];

const BUILDERS: Record<
  InterviewQuestionType,
  ((hints: HintTriple) => string[])[]
> = {
  personal_recall: RECALL_BUILDERS,
  preference: PREFERENCE_BUILDERS,
  opinion: OPINION_BUILDERS,
  policy_prediction: PREDICTION_BUILDERS,
};

/** Band-4 style example (~100–130 words); structure varies by question id. */
export function buildInterviewSampleAnswer(question: InterviewPrompt): string {
  const hints = question.hints;
  if (hints.length === 0) {
    return "Open with a clear main point, support it with one or two specific examples from your own experience, and explain briefly why that matters to you.";
  }

  const triple: HintTriple = [hints[0]!, hints[1], hints[2]];
  const builders = BUILDERS[question.questionType];
  const idx = variantIndex(question.id, builders.length);
  return builders[idx]!(triple).join(" ");
}
