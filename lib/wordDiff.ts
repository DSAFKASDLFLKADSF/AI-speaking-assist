import type { ComparisonWord } from "@/components/ComparisonText";
import type { ListenRepeatScore } from "@/components/ScoreCard";

function normalizeToken(token: string): string {
  const lowered = token.toLowerCase().replace(/'s\b/g, "");
  return lowered.replace(/[^\w]/g, "");
}

function tokenize(text: string): string[] {
  return text.trim().split(/\s+/).filter(Boolean);
}

export function buildWordComparison(
  original: string,
  user: string
): ComparisonWord[] {
  const originalTokens = tokenize(original);
  const userTokens = tokenize(user);
  const m = originalTokens.length;
  const n = userTokens.length;

  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (
        normalizeToken(originalTokens[i - 1]) ===
        normalizeToken(userTokens[j - 1])
      ) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const aligned: ComparisonWord[] = [];
  let i = m;
  let j = n;

  while (i > 0 || j > 0) {
    if (
      i > 0 &&
      j > 0 &&
      normalizeToken(originalTokens[i - 1]) ===
        normalizeToken(userTokens[j - 1])
    ) {
      aligned.push({
        status: "correct",
        original: originalTokens[i - 1],
        user: userTokens[j - 1],
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      if (i > 0 && dp[i - 1][j] === dp[i][j - 1]) {
        aligned.push({
          status: "replacement",
          original: originalTokens[i - 1],
          user: userTokens[j - 1],
        });
        i--;
        j--;
      } else {
        aligned.push({
          status: "replacement",
          original: null,
          user: userTokens[j - 1],
        });
        j--;
      }
    } else if (i > 0) {
      aligned.push({
        status: "missing",
        original: originalTokens[i - 1],
        user: null,
      });
      i--;
    }
  }

  return aligned.reverse();
}

export function computeListenRepeatScore(
  words: ComparisonWord[]
): ListenRepeatScore {
  const originalCount = words.filter((w) => w.original !== null).length;
  if (originalCount === 0) return 1;

  const correctCount = words.filter((w) => w.status === "correct").length;
  const ratio = correctCount / originalCount;
  const raw = Math.round(ratio * 5);

  if (raw <= 1) return 1;
  if (raw >= 5) return 5;
  return raw as ListenRepeatScore;
}

export function buildScoreSummary(words: ComparisonWord[]): string {
  const correct = words.filter((w) => w.status === "correct").length;
  const missing = words.filter((w) => w.status === "missing").length;
  const replacement = words.filter((w) => w.status === "replacement").length;

  if (missing === 0 && replacement === 0) {
    return "Excellent match with the model response.";
  }
  if (missing > replacement) {
    return `Good start. ${missing} word${missing === 1 ? "" : "s"} missing from the original.`;
  }
  return `${correct} words matched. Review ${replacement} substitution${replacement === 1 ? "" : "s"}.`;
}
