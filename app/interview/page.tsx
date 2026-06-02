"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { BehaviorMetricsCard } from "@/components/BehaviorMetricsCard";
import { FeedbackCard } from "@/components/FeedbackCard";
import { ExamVisualPanel } from "@/components/ExamVisualPanel";
import { InterviewQuestionPanel } from "@/components/InterviewQuestionPanel";
import { InterviewScoreCard } from "@/components/InterviewScoreCard";
import { PracticeFormatSelector } from "@/components/PracticeFormatSelector";
import { PrepTimeSelector } from "@/components/PrepTimeSelector";
import { PromptAudioPlayer } from "@/components/PromptAudioPlayer";
import {
  RecordButton,
  type RecordingResult,
  type RecordingStatus,
} from "@/components/RecordButton";
import { RealTimeHint } from "@/components/RealTimeHint";
import { Timer } from "@/components/Timer";
import { Waveform } from "@/components/Waveform";
import { analyzeInterview } from "@/lib/analyzeInterview";
import type { AnalyzeInterviewResponse } from "@/lib/analyze-interview-types";
import {
  interviewScoresAverage,
  saveInterviewLocalHistory,
} from "@/lib/localHistory";
import {
  DEFAULT_INTERVIEW_SESSION_ID,
  getInterviewSessionById,
  getRandomInterviewSession,
  type InterviewPrompt,
  type InterviewSession,
} from "@/lib/interviewPrompts";
import type { PracticeFormat } from "@/lib/practiceConfig";
import { uploadAudioWithMeta } from "@/lib/uploadAudio";

type Phase =
  | "ready"
  | "intro"
  | "question_prompt"
  | "preparing"
  | "recording"
  | "uploading"
  | "analyzing"
  | "results"
  | "section_analyzing"
  | "section_results";

interface PendingRecording {
  question: InterviewPrompt;
  audioUrl: string;
  storagePath: string;
  durationMs: number;
}

interface SectionQuestionResult {
  question: InterviewPrompt;
  analysis: AnalyzeInterviewResponse;
}

