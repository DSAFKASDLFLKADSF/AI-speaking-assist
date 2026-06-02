"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExamVisualPanel } from "@/components/ExamVisualPanel";
import { FeedbackCard } from "@/components/FeedbackCard";
import { InterviewQuestionPanel } from "@/components/InterviewQuestionPanel";
import { InterviewScoreCard } from "@/components/InterviewScoreCard";
import { ListenRepeatVisualPanel } from "@/components/ListenRepeatVisualPanel";
import { PromptAudioPlayer } from "@/components/PromptAudioPlayer";
import {
  RecordButton,
  type RecordingResult,
  type RecordingStatus,
} from "@/components/RecordButton";
import { ScoreCard } from "@/components/ScoreCard";
import { Timer } from "@/components/Timer";
import { Waveform } from "@/components/Waveform";
import { analyzeInterview } from "@/lib/analyzeInterview";
import { analyzeSpeech } from "@/lib/analyzeSpeech";
import type { AnalyzeInterviewResponse } from "@/lib/analyze-interview-types";
import type { AnalyzeSpeechResponse } from "@/lib/analyze-speech-types";
import {
  interviewScoresAverage,
  saveMockExamLocalHistory,
  type LocalInterviewDetail,
  type LocalListenRepeatDetail,
  type LocalMockExamDetail,
} from "@/lib/localHistory";
import {
  buildMockExamPlan,
  MOCK_EXAM_OVERVIEW,
  MOCK_EXAM_RESPONSE_SECONDS,
  type MockExamPlan,
} from "@/lib/mockExamConfig";
import { uploadAudioWithMeta } from "@/lib/uploadAudio";

type ExamStage =
  | "ready"
  | "lr_listen"
  | "lr_recording"
  | "section_break"
  | "iv_intro"
  | "iv_question_listen"
  | "iv_recording"
  | "analyzing"
  | "results";

interface PendingRecording {
  kind: "listen_repeat" | "interview";
  promptId?: string;
  questionId?: string;
  promptText: string;
  original?: string;
  title: string;
  responseSeconds: number;
  audioUrl: string;
  storagePath: string;
  durationMs: number;
}

interface MockExamResults {
  listenRepeat: Array<{
    pending: PendingRecording;
    analysis: AnalyzeSpeechResponse;
  }>;
  interview: Array<{
    pending: PendingRecording;
    analysis: AnalyzeInterviewResponse;
  }>;
  summary: LocalMockExamDetail;
}

