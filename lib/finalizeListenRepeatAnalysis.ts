import type { FeedbackSection } from "@/components/FeedbackCard";
import type { ListenRepeatScore } from "@/components/ScoreCard";
import type { AnalyzeSpeechRequest, AnalyzeSpeechResponse } from "@/lib/analyze-speech-types";
import type { PythonAnalyzeSpeechResponse } from "@/lib/pythonSpeechApi";
import { saveListenRepeatAnalysis } from "@/lib/saveListenRepeatAnalysis";
import { isDatabaseConfigured } from "@/lib/db";
import {
  buildScoreSummary,
  buildWordComparison,
  computeListenRepeatScore,
} from "@/lib/wordDiff";

function clampListenRepeatScore(value: number): ListenRepeatScore {
  const rounded = Math.round(value);
  if (rounded <= 1) return 1;
  if (rounded >= 5) return 5;
  return rounded as ListenRepeatScore;
}

function buildFallbackFeedback(
  words: ReturnType<typeof buildWordComparison>
): { summary: string; sections: FeedbackSection[] } {
  const missingWords = words
    .filter((w) => w.status === "missing")
    .map((w) => w.original)
    .filter(Boolean)
    .slice(0, 8);

  const replacementWords = words
    .filter((w) => w.status === "replacement" && w.original && w.user)
    .slice(0, 5)
    .map((w) => `"${w.original}" → "${w.user}"`);

  return {
    summary: buildScoreSummary(words),
    sections: [
      {
        title: "Pronunciation",
        content:
          missingWords.length === 0
            ? "Your pronunciation aligned well with the model on key content words."
            : "Focus on clear articulation of content words, especially in the second half of the response.",
      },
      {
        title: "Fluency",
        content:
          replacementWords.length === 0
            ? "You maintained a steady flow similar to the model response."
            : "Keep a consistent pace and avoid substituting words when shadowing the model.",
      },
      {
        title: "Suggestions",
        content:
          missingWords.length > 0
            ? `Practice these missed words/phrases: ${missingWords.join(", ")}.`
            : replacementWords.length > 0
              ? `Review these substitutions: ${replacementWords.join("; ")}.`
              : "Repeat the exercise once more to reinforce rhythm and intonation.",
      },
    ],
  };
}

export async function finalizeListenRepeatAnalysis(
  body: AnalyzeSpeechRequest,
  pythonResult: PythonAnalyzeSpeechResponse,
  userId?: string | null
): Promise<AnalyzeSpeechResponse> {
  const { audioUrl, original, storagePath, promptId } = body;

  const transcript = pythonResult.transcript.trim();
  const words =
    pythonResult.words && pythonResult.words.length > 0
      ? pythonResult.words
      : buildWordComparison(original, transcript);

  const ruleScore = computeListenRepeatScore(words);
  const glmScore =
    pythonResult.score !== undefined
      ? clampListenRepeatScore(pythonResult.score)
      : ruleScore;
  const score = clampListenRepeatScore(Math.min(glmScore, ruleScore));

  const scoreSummary =
    pythonResult.score_summary?.trim() || buildScoreSummary(words);

  const feedback =
    pythonResult.feedback?.sections && pythonResult.feedback.summary
      ? pythonResult.feedback
      : buildFallbackFeedback(words);

  const durationSeconds = pythonResult.duration_seconds ?? 1;

  let persisted = false;
  let sessionId: string | undefined;
  let audioResponseId: string | undefined;
  let scoreId: string | undefined;
  let persistError: string | undefined;

  if (userId && isDatabaseConfigured()) {
    try {
      const saved = await saveListenRepeatAnalysis({
        userId,
        audioUrl,
        storagePath,
        original,
        promptId,
        transcript,
        score,
        scoreSummary,
        feedback,
        durationSeconds,
        mimeType: pythonResult.mime_type,
        fileSizeBytes: pythonResult.file_size_bytes,
        aiModel: pythonResult.model ?? "python-api",
        deliveryScore: pythonResult.delivery_score,
        languageUseScore: pythonResult.language_use_score,
        topicDevelopmentScore: pythonResult.topic_development_score,
      });

      persisted = true;
      sessionId = saved.sessionId;
      audioResponseId = saved.audioResponseId;
      scoreId = saved.scoreId;
    } catch (err) {
      persistError =
        err instanceof Error ? err.message : "Failed to save analysis.";
    }
  }

  return {
    transcript,
    score,
    scoreSummary,
    words,
    feedback,
    storagePath,
    persisted,
    sessionId,
    audioResponseId,
    scoreId,
    ...(persistError ? { persistError } : {}),
  };
}
