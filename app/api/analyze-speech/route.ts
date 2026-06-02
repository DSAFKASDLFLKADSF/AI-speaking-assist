import { NextResponse } from "next/server";
import type { FeedbackSection } from "@/components/FeedbackCard";
import type { ListenRepeatScore } from "@/components/ScoreCard";
import type { AnalyzeSpeechRequest } from "@/lib/analyze-speech-types";
import {
  PythonSpeechApiError,
  callPythonAnalyzeSpeech,
} from "@/lib/pythonSpeechApi";
import { saveListenRepeatAnalysis } from "@/lib/saveListenRepeatAnalysis";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import {
  buildScoreSummary,
  buildWordComparison,
  computeListenRepeatScore,
} from "@/lib/wordDiff";

export const runtime = "nodejs";

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

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AnalyzeSpeechRequest;
    const { audioUrl, original, storagePath, promptId } = body;

    if (!audioUrl?.trim()) {
      return NextResponse.json(
        { error: "audioUrl is required." },
        { status: 400 }
      );
    }
    if (!original?.trim()) {
      return NextResponse.json(
        { error: "original (reference transcript) is required." },
        { status: 400 }
      );
    }
    if (!storagePath?.trim()) {
      return NextResponse.json(
        { error: "storagePath is required." },
        { status: 400 }
      );
    }

    // 1. Call Python analysis service
    const pythonResult = await callPythonAnalyzeSpeech({
      audio_url: audioUrl,
      reference_text: original,
      prompt_id: promptId,
      storage_path: storagePath,
    });

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

    // 2. Persist to Supabase when user is logged in
    let persisted = false;
    let sessionId: string | undefined;
    let audioResponseId: string | undefined;
    let scoreId: string | undefined;
    let persistError: string | undefined;

    try {
      const supabase = await createSupabaseServerClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const saved = await saveListenRepeatAnalysis(supabase, {
          userId: user.id,
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
      }
    } catch (err) {
      persistError =
        err instanceof Error ? err.message : "Failed to save analysis.";
    }

    // 3. Return unified response to the client
    return NextResponse.json({
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
    });
  } catch (err) {
    if (err instanceof PythonSpeechApiError) {
      return NextResponse.json(
        { error: err.message },
        { status: err.status >= 400 && err.status < 600 ? err.status : 502 }
      );
    }

    const message =
      err instanceof Error ? err.message : "Speech analysis failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