export default function InterviewPage() {
  const [session, setSession] = useState<InterviewSession>(() =>
    getInterviewSessionById(DEFAULT_INTERVIEW_SESSION_ID)!
  );
  const [practiceFormat, setPracticeFormat] = useState<PracticeFormat>("section");
  const [showQuestionText, setShowQuestionText] = useState(false);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [prepSeconds, setPrepSeconds] = useState(0);
  const [phase, setPhase] = useState<Phase>("ready");
  const [prepTimeLeft, setPrepTimeLeft] = useState(0);
  const [responseTimeLeft, setResponseTimeLeft] = useState(45);
  const [hintsEnabled, setHintsEnabled] = useState(false);
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalyzeInterviewResponse | null>(null);
  const [sectionResults, setSectionResults] = useState<SectionQuestionResult[]>(
    []
  );
  const [sectionAnalyzeProgress, setSectionAnalyzeProgress] = useState({
    done: 0,
    total: 0,
  });
  const [startSignal, setStartSignal] = useState(0);
  const [stopSignal, setStopSignal] = useState(0);
  const [questionAudioKey, setQuestionAudioKey] = useState(0);

  const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const responseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const localBlobUrlRef = useRef<string | null>(null);
  const processingRef = useRef(false);
  const pendingSectionRef = useRef<PendingRecording[]>([]);

  const isSectionMode = practiceFormat === "section";
  const examMode = isSectionMode || !showQuestionText;

  const currentQuestion: InterviewPrompt = session.questions[questionIndex]!;
  const responseSeconds = currentQuestion.responseSeconds;
  const isLastQuestion = questionIndex >= session.questions.length - 1;
  const isRecording = recordingStatus === "recording";
  const isBusy =
    phase === "uploading" ||
    phase === "analyzing" ||
    phase === "section_analyzing" ||
    recordingStatus === "requesting" ||
    recordingStatus === "processing";

  const clearTimers = useCallback(() => {
    if (prepTimerRef.current) {
      clearInterval(prepTimerRef.current);
      prepTimerRef.current = null;
    }
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

  const resetQuestionState = useCallback(
    (respSecs = responseSeconds) => {
      clearTimers();
      revokeLocalBlobUrl();
      setAudioUrl(null);
      setAnalysis(null);
      setSectionResults([]);
      setErrorMessage(null);
      setPrepTimeLeft(prepSeconds);
      setResponseTimeLeft(respSecs);
      processingRef.current = false;
      pendingSectionRef.current = [];
    },
    [clearTimers, revokeLocalBlobUrl, prepSeconds, responseSeconds]
  );

  const beginRecordingPhase = useCallback((respSecs: number) => {
    setPhase("recording");
    setResponseTimeLeft(respSecs);
    setStartSignal((n) => n + 1);
  }, []);

  const goToQuestionPrompt = useCallback((index: number) => {
    setQuestionIndex(index);
    setQuestionAudioKey((k) => k + 1);
    setPhase(index === 0 && isSectionMode ? "intro" : "question_prompt");
  }, [isSectionMode]);

  const advanceAfterPrompt = useCallback(
    (index: number) => {
      const question = session.questions[index];
      if (!question) return;
      const respSecs = question.responseSeconds;
      setResponseTimeLeft(respSecs);
      if (prepSeconds <= 0) {
        beginRecordingPhase(respSecs);
        return;
      }
      setPhase("preparing");
      setPrepTimeLeft(prepSeconds);
      prepTimerRef.current = setInterval(() => {
        setPrepTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(prepTimerRef.current!);
            prepTimerRef.current = null;
            beginRecordingPhase(respSecs);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [session.questions, prepSeconds, beginRecordingPhase]
  );

  const runSectionBatchAnalysis = useCallback(
    async (pending: PendingRecording[]) => {
      setPhase("section_analyzing");
      setSectionAnalyzeProgress({ done: 0, total: pending.length });
      const results: SectionQuestionResult[] = [];

      try {
        for (let i = 0; i < pending.length; i += 1) {
          const item = pending[i]!;
          const response = await analyzeInterview({
            audioUrl: item.audioUrl,
            storagePath: item.storagePath,
            prompt: item.question.prompt,
            questionId: item.question.id,
            responseSeconds: item.question.responseSeconds,
            durationMs: item.durationMs,
          });
          results.push({ question: item.question, analysis: response });
          setSectionAnalyzeProgress({ done: i + 1, total: pending.length });
          saveInterviewLocalHistory({
            sessionTheme: session.theme,
            questionId: item.question.id,
            promptPreview: item.question.prompt.slice(0, 120),
            scores: response.scores,
            scoreSummary: response.scoreSummary,
            feedbackSummary: response.feedback.summary,
          });
        }
        setSectionResults(results);
        setPhase("section_results");
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Section analysis failed."
        );
        setPhase("section_results");
      } finally {
        processingRef.current = false;
      }
    },
    [session.theme]
  );

  const sessionRef = useRef(session);
  sessionRef.current = session;
  const questionRef = useRef(currentQuestion);
  questionRef.current = currentQuestion;
  const questionIndexRef = useRef(questionIndex);
  questionIndexRef.current = questionIndex;

  const runSingleAnalysisPipeline = useCallback(
    async (result: RecordingResult) => {
      if (processingRef.current) return;
      processingRef.current = true;
      clearTimers();
      const question = questionRef.current;
      revokeLocalBlobUrl();
      localBlobUrlRef.current = result.url;
      setAudioUrl(result.url);
      setErrorMessage(null);
      setAnalysis(null);

      try {
        setPhase("uploading");
        const { audioUrl: storedUrl, storagePath } = await uploadAudioWithMeta(
          result.blob,
          {
            allowAnonymous: true,
            fileName: `${question.sessionId}-${question.id}.webm`,
          }
        );
        setAudioUrl(storedUrl);
        revokeLocalBlobUrl();
        setPhase("analyzing");
        const response = await analyzeInterview({
          audioUrl: storedUrl,
          storagePath,
          prompt: question.prompt,
          questionId: question.id,
          responseSeconds: question.responseSeconds,
          durationMs: result.durationMs,
        });
        setAnalysis(response);
        setPhase("results");
        saveInterviewLocalHistory({
          sessionTheme: sessionRef.current.theme,
          questionId: question.id,
          promptPreview: question.prompt.slice(0, 120),
          scores: response.scores,
          scoreSummary: response.scoreSummary,
          feedbackSummary: response.feedback.summary,
        });
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong."
        );
        setPhase("results");
      } finally {
        processingRef.current = false;
      }
    },
    [clearTimers, revokeLocalBlobUrl]
  );

  const runSectionUpload = useCallback(
    async (result: RecordingResult) => {
      if (processingRef.current) return;
      processingRef.current = true;
      clearTimers();
      const question = questionRef.current;
      const qIndex = questionIndexRef.current;

      try {
        setPhase("uploading");
        const { audioUrl: storedUrl, storagePath } = await uploadAudioWithMeta(
          result.blob,
          {
            allowAnonymous: true,
            fileName: `${question.sessionId}-${question.id}.webm`,
          }
        );
        const pending: PendingRecording = {
          question,
          audioUrl: storedUrl,
          storagePath,
          durationMs: result.durationMs,
        };
        const allPending = [...pendingSectionRef.current, pending];
        pendingSectionRef.current = allPending;

        if (qIndex >= session.questions.length - 1) {
          await runSectionBatchAnalysis(allPending);
        } else {
          processingRef.current = false;
          goToQuestionPrompt(qIndex + 1);
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Upload failed."
        );
        processingRef.current = false;
      }
    },
    [clearTimers, goToQuestionPrompt, runSectionBatchAnalysis, session.questions.length]
  );

  const handleRecordingComplete = useCallback(
    (result: RecordingResult) => {
      if (phase !== "recording" && phase !== "uploading") return;
      setPhase("uploading");
      if (isSectionMode) {
        void runSectionUpload(result);
      } else {
        void runSingleAnalysisPipeline(result);
      }
    },
    [phase, isSectionMode, runSectionUpload, runSingleAnalysisPipeline]
  );

  useEffect(() => {
    if (phase !== "recording") return;
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
    return () => {
      if (responseTimerRef.current) {
        clearInterval(responseTimerRef.current);
        responseTimerRef.current = null;
      }
    };
  }, [phase, questionIndex]);

  useEffect(() => clearTimers, [clearTimers]);

  const handleStartSession = () => {
    setQuestionIndex(0);
    pendingSectionRef.current = [];
    if (isSectionMode) {
      goToQuestionPrompt(0);
    } else {
      setPhase("question_prompt");
      setQuestionAudioKey((k) => k + 1);
    }
  };

  const handleNextQuestion = () => {
    if (isLastQuestion) return;
    goToQuestionPrompt(questionIndex + 1);
  };

  const handleTryAgain = () => {
    pendingSectionRef.current = [];
    goToQuestionPrompt(questionIndex);
  };

  const handleNewSession = () => {
    setSession(getRandomInterviewSession());
    setQuestionIndex(0);
    setPhase("ready");
    resetQuestionState();
  };

  const handleReset = () => {
    setPhase("ready");
    resetQuestionState();
  };

  const showQuestionPanel =
    phase === "intro" ||
    phase === "question_prompt" ||
    phase === "preparing" ||
    phase === "recording" ||
    phase === "uploading";

  const timerMode =
    phase === "preparing" ? "prep" : "response";

  const timerValue =
    phase === "preparing"
      ? prepTimeLeft
      : phase === "recording"
        ? responseTimeLeft
        : responseSeconds;

  const timerTotal = phase === "preparing" ? prepSeconds : responseSeconds;

  const phaseLabel: Record<Phase, string> = {
    ready: "Ready to begin",
    intro: "Researcher introduction",
    question_prompt: "Listen to the question",
    preparing: "Preparation time",
    recording: "Response time — recording",
    uploading: "Uploading your response…",
    analyzing: "Analyzing your speech…",
    results: "Results ready",
    section_analyzing: "Analyzing full interview section…",
    section_results: "Section results ready",
  };

  const statusHint =
    phase === "uploading"
      ? "Uploading to cloud…"
      : phase === "analyzing" || phase === "section_analyzing"
        ? "Generating scores and feedback…"
        : phase === "recording"
          ? "Speak now — response is being recorded"
          : phase === "preparing"
            ? "Use this time to plan your answer"
            : phase === "question_prompt" || phase === "intro"
              ? "Listen carefully — question text is hidden on the real test"
              : phase === "section_results" || phase === "results"
                ? "Review your scores below"
                : "Configure options and start when ready";

  const sectionAvg =
    sectionResults.length > 0
      ? sectionResults.reduce(
          (s, r) => s + interviewScoresAverage(r.analysis.scores),
          0
        ) / sectionResults.length
      : 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6 md:pt-24 lg:px-8 lg:pt-28">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Virtual Interview
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
            {session.theme}
          </h1>
          <p className="mt-2 text-sm text-slate-600 sm:text-base">
            {isSectionMode
              ? `Section mock · ${session.questions.length} questions · ${prepSeconds}s prep · ${responseSeconds}s response`
              : `Question ${questionIndex + 1} of ${session.questions.length} · ${prepSeconds}s prep · ${responseSeconds}s response`}
          </p>
        </header>

        <div className="space-y-6">
          <PracticeFormatSelector
            value={practiceFormat}
            onChange={setPracticeFormat}
            disabled={phase !== "ready"}
            sectionDescription={`All ${session.questions.length} interview questions in one run — examiner image, audio only, scores at the end.`}
            singleDescription="One question at a time with immediate feedback and optional text."
          />

          {phase === "ready" && !isSectionMode && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-medium text-slate-900">
                    Show question text
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Off by default — matches the live test (audio only)
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showQuestionText}
                  onClick={() => setShowQuestionText((v) => !v)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
                    showQuestionText ? "bg-slate-900" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      showQuestionText ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </section>
          )}

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <PrepTimeSelector
              value={prepSeconds}
              onChange={setPrepSeconds}
              disabled={phase !== "ready"}
            />
            <p className="mt-3 text-xs text-slate-400">
              Official 2026 TOEFL Interview uses 0s prep — select 0s to simulate
              the real test.
            </p>
          </section>

          {phase === "intro" && isSectionMode && (
            <section className="space-y-4">
              <ExamVisualPanel variant="examiner" />
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <p className="text-xs text-slate-500">Researcher introduction</p>
                <PromptAudioPlayer
                  text={session.intro}
                  label="Play introduction"
                  autoPlay
                  onEnded={() => {
                    setQuestionAudioKey((k) => k + 1);
                    setPhase("question_prompt");
                  }}
                  className="mt-4"
                />
              </div>
            </section>
          )}

          {showQuestionPanel && phase !== "intro" && (
            <InterviewQuestionPanel
              key={`${currentQuestion.id}-${questionAudioKey}`}
              question={currentQuestion}
              session={session}
              examMode={examMode}
              showQuestionText={showQuestionText}
              showExaminerImage
              autoPlayQuestion={
                phase === "question_prompt" && (isSectionMode || examMode)
              }
              onQuestionAudioEnded={() => advanceAfterPrompt(questionIndex)}
              disabled={phase === "uploading" || phase === "recording"}
            />
          )}

          {phase === "question_prompt" && (
            <div className="flex justify-center">
              <button
                type="button"
                onClick={() => advanceAfterPrompt(questionIndex)}
                className="rounded-full border border-slate-300 px-6 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Skip to response time
              </button>
            </div>
          )}

          <Timer
            value={timerValue}
            totalSeconds={timerTotal}
            mode={timerMode}
            label={phaseLabel[phase]}
            sublabel={
              phase === "preparing"
                ? "Prep remaining"
                : phase === "recording"
                  ? `Question ${questionIndex + 1} · Response remaining`
                  : statusHint
            }
            warningThreshold={10}
            actions={
              <>
                {phase === "ready" && (
                  <button
                    type="button"
                    onClick={handleStartSession}
                    className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white hover:bg-slate-800"
                  >
                    {isSectionMode ? "Start section mock" : "Start question"}
                  </button>
                )}
                {phase === "results" && !isSectionMode && !isLastQuestion && (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    className="rounded-full bg-slate-900 px-6 py-3 text-sm font-medium text-white"
                  >
                    Next question
                  </button>
                )}
                {(phase === "results" ||
                  phase === "section_results" ||
                  phase === "ready") && (
                  <button
                    type="button"
                    onClick={
                      phase === "ready" ? handleNewSession : handleNewSession
                    }
                    className="rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700"
                  >
                    {phase === "ready" ? "Shuffle topic" : "New session"}
                  </button>
                )}
                {phase !== "ready" &&
                  phase !== "uploading" &&
                  phase !== "analyzing" &&
                  phase !== "section_analyzing" && (
                    <button
                      type="button"
                      onClick={handleReset}
                      className="rounded-full border border-slate-200 px-4 py-3 text-sm text-slate-500"
                    >
                      Reset
                    </button>
                  )}
              </>
            }
          />

          {!isSectionMode &&
            phase !== "results" &&
            phase !== "section_results" && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-sm font-medium text-slate-900">
                      Strategy hints
                    </h2>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={hintsEnabled}
                    onClick={() => setHintsEnabled((p) => !p)}
                    disabled={isBusy}
                    className={`relative h-6 w-11 shrink-0 rounded-full ${
                      hintsEnabled ? "bg-slate-900" : "bg-slate-200"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                        hintsEnabled ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
                {hintsEnabled && (
                  <ul className="mt-4 space-y-2 border-t border-slate-100 pt-4">
                    {currentQuestion.hints.map((hint) => (
                      <li key={hint} className="text-sm text-slate-600">
                        · {hint}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

          {(phase === "recording" ||
            phase === "uploading" ||
            phase === "analyzing" ||
            phase === "results" ||
            phase === "section_analyzing") && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="text-sm font-medium text-slate-900">Your response</h2>
              <p className="mt-1 text-xs text-slate-500">{statusHint}</p>
              <Waveform
                url={audioUrl}
                active={isRecording}
                className="mt-5"
              />
              {phase === "recording" && (
                <div className="mt-5 flex justify-center">
                  <RecordButton
                    onStatusChange={setRecordingStatus}
                    onRecordingComplete={handleRecordingComplete}
                    startSignal={startSignal}
                    stopSignal={stopSignal}
                    disabled={isBusy}
                  />
                </div>
              )}
              {phase === "section_analyzing" && (
                <p className="mt-4 text-center text-xs text-slate-500">
                  Analyzing {sectionAnalyzeProgress.done} of{" "}
                  {sectionAnalyzeProgress.total}…
                </p>
              )}
              {errorMessage && (
                <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                  {errorMessage}
                </p>
              )}
            </section>
          )}

          {!isSectionMode && analysis && phase === "results" && (
            <>
              <InterviewScoreCard
                scores={analysis.scores}
                feedback={analysis.scoreSummary}
              />
              <BehaviorMetricsCard metrics={analysis.metrics} />
              <FeedbackCard
                summary={analysis.feedback.summary}
                sections={analysis.feedback.sections}
              />
            </>
          )}

          {isSectionMode && phase === "section_results" && sectionResults.length > 0 && (
            <>
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-sm font-medium text-slate-900">
                  Section overview
                </h2>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {sectionAvg.toFixed(1)} / 5{" "}
                  <span className="text-sm font-normal text-slate-500">
                    average
                  </span>
                </p>
              </section>
              {sectionResults.map(({ question, analysis: a }) => (
                <div key={question.id} className="space-y-4">
                  <p className="text-sm font-medium text-slate-800">
                    Q{question.sequence}: {question.prompt}
                  </p>
                  <InterviewScoreCard
                    scores={a.scores}
                    feedback={a.scoreSummary}
                  />
                  <FeedbackCard
                    summary={a.feedback.summary}
                    sections={a.feedback.sections}
                  />
                </div>
              ))}
            </>
          )}
        </div>
      </div>

      <RealTimeHint
        hints={currentQuestion.hints}
        visible={
          !isSectionMode &&
          hintsEnabled &&
          (phase === "preparing" || phase === "recording")
        }
      />
    </main>
  );
}