export default function MockExamPage() {
  const [plan, setPlan] = useState<MockExamPlan>(() => buildMockExamPlan());
  const [stage, setStage] = useState<ExamStage>("ready");
  const [lrIndex, setLrIndex] = useState(0);
  const [ivIndex, setIvIndex] = useState(0);
  const [recordings, setRecordings] = useState<PendingRecording[]>([]);
  const [results, setResults] = useState<MockExamResults | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [responseTimeLeft, setResponseTimeLeft] = useState(
    MOCK_EXAM_RESPONSE_SECONDS
  );
  const [startSignal, setStartSignal] = useState(0);
  const [stopSignal, setStopSignal] = useState(0);
  const [analyzeProgress, setAnalyzeProgress] = useState({ done: 0, total: 0 });
  const [questionAudioKey, setQuestionAudioKey] = useState(0);

  const responseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localBlobUrlRef = useRef<string | null>(null);
  const processingRef = useRef(false);

  const currentLrPrompt = plan.listenRepeat[lrIndex];
  const currentIvQuestion = plan.interviewSession.questions[ivIndex];
  const isRecording = recordingStatus === "recording";
  const activeResponseSeconds =
    stage === "iv_recording" && currentIvQuestion
      ? currentIvQuestion.responseSeconds
      : MOCK_EXAM_RESPONSE_SECONDS;

  const clearResponseTimer = useCallback(() => {
    if (responseTimerRef.current) {
      clearInterval(responseTimerRef.current);
      responseTimerRef.current = null;
    }
  }, []);

  const revokeLocalBlobUrl = useCallback(() => {
    if (localBlobUrlRef.current) {
      URL.revokeObjectURL(localBlobUrlRef.current);
      localBlobUrlRef.current = null;
    }
  }, []);

  const resetExam = useCallback(() => {
    clearResponseTimer();
    revokeLocalBlobUrl();
    setPlan(buildMockExamPlan());
    setStage("ready");
    setLrIndex(0);
    setIvIndex(0);
    setRecordings([]);
    setResults(null);
    setErrorMessage(null);
    setAudioUrl(null);
    setResponseTimeLeft(MOCK_EXAM_RESPONSE_SECONDS);
    processingRef.current = false;
  }, [clearResponseTimer, revokeLocalBlobUrl]);

  const beginRecording = useCallback(() => {
    setResponseTimeLeft(activeResponseSeconds);
    setStartSignal((n) => n + 1);
  }, [activeResponseSeconds]);

  useEffect(() => {
    if (stage !== "lr_recording" && stage !== "iv_recording") {
      clearResponseTimer();
      return;
    }

    setResponseTimeLeft(activeResponseSeconds);

    responseTimerRef.current = setInterval(() => {
      setResponseTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(responseTimerRef.current!);
          responseTimerRef.current = null;
          setStopSignal((n) => n + 1);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return clearResponseTimer;
  }, [stage, lrIndex, ivIndex, activeResponseSeconds, clearResponseTimer]);

  useEffect(() => () => clearResponseTimer(), [clearResponseTimer]);

  const runBatchAnalysis = useCallback(
    async (pending: PendingRecording[]) => {
      setStage("analyzing");
      setAnalyzeProgress({ done: 0, total: pending.length });

      const lrResults: MockExamResults["listenRepeat"] = [];
      const ivResults: MockExamResults["interview"] = [];

      try {
        for (let i = 0; i < pending.length; i += 1) {
          const item = pending[i]!;
          if (item.kind === "listen_repeat") {
            const analysis = await analyzeSpeech({
              audioUrl: item.audioUrl,
              storagePath: item.storagePath,
              original: item.original ?? item.promptText,
              promptId: item.promptId,
            });
            lrResults.push({ pending: item, analysis });
          } else {
            const analysis = await analyzeInterview({
              audioUrl: item.audioUrl,
              storagePath: item.storagePath,
              prompt: item.promptText,
              questionId: item.questionId,
              responseSeconds: item.responseSeconds,
              durationMs: item.durationMs,
            });
            ivResults.push({ pending: item, analysis });
          }
          setAnalyzeProgress({ done: i + 1, total: pending.length });
        }

        const listenRepeatDetails: LocalListenRepeatDetail[] = lrResults.map(
          ({ pending: p, analysis }) => ({
            promptId: p.promptId ?? "",
            title: p.title,
            score: analysis.score,
            scoreSummary: analysis.scoreSummary,
            feedbackSummary: analysis.feedback.summary,
          })
        );

        const interviewDetails: LocalInterviewDetail[] = ivResults.map(
          ({ pending: p, analysis }) => ({
            questionId: p.questionId ?? "",
            sessionTheme: plan.interviewSession.theme,
            promptPreview: p.promptText.slice(0, 120),
            scores: analysis.scores,
            scoreSummary: analysis.scoreSummary,
            feedbackSummary: analysis.feedback.summary,
          })
        );

        const listenRepeatAvg =
          listenRepeatDetails.length > 0
            ? listenRepeatDetails.reduce((s, d) => s + d.score, 0) /
              listenRepeatDetails.length
            : 0;

        const interviewAvg =
          interviewDetails.length > 0
            ? interviewDetails.reduce(
                (s, d) => s + interviewScoresAverage(d.scores),
                0
              ) / interviewDetails.length
            : 0;

        const overallScore = (listenRepeatAvg + interviewAvg) / 2;

        const summary: LocalMockExamDetail = {
          sessionId: plan.interviewSession.id,
          sessionTheme: plan.interviewSession.theme,
          listenRepeat: listenRepeatDetails,
          interview: interviewDetails,
          listenRepeatAvg: Math.round(listenRepeatAvg * 10) / 10,
          interviewAvg: Math.round(interviewAvg * 10) / 10,
          overallScore: Math.round(overallScore * 10) / 10,
        };

        saveMockExamLocalHistory(summary);
        setResults({ listenRepeat: lrResults, interview: ivResults, summary });
        setStage("results");
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Mock exam analysis failed."
        );
        setStage("results");
      }
    },
    [plan.interviewSession]
  );

  const handleRecordingComplete = useCallback(
    async (result: RecordingResult) => {
      if (processingRef.current) return;
      processingRef.current = true;
      clearResponseTimer();
      revokeLocalBlobUrl();
      localBlobUrlRef.current = result.url;
      setAudioUrl(result.url);

      try {
        const { audioUrl: storedUrl, storagePath } = await uploadAudioWithMeta(
          result.blob,
          {
            allowAnonymous: true,
            fileName: `mock-${Date.now()}.webm`,
          }
        );

        setAudioUrl(storedUrl);
        revokeLocalBlobUrl();

        let pending: PendingRecording;

        if (stage === "lr_recording" && currentLrPrompt) {
          pending = {
            kind: "listen_repeat",
            promptId: currentLrPrompt.id,
            promptText: currentLrPrompt.transcript,
            original: currentLrPrompt.transcript,
            title: currentLrPrompt.title,
            responseSeconds: MOCK_EXAM_RESPONSE_SECONDS,
            audioUrl: storedUrl,
            storagePath,
            durationMs: result.durationMs,
          };

          const nextRecordings = [...recordings, pending];
          setRecordings(nextRecordings);

          if (lrIndex >= plan.listenRepeat.length - 1) {
            setStage("section_break");
          } else {
            setLrIndex((i) => i + 1);
            setStage("lr_listen");
          }
        } else if (stage === "iv_recording" && currentIvQuestion) {
          pending = {
            kind: "interview",
            questionId: currentIvQuestion.id,
            promptText: currentIvQuestion.prompt,
            title: currentIvQuestion.taskLabel,
            responseSeconds: currentIvQuestion.responseSeconds,
            audioUrl: storedUrl,
            storagePath,
            durationMs: result.durationMs,
          };

          const nextRecordings = [...recordings, pending];
          setRecordings(nextRecordings);

          if (ivIndex >= plan.interviewSession.questions.length - 1) {
            await runBatchAnalysis(nextRecordings);
          } else {
            setIvIndex((i) => i + 1);
            setQuestionAudioKey((k) => k + 1);
            setStage("iv_question_listen");
          }
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Upload failed."
        );
      } finally {
        processingRef.current = false;
      }
    },
    [
      stage,
      currentLrPrompt,
      currentIvQuestion,
      recordings,
      lrIndex,
      ivIndex,
      plan,
      clearResponseTimer,
      revokeLocalBlobUrl,
      runBatchAnalysis,
      beginRecording,
    ]
  );

  const startExam = () => {
    setStage("lr_listen");
    setLrIndex(0);
    setIvIndex(0);
    setRecordings([]);
    setResults(null);
    setErrorMessage(null);
  };

  const startInterviewSection = () => {
    setIvIndex(0);
    setQuestionAudioKey(0);
    setStage("iv_intro");
  };

  const startIvQuestionListen = () => {
    setQuestionAudioKey((k) => k + 1);
    setStage("iv_question_listen");
  };

  const progressLabel =
    stage === "ready"
      ? "Not started"
      : stage === "results"
        ? "Complete"
        : stage === "analyzing"
          ? `Analyzing ${analyzeProgress.done}/${analyzeProgress.total}`
          : stage.startsWith("lr")
            ? `Listen & Repeat ${lrIndex + 1}/${plan.listenRepeat.length}`
            : stage === "section_break"
              ? "Section break"
              : stage.startsWith("iv")
                ? `Interview ${ivIndex + 1}/${plan.interviewSession.questions.length}`
                : "";

  const stageLabel: Record<ExamStage, string> = {
    ready: "Ready to begin",
    lr_listen: "Listen to the prompt",
    lr_recording: "Record your response",
    section_break: "Section 2 — Take an Interview",
    iv_intro: "Researcher introduction",
    iv_question_listen: "Listen to the question",
    iv_recording: "Interview response time",
    analyzing: "Scoring your mock exam…",
    results: "Mock exam complete",
  };

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6 md:pt-24 lg:px-8 lg:pt-28">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Full Mock Exam
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
            TOEFL Speaking Mock Test
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {MOCK_EXAM_OVERVIEW.listenRepeatCount} Listen & Repeat +{" "}
            {MOCK_EXAM_OVERVIEW.interviewCount} Interview questions ·{" "}
            {MOCK_EXAM_OVERVIEW.responseSeconds}s response each · ~{" "}
            {MOCK_EXAM_OVERVIEW.estimatedMinutes} min
          </p>
          <p className="mt-1 text-xs text-slate-500">{progressLabel}</p>
        </header>

        <div className="space-y-6">
          {stage === "ready" && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-medium text-slate-900">
                Exam structure
              </h2>
              <ul className="mt-4 space-y-2 text-sm text-slate-600">
                <li>
                  Section 1: {MOCK_EXAM_OVERVIEW.listenRepeatCount} Listen &
                  Repeat prompts (listen once, then record)
                </li>
                <li>
                  Section 2: Interview on &ldquo;{plan.interviewSession.theme}
                  &rdquo; — {MOCK_EXAM_OVERVIEW.interviewCount} questions
                </li>
                <li>
                  No hints or scores until the end — simulates test conditions
                </li>
              </ul>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={startExam}
                  className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Start Mock Exam
                </button>
                <button
                  type="button"
                  onClick={() => setPlan(buildMockExamPlan())}
                  className="rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  Shuffle prompts
                </button>
              </div>
            </section>
          )}

          {(stage === "lr_listen" || stage === "lr_recording") &&
            currentLrPrompt && (
              <>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Section 1 · Prompt {lrIndex + 1} of {plan.listenRepeat.length}
                </p>
                <ListenRepeatVisualPanel
                  prompt={currentLrPrompt}
                  examMode
                  showTranscript={false}
                />
                {stage === "lr_listen" && (
                  <button
                    type="button"
                    onClick={() => {
                      setStage("lr_recording");
                      beginRecording();
                    }}
                    className="w-full rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    Ready to record
                  </button>
                )}

                {stage === "lr_recording" && (
                  <Timer
                    value={responseTimeLeft}
                    totalSeconds={activeResponseSeconds}
                    mode="response"
                    label={stageLabel.lr_recording}
                    sublabel="Response remaining"
                    warningThreshold={10}
                  />
                )}
              </>
            )}

          {stage === "section_break" && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-medium text-slate-900">
                Section 1 complete
              </h2>
              <p className="mt-2 text-sm text-slate-600">
                Next: Take an Interview — {plan.interviewSession.theme}.{" "}
                {plan.interviewSession.intro}
              </p>
              <button
                type="button"
                onClick={startInterviewSection}
                className="mt-6 rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800"
              >
                Begin Interview Section
              </button>
            </section>
          )}

          {stage === "iv_intro" && (
            <section className="space-y-4">
              <ExamVisualPanel variant="examiner" />
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <PromptAudioPlayer
                  text={plan.interviewSession.intro}
                  label="Play introduction"
                  autoPlay
                  onEnded={startIvQuestionListen}
                />
              </div>
            </section>
          )}

          {stage === "iv_question_listen" && currentIvQuestion && (
            <>
              <InterviewQuestionPanel
                key={`${currentIvQuestion.id}-${questionAudioKey}`}
                question={currentIvQuestion}
                session={plan.interviewSession}
                examMode
                showQuestionText={false}
                showExaminerImage
                autoPlayQuestion
                onQuestionAudioEnded={() => {
                  setStage("iv_recording");
                  beginRecording();
                }}
              />
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => {
                    setStage("iv_recording");
                    beginRecording();
                  }}
                  className="rounded-full border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700"
                >
                  Skip to response
                </button>
              </div>
            </>
          )}

          {stage === "iv_recording" && currentIvQuestion && (
            <>
              <ExamVisualPanel variant="examiner" />
              <Timer
                value={responseTimeLeft}
                totalSeconds={activeResponseSeconds}
                mode="response"
                label={stageLabel.iv_recording}
                sublabel={`Question ${ivIndex + 1} of ${plan.interviewSession.questions.length}`}
                warningThreshold={10}
              />
            </>
          )}

          {(stage === "lr_recording" || stage === "iv_recording") && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-medium text-slate-900">
                Your Response
              </h2>
              <Waveform
                url={audioUrl}
                active={isRecording}
                placeholder="Recording…"
                className="mt-5"
              />
              <div className="mt-5 flex justify-center">
                <RecordButton
                  onStatusChange={setRecordingStatus}
                  onRecordingComplete={handleRecordingComplete}
                  startSignal={startSignal}
                  stopSignal={stopSignal}
                  disabled={
                    recordingStatus === "processing" ||
                    recordingStatus === "requesting"
                  }
                />
              </div>
            </section>
          )}

          {stage === "analyzing" && (
            <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
              <p className="text-sm font-medium text-slate-900">
                Analyzing {analyzeProgress.done} of {analyzeProgress.total}{" "}
                responses…
              </p>
              <p className="mt-2 text-xs text-slate-500">
                This may take a few minutes. Please keep this tab open.
              </p>
              <div className="mx-auto mt-6 h-2 max-w-xs overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full bg-slate-900 transition-all"
                  style={{
                    width: `${
                      analyzeProgress.total
                        ? (analyzeProgress.done / analyzeProgress.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </section>
          )}

          {stage === "results" && results && (
            <>
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-sm font-medium text-slate-900">
                  Overall Mock Score
                </h2>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-lg bg-slate-50 p-4 text-center">
                    <p className="text-xs text-slate-500">Listen & Repeat</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {results.summary.listenRepeatAvg}/5
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4 text-center">
                    <p className="text-xs text-slate-500">Interview</p>
                    <p className="mt-1 text-2xl font-semibold text-slate-900">
                      {results.summary.interviewAvg}/5
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-900 p-4 text-center text-white">
                    <p className="text-xs text-slate-300">Overall</p>
                    <p className="mt-1 text-2xl font-semibold">
                      {results.summary.overallScore}/5
                    </p>
                  </div>
                </div>
                <p className="mt-4 text-xs text-slate-500">
                  Saved to History on this device.{" "}
                  <Link href="/growth" className="underline">
                    View growth summary
                  </Link>
                </p>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-sm font-medium text-slate-900">
                  Listen & Repeat ({results.listenRepeat.length})
                </h2>
                <div className="mt-4 space-y-6">
                  {results.listenRepeat.map(({ pending, analysis }) => (
                    <div
                      key={pending.promptId}
                      className="border-t border-slate-100 pt-4 first:border-0 first:pt-0"
                    >
                      <p className="text-sm font-medium text-slate-800">
                        {pending.title}
                      </p>
                      <ScoreCard
                        score={analysis.score}
                        feedback={analysis.scoreSummary}
                        className="mt-3"
                      />
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-sm font-medium text-slate-900">
                  Interview · {plan.interviewSession.theme}
                </h2>
                <div className="mt-4 space-y-8">
                  {results.interview.map(({ pending, analysis }) => (
                    <div
                      key={pending.questionId}
                      className="border-t border-slate-100 pt-4 first:border-0 first:pt-0"
                    >
                      <p className="text-sm text-slate-700">{pending.promptText}</p>
                      <InterviewScoreCard
                        scores={analysis.scores}
                        feedback={analysis.scoreSummary}
                        className="mt-3"
                      />
                      <FeedbackCard
                        summary={analysis.feedback.summary}
                        sections={analysis.feedback.sections}
                        className="mt-4"
                      />
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={resetExam}
                  className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  New Mock Exam
                </button>
                <Link
                  href="/history"
                  className="rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  View History
                </Link>
              </div>
            </>
          )}

          {errorMessage && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </main>
  );
}
