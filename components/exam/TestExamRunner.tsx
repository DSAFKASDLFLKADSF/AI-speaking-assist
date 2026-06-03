"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ExamVisualPanel } from "@/components/ExamVisualPanel";
import { FeedbackCard } from "@/components/FeedbackCard";
import { InterviewQuestionPanel } from "@/components/InterviewQuestionPanel";
import { InterviewScoreCard } from "@/components/InterviewScoreCard";
import { ListenRepeatVisualPanel } from "@/components/ListenRepeatVisualPanel";
import { PromptAudioPlayer } from "@/components/PromptAudioPlayer";
import { ExamRecordingStrip } from "@/components/exam/ExamRecordingStrip";
import {
  RecordButton,
  type RecordingResult,
  type RecordingStatus,
} from "@/components/RecordButton";
import { ScoreCard } from "@/components/ScoreCard";
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
  type TestExamMode,
} from "@/lib/localHistory";
import {
  buildExamPlanForTest,
  MOCK_EXAM_RESPONSE_SECONDS,
  type MockExamPlan,
} from "@/lib/mockExamConfig";
import { uploadAudioWithMeta } from "@/lib/uploadAudio";
import { getInterviewSectionImageUrl } from "@/lib/visualAssets";

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

interface ExamResults {
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

export interface TestExamRunnerProps {
  testId: string;
  testTitle: string;
  mode: TestExamMode;
}

const MODE_LABEL: Record<TestExamMode, string> = {
  full: "Full speaking test",
  listen_repeat: "Listen & Repeat only",
  interview: "Virtual Interview only",
};

export function TestExamRunner({ testId, testTitle, mode }: TestExamRunnerProps) {
  const router = useRouter();
  const [plan] = useState<MockExamPlan>(() => buildExamPlanForTest(testId));
  const [stage, setStage] = useState<ExamStage>("ready");
  const [lrIndex, setLrIndex] = useState(0);
  const [ivIndex, setIvIndex] = useState(0);
  const [recordings, setRecordings] = useState<PendingRecording[]>([]);
  const [results, setResults] = useState<ExamResults | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [responseTimeLeft, setResponseTimeLeft] = useState(8);
  const [startSignal, setStartSignal] = useState(0);
  const [stopSignal, setStopSignal] = useState(0);
  const [micStream, setMicStream] = useState<MediaStream | null>(null);
  const [analyzeProgress, setAnalyzeProgress] = useState({ done: 0, total: 0 });
  const [questionAudioKey, setQuestionAudioKey] = useState(0);

  const responseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef(false);
  const sectionBreakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentLrPrompt = plan.listenRepeat[lrIndex];
  const currentIvQuestion = plan.interviewSession.questions[ivIndex];
  const activeResponseSeconds =
    stage === "lr_recording" && currentLrPrompt
      ? currentLrPrompt.responseSeconds
      : stage === "iv_recording" && currentIvQuestion
        ? currentIvQuestion.responseSeconds
        : MOCK_EXAM_RESPONSE_SECONDS;

  const clearResponseTimer = useCallback(() => {
    if (responseTimerRef.current) {
      clearInterval(responseTimerRef.current);
      responseTimerRef.current = null;
    }
  }, []);

  const isRecordingStage =
    stage === "lr_recording" || stage === "iv_recording";

  const showRecordButton =
    stage !== "ready" &&
    stage !== "results" &&
    stage !== "analyzing" &&
    stage !== "section_break";

  const runBatchAnalysis = useCallback(
    async (pending: PendingRecording[]) => {
      setStage("analyzing");
      setAnalyzeProgress({ done: 0, total: pending.length });

      const lrResults: ExamResults["listenRepeat"] = [];
      const ivResults: ExamResults["interview"] = [];

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

        const scoredSections =
          (listenRepeatDetails.length > 0 ? 1 : 0) +
          (interviewDetails.length > 0 ? 1 : 0);
        const overallScore =
          scoredSections > 0
            ? (listenRepeatAvg + interviewAvg) / scoredSections
            : 0;

        const summary: LocalMockExamDetail = {
          sessionId: plan.interviewSession.id,
          sessionTheme: plan.interviewSession.theme,
          listenRepeat: listenRepeatDetails,
          interview: interviewDetails,
          listenRepeatAvg: Math.round(listenRepeatAvg * 10) / 10,
          interviewAvg: Math.round(interviewAvg * 10) / 10,
          overallScore: Math.round(overallScore * 10) / 10,
        };

        saveMockExamLocalHistory(summary, {
          testSetId: testId,
          examMode: mode,
          title: `${testTitle} · ${MODE_LABEL[mode]}`,
        });
        setResults({ listenRepeat: lrResults, interview: ivResults, summary });
        setStage("results");
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Analysis failed."
        );
        setStage("results");
      }
    },
    [plan.interviewSession, testId, testTitle, mode]
  );

  const handleRecordingComplete = useCallback(
    async (result: RecordingResult) => {
      if (processingRef.current) return;
      processingRef.current = true;
      clearResponseTimer();

      try {
        const { audioUrl: storedUrl, storagePath } = await uploadAudioWithMeta(
          result.blob,
          {
            allowAnonymous: true,
            fileName: `exam-${testId}-${Date.now()}-${crypto.randomUUID().slice(0, 8)}.webm`,
          }
        );

        if (stage === "lr_recording" && currentLrPrompt) {
          const pending: PendingRecording = {
            kind: "listen_repeat",
            promptId: currentLrPrompt.id,
            promptText: currentLrPrompt.transcript,
            original: currentLrPrompt.transcript,
            title: currentLrPrompt.title,
            responseSeconds: currentLrPrompt.responseSeconds,
            audioUrl: storedUrl,
            storagePath,
            durationMs: result.durationMs,
          };

          const nextRecordings = [...recordings, pending];
          setRecordings(nextRecordings);

          if (lrIndex >= plan.listenRepeat.length - 1) {
            if (mode === "full") {
              setStage("section_break");
            } else {
              await runBatchAnalysis(nextRecordings);
            }
          } else {
            setLrIndex((i) => i + 1);
            setStage("lr_listen");
          }
        } else if (stage === "iv_recording" && currentIvQuestion) {
          const pending: PendingRecording = {
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
      mode,
      testId,
      clearResponseTimer,
      runBatchAnalysis,
    ]
  );

  // Start recording after stage switches to a recording stage (RecordButton stays mounted).
  useEffect(() => {
    if (!isRecordingStage) return;

    setRecordingStatus("idle");
    setStartSignal((n) => n + 1);
    setResponseTimeLeft(activeResponseSeconds);
  }, [isRecordingStage, lrIndex, ivIndex, activeResponseSeconds]);

  // Countdown only while mic is actively recording.
  useEffect(() => {
    if (!isRecordingStage || recordingStatus !== "recording") {
      clearResponseTimer();
      return;
    }

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
  }, [
    isRecordingStage,
    recordingStatus,
    lrIndex,
    ivIndex,
    clearResponseTimer,
  ]);

  useEffect(() => {
    if (stage !== "section_break" || mode !== "full") return;
    sectionBreakTimerRef.current = setTimeout(() => {
      setIvIndex(0);
      setQuestionAudioKey(0);
      setStage("iv_intro");
    }, 2500);
    return () => {
      if (sectionBreakTimerRef.current) {
        clearTimeout(sectionBreakTimerRef.current);
      }
    };
  }, [stage, mode]);

  const startExam = () => {
    setRecordings([]);
    setResults(null);
    setErrorMessage(null);
    setLrIndex(0);
    setIvIndex(0);
    if (mode === "interview") {
      setStage("iv_intro");
    } else {
      setStage("lr_listen");
    }
  };

  const onLrAudioEnded = () => {
    if (stage !== "lr_listen") return;
    setStage("lr_recording");
  };

  const onIvQuestionEnded = () => {
    if (stage !== "iv_question_listen") return;
    setStage("iv_recording");
  };

  const onIvIntroEnded = () => {
    if (stage !== "iv_intro") return;
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
              ? "Preparing interview section"
              : stage.startsWith("iv")
                ? `Interview ${ivIndex + 1}/${plan.interviewSession.questions.length}`
                : "";

  const inActiveExam =
    stage !== "ready" && stage !== "results" && stage !== "analyzing";

  return (
    <div
      className={`mx-auto max-w-2xl ${isRecordingStage ? "pb-36" : "space-y-6"}`}
    >
      <header
        className={
          inActiveExam
            ? "sticky top-0 z-20 -mx-1 mb-4 border-b border-slate-200/80 bg-slate-50/95 px-1 py-2 backdrop-blur"
            : "space-y-6"
        }
      >
        <Link
          href={`/test/${testId}`}
          className="text-sm font-medium text-blue-600 hover:underline"
        >
          ← Back to {testTitle}
        </Link>
        <p
          className={`text-xs font-medium uppercase tracking-wide text-slate-500 ${
            inActiveExam ? "mt-1" : "mt-3"
          }`}
        >
          {MODE_LABEL[mode]}
        </p>
        <p className="mt-0.5 text-sm font-medium text-slate-800">{progressLabel}</p>
      </header>

      <div className={inActiveExam && !isRecordingStage ? "space-y-4" : inActiveExam ? "space-y-4" : "space-y-6"}>
      {stage === "ready" && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-900">Before you begin</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li>Prompt audio plays once — no replay or skip.</li>
            <li>Recording starts automatically after each prompt.</li>
            <li>Scores and feedback appear only after you finish all items.</li>
            {mode === "full" && (
              <li>
                Section 1: 7 Listen & Repeat · Section 2: 4 Interview questions
              </li>
            )}
          </ul>
          <button
            type="button"
            onClick={startExam}
            className="mt-6 w-full rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white hover:bg-[#152a45]"
          >
            Begin
          </button>
        </section>
      )}

      {(stage === "lr_listen" || stage === "lr_recording") && currentLrPrompt && (
        <>
          {stage === "lr_listen" && (
            <ListenRepeatVisualPanel
              key={currentLrPrompt.id}
              prompt={currentLrPrompt}
              examMode
              showTranscript={false}
              autoPlay
              onAudioEnded={onLrAudioEnded}
            />
          )}
          {stage === "lr_recording" && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
              <p className="text-sm font-semibold text-slate-900">
                Repeat the sentence now
              </p>
              <p className="mt-2 text-xs text-slate-500 line-clamp-2">
                {currentLrPrompt.scenario}
              </p>
            </section>
          )}
        </>
      )}

      {stage === "section_break" && (
        <section className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <ExamVisualPanel
            variant="topic"
            topicImageUrl={getInterviewSectionImageUrl(plan.officialSetId)}
            topicLabel="Section 2"
            themeLabel={plan.interviewSession.theme}
            compact
          />
          <p className="mt-4 text-sm text-slate-600">
            Listen & Repeat complete. Virtual Interview begins shortly…
          </p>
        </section>
      )}

      {stage === "iv_intro" && (
        <section className="space-y-3">
          <ExamVisualPanel variant="examiner" compact />
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <PromptAudioPlayer
              speechKind="custom"
              text={plan.interviewSession.intro}
              autoPlay
              examMode
              onEnded={onIvIntroEnded}
            />
          </div>
        </section>
      )}

      {stage === "iv_question_listen" && currentIvQuestion && (
        <InterviewQuestionPanel
          key={`${currentIvQuestion.id}-${questionAudioKey}`}
          question={currentIvQuestion}
          session={plan.interviewSession}
          examMode
          showQuestionText={false}
          showExaminerImage
          autoPlayQuestion
          onQuestionAudioEnded={onIvQuestionEnded}
        />
      )}

      {stage === "iv_recording" && currentIvQuestion && (
        <section className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">
          <p className="text-sm font-semibold text-slate-900">Your response</p>
          <p className="mt-2 text-xs text-slate-500">
            Question {ivIndex + 1} of {plan.interviewSession.questions.length}
            · {currentIvQuestion.taskLabel}
          </p>
        </section>
      )}

      {showRecordButton && (
        <RecordButton
          hideControls
          className="sr-only"
          onStatusChange={setRecordingStatus}
          onStreamReady={setMicStream}
          onRecordingComplete={handleRecordingComplete}
          startSignal={startSignal}
          stopSignal={stopSignal}
        />
      )}

      {isRecordingStage && (
        <ExamRecordingStrip
          label={
            stage === "lr_recording" ? "Response time" : "Interview response"
          }
          sublabel={
            stage === "lr_recording"
              ? `Q${lrIndex + 1} of ${plan.listenRepeat.length}`
              : `Q${ivIndex + 1} of ${plan.interviewSession.questions.length}`
          }
          timeLeft={responseTimeLeft}
          totalSeconds={activeResponseSeconds}
          warningThreshold={stage === "lr_recording" ? 3 : 10}
          recordingStatus={recordingStatus}
          micStream={micStream}
        />
      )}

      {stage === "analyzing" && (
        <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm font-medium text-slate-900">
            Analyzing {analyzeProgress.done} of {analyzeProgress.total}…
          </p>
          <p className="mt-2 text-xs text-slate-500">Keep this tab open.</p>
        </section>
      )}

      {stage === "results" && results && (
        <>
          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Results</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {results.summary.listenRepeat.length > 0 && (
                <div className="rounded-lg bg-slate-50 p-4 text-center">
                  <p className="text-xs text-slate-500">L&R</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {results.summary.listenRepeatAvg}/5
                  </p>
                </div>
              )}
              {results.summary.interview.length > 0 && (
                <div className="rounded-lg bg-slate-50 p-4 text-center">
                  <p className="text-xs text-slate-500">Interview</p>
                  <p className="mt-1 text-2xl font-semibold">
                    {results.summary.interviewAvg}/5
                  </p>
                </div>
              )}
              <div className="rounded-lg bg-slate-900 p-4 text-center text-white">
                <p className="text-xs text-slate-300">Overall</p>
                <p className="mt-1 text-2xl font-semibold">
                  {results.summary.overallScore}/5
                </p>
              </div>
            </div>
          </section>

          {results.listenRepeat.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold">Listen & Repeat</h3>
              <div className="mt-4 space-y-6">
                {results.listenRepeat.map(({ pending, analysis }) => (
                  <div key={pending.promptId}>
                    <ScoreCard
                      score={analysis.score}
                      feedback={analysis.scoreSummary}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          {results.interview.length > 0 && (
            <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-sm font-semibold">Virtual Interview</h3>
              <div className="mt-4 space-y-8">
                {results.interview.map(({ pending, analysis }) => (
                  <div key={pending.questionId}>
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
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => router.push(`/test/${testId}`)}
              className="rounded-lg bg-[#1e3a5f] px-5 py-2.5 text-sm font-medium text-white"
            >
              Back to test set
            </button>
            <button
              type="button"
              onClick={startExam}
              className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-medium text-slate-700"
            >
              Try again
            </button>
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
  );
}
