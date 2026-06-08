"use client";



import { useRouter } from "next/navigation";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ExamVisualPanel } from "@/components/ExamVisualPanel";

import { FeedbackCard } from "@/components/FeedbackCard";

import { InterviewQuestionPanel } from "@/components/InterviewQuestionPanel";

import { InterviewScoreCard } from "@/components/InterviewScoreCard";

import { ListenRepeatVisualPanel } from "@/components/ListenRepeatVisualPanel";

import { PromptAudioPlayer } from "@/components/PromptAudioPlayer";

import { ExamHeader } from "@/components/exam/ExamHeader";

import { ExamRecordingStrip } from "@/components/exam/ExamRecordingStrip";

import { InterviewHintPanel } from "@/components/exam/InterviewHintPanel";

import { ListenRepeatFeedbackPanel } from "@/components/exam/ListenRepeatFeedbackPanel";

import {

  RecordButton,

  type RecordingResult,

  type RecordingStatus,

} from "@/components/RecordButton";

import { analyzeInterview } from "@/lib/analyzeInterview";

import { analyzeSpeech } from "@/lib/analyzeSpeech";

import type { AnalyzeInterviewResponse } from "@/lib/analyze-interview-types";

import type { AnalyzeSpeechResponse } from "@/lib/analyze-speech-types";

import {

  getExamProgress,

  getListenRepeatRecordingSeconds,

  PREP_TIME_OPTIONS,

  stageToLabel,

  type PrepTimeOption,

} from "@/lib/examFlow";

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

import {

  buildBatchAnalysisErrorMessage,

  dedupeRecordings,

  getExpectedRecordingCount,

  getScoringRecordings,

  mergeExamAnalysisResults,

  upsertRecording,

} from "@/lib/examRecordings";

import {

  clearExamDraft,

  loadExamDraft,

  sanitizeRestoredStage,

  saveExamDraft,

} from "@/lib/examSessionPersistence";

import { refreshSignedAudioUrl, uploadAudioWithMeta } from "@/lib/uploadAudio";
import { getInterviewSectionImageUrl } from "@/lib/visualAssets";



type ExamStage =

  | "ready"

  | "lr_instruction"

  | "lr_listen"

  | "lr_recording"

  | "lr_item_complete"

  | "section_break"

  | "iv_instruction"

  | "iv_intro"

  | "iv_question_listen"

  | "iv_preparing"

  | "iv_recording"

  | "iv_item_complete"

  | "section_complete"

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

    analysis?: AnalyzeSpeechResponse;

  }>;

  interview: Array<{

    pending: PendingRecording;

    analysis?: AnalyzeInterviewResponse;

  }>;

  summary: LocalMockExamDetail | null;

  scored: boolean;

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



const LR_INSTRUCTION =

  "You will hear a sentence or short prompt. Repeat it as accurately and clearly as possible.";



const IV_INSTRUCTION =

  "You will answer a set of interview-style questions. Try to give clear answers with reasons and examples.";



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

  const [prepTimeLeft, setPrepTimeLeft] = useState(0);

  const [startSignal, setStartSignal] = useState(0);

  const [stopSignal, setStopSignal] = useState(0);

  const [micStream, setMicStream] = useState<MediaStream | null>(null);

  const [analyzeProgress, setAnalyzeProgress] = useState({
    done: 0,
    total: 0,
    currentTitle: null as string | null,
    jobStatus: null as string | null,
  });

  const [questionAudioKey, setQuestionAudioKey] = useState(0);



  const [wantScoring, setWantScoring] = useState(true);

  const [prepChoice, setPrepChoice] = useState<PrepTimeOption | "custom">(15);

  const [customPrepSeconds, setCustomPrepSeconds] = useState(20);

  const [showHint, setShowHint] = useState(true);

  const [sessionNote, setSessionNote] = useState<string | null>(null);



  const sessionHydratedRef = useRef(false);

  const responseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const processingRef = useRef(false);

  const analysisInFlightRef = useRef(false);

  const sectionBreakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  useEffect(() => {

    const draft = loadExamDraft(testId, mode);

    if (draft && draft.recordings.length > 0) {

      const restored = dedupeRecordings(draft.recordings);

      setRecordings(restored);

      setLrIndex(draft.lrIndex);

      setIvIndex(draft.ivIndex);

      setWantScoring(draft.wantScoring);

      setPrepChoice(draft.prepChoice);

      setCustomPrepSeconds(draft.customPrepSeconds);

      setShowHint(draft.showHint);

      setErrorMessage(draft.errorMessage);

      if (draft.results) {

        setResults(draft.results as ExamResults);

      }

      setStage(

        sanitizeRestoredStage(

          draft.stage,

          draft.recordings,

          draft.results

        ) as ExamStage

      );

      const forScoring = getScoringRecordings(restored, plan, mode);

      setSessionNote(

        draft.recordings.length > restored.length

          ? `Restored ${forScoring.length} question recording${forScoring.length === 1 ? "" : "s"} (removed ${draft.recordings.length - restored.length} duplicate take${draft.recordings.length - restored.length === 1 ? "" : "s"}).`

          : `Restored ${forScoring.length} saved recording${forScoring.length === 1 ? "" : "s"} from your last session.`

      );

    }

    sessionHydratedRef.current = true;

  }, [testId, mode, plan]);



  const scoringRecordings = useMemo(

    () => getScoringRecordings(recordings, plan, mode),

    [recordings, plan, mode]

  );

  const expectedRecordingCount = getExpectedRecordingCount(mode);



  useEffect(() => {

    if (!sessionHydratedRef.current) return;

    saveExamDraft({

      testId,

      mode,

      testTitle,

      stage,

      lrIndex,

      ivIndex,

      recordings: dedupeRecordings(recordings),

      results,

      wantScoring,

      prepChoice,

      customPrepSeconds,

      showHint,

      errorMessage,

      updatedAt: new Date().toISOString(),

    });

  }, [

    testId,

    mode,

    testTitle,

    stage,

    lrIndex,

    ivIndex,

    recordings,

    results,

    wantScoring,

    prepChoice,

    customPrepSeconds,

    showHint,

    errorMessage,

  ]);



  const currentLrPrompt = plan.listenRepeat[lrIndex];

  const currentIvQuestion = plan.interviewSession.questions[ivIndex];



  const effectivePrepSeconds =

    prepChoice === "custom" ? customPrepSeconds : prepChoice;



  const inListenRepeat =

    mode === "listen_repeat" ||

    (mode === "full" &&

      (stage.startsWith("lr_") || stage === "section_break"));



  const progress = getExamProgress(

    mode,

    lrIndex,

    ivIndex,

    inListenRepeat

  );



  const activeResponseSeconds =

    stage === "lr_recording" && currentLrPrompt

      ? getListenRepeatRecordingSeconds(currentLrPrompt)

      : stage === "iv_recording"

        ? MOCK_EXAM_RESPONSE_SECONDS

        : MOCK_EXAM_RESPONSE_SECONDS;



  const clearResponseTimer = useCallback(() => {

    if (responseTimerRef.current) {

      clearInterval(responseTimerRef.current);

      responseTimerRef.current = null;

    }

  }, []);



  const clearPrepTimer = useCallback(() => {

    if (prepTimerRef.current) {

      clearInterval(prepTimerRef.current);

      prepTimerRef.current = null;

    }

  }, []);



  const isRecordingStage =

    stage === "lr_recording" || stage === "iv_recording";



  const recordingSessionKey =

    stage === "lr_recording"

      ? `lr-${lrIndex}`

      : stage === "iv_recording"

        ? `iv-${ivIndex}`

        : null;



  const runBatchAnalysis = useCallback(

    async (

      pending: PendingRecording[],

      options?: {

        allRecordings?: PendingRecording[];

        mergeFrom?: ExamResults | null;

      }

    ) => {

      if (analysisInFlightRef.current || pending.length === 0) return;

      analysisInFlightRef.current = true;

      setErrorMessage(null);

      setStage("analyzing");

      setAnalyzeProgress({

        done: 0,

        total: pending.length,

        currentTitle: null,

        jobStatus: null,

      });



      const lrResults: ExamResults["listenRepeat"] = [];

      const ivResults: ExamResults["interview"] = [];

      const failures: Array<{ title: string; message: string }> = [];

      const allRecordings = options?.allRecordings ?? pending;



      try {

        for (let i = 0; i < pending.length; i += 1) {

          const item = pending[i]!;

          setAnalyzeProgress({

            done: i,

            total: pending.length,

            currentTitle: item.title,

            jobStatus: "starting",

          });



          let audioUrl = item.audioUrl;

          try {

            audioUrl = await refreshSignedAudioUrl(item.storagePath);

          } catch {

            // Keep the URL captured at upload time if refresh fails.

          }



          const itemWithUrl = { ...item, audioUrl };

          const pollOptions = {

            onStatus: (status: string) => {

              setAnalyzeProgress((prev) => ({

                ...prev,

                jobStatus: status,

              }));

            },

          };



          try {

            if (item.kind === "listen_repeat") {

              const analysis = await analyzeSpeech(

                {

                  audioUrl: itemWithUrl.audioUrl,

                  storagePath: itemWithUrl.storagePath,

                  original: itemWithUrl.original ?? itemWithUrl.promptText,

                  promptId: itemWithUrl.promptId,

                },

                pollOptions

              );

              lrResults.push({ pending: itemWithUrl, analysis });

            } else {

              const analysis = await analyzeInterview(

                {

                  audioUrl: itemWithUrl.audioUrl,

                  storagePath: itemWithUrl.storagePath,

                  prompt: itemWithUrl.promptText,

                  questionId: itemWithUrl.questionId,

                  responseSeconds: itemWithUrl.responseSeconds,

                  durationMs: itemWithUrl.durationMs,

                },

                pollOptions

              );

              ivResults.push({ pending: itemWithUrl, analysis });

            }

          } catch (err) {

            const message =

              err instanceof Error ? err.message : "Analysis failed.";

            failures.push({ title: item.title, message });

            if (item.kind === "listen_repeat") {

              lrResults.push({ pending: itemWithUrl });

            } else {

              ivResults.push({ pending: itemWithUrl });

            }

          }



          setAnalyzeProgress({

            done: i + 1,

            total: pending.length,

            currentTitle: null,

            jobStatus: null,

          });

        }



        const merged = mergeExamAnalysisResults(

          allRecordings,

          lrResults,

          ivResults,

          options?.mergeFrom ?? null

        );

        const scoredCount =

          merged.listenRepeat.filter((row) => row.analysis).length +

          merged.interview.filter((row) => row.analysis).length;

        setErrorMessage(

          buildBatchAnalysisErrorMessage(

            failures,

            scoredCount,

            allRecordings.length

          )

        );

        finishWithResults(merged.listenRepeat, merged.interview, true);

      } catch (err) {

        const merged = mergeExamAnalysisResults(

          allRecordings,

          lrResults,

          ivResults,

          options?.mergeFrom ?? null

        );

        setErrorMessage(

          err instanceof Error ? err.message : "Analysis failed."

        );

        finishWithResults(merged.listenRepeat, merged.interview, true);

      } finally {

        analysisInFlightRef.current = false;

      }

    },

    // eslint-disable-next-line react-hooks/exhaustive-deps

    [plan.interviewSession, testId, testTitle, mode]

  );



  const finishWithResults = (

    lrResults: ExamResults["listenRepeat"],

    ivResults: ExamResults["interview"],

    scored: boolean

  ) => {

    const listenRepeatDetails: LocalListenRepeatDetail[] = lrResults

      .filter((r) => r.analysis)

      .map(({ pending: p, analysis }) => ({

        promptId: p.promptId ?? "",

        title: p.title,

        score: analysis!.score,

        scoreSummary: analysis!.scoreSummary,

        feedbackSummary: analysis!.feedback.summary,

        original: p.original ?? p.promptText,

        analysis: analysis!,

      }));



    const interviewDetails: LocalInterviewDetail[] = ivResults

      .filter((r) => r.analysis)

      .map(({ pending: p, analysis }) => ({

        questionId: p.questionId ?? "",

        title: p.title,

        sessionTheme: plan.interviewSession.theme,

        promptPreview: p.promptText.slice(0, 120),

        promptText: p.promptText,

        scores: analysis!.scores,

        scoreSummary: analysis!.scoreSummary,

        feedbackSummary: analysis!.feedback.summary,

        analysis: analysis!,

      }));



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

      scored && scoredSections > 0

        ? (listenRepeatAvg + interviewAvg) / scoredSections

        : 0;



    const summary: LocalMockExamDetail | null = scored

      ? {

          sessionId: plan.interviewSession.id,

          sessionTheme: plan.interviewSession.theme,

          listenRepeat: listenRepeatDetails,

          interview: interviewDetails,

          listenRepeatAvg: Math.round(listenRepeatAvg * 10) / 10,

          interviewAvg: Math.round(interviewAvg * 10) / 10,

          overallScore: Math.round(overallScore * 10) / 10,

        }

      : null;



    if (scored && summary) {

      saveMockExamLocalHistory(summary, {

        testSetId: testId,

        examMode: mode,

        title: `${testTitle} · ${MODE_LABEL[mode]}`,

      });

    }



    setResults({

      listenRepeat: lrResults,

      interview: ivResults,

      summary,

      scored,

    });

    setStage("results");

  };



  const finishWithoutScoring = useCallback(

    (pending: PendingRecording[]) => {

      const lrResults = pending

        .filter((p) => p.kind === "listen_repeat")

        .map((p) => ({ pending: p }));

      const ivResults = pending

        .filter((p) => p.kind === "interview")

        .map((p) => ({ pending: p }));

      finishWithResults(lrResults, ivResults, false);

    },

    // eslint-disable-next-line react-hooks/exhaustive-deps

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

            responseSeconds: getListenRepeatRecordingSeconds(currentLrPrompt),

            audioUrl: storedUrl,

            storagePath,

            durationMs: result.durationMs,

          };



          setRecordings((prev) => upsertRecording(prev, pending));

          setStage("lr_item_complete");

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



          setRecordings((prev) => upsertRecording(prev, pending));

          setStage("iv_item_complete");

        }

      } catch (err) {

        setErrorMessage(

          err instanceof Error ? err.message : "Upload failed."

        );

      } finally {

        processingRef.current = false;

      }

    },

    [stage, currentLrPrompt, currentIvQuestion, testId, clearResponseTimer]

  );



  const advanceFromLrItem = () => {

    if (lrIndex >= plan.listenRepeat.length - 1) {

      if (mode === "full") {

        setStage("section_break");

      } else {

        setStage("section_complete");

      }

    } else {

      setLrIndex((i) => i + 1);

      setStage("lr_listen");

    }

  };



  const advanceFromIvItem = () => {

    if (ivIndex >= plan.interviewSession.questions.length - 1) {

      setStage("section_complete");

    } else {

      setIvIndex((i) => i + 1);

      setQuestionAudioKey((k) => k + 1);

      setStage("iv_question_listen");

    }

  };



  const startSectionComplete = () => {

    const normalized = getScoringRecordings(recordings, plan, mode);

    if (normalized.length !== recordings.length) {

      setRecordings(normalized);

    }

    if (recordings.length > normalized.length) {

      setSessionNote(

        `Scoring ${normalized.length} question${normalized.length === 1 ? "" : "s"} (${recordings.length - normalized.length} extra duplicate take${recordings.length - normalized.length === 1 ? "" : "s"} ignored).`

      );

    }

    if (wantScoring) {

      void runBatchAnalysis(normalized, { allRecordings: normalized });

    } else {

      finishWithoutScoring(normalized);

    }

  };



  const missingAnalysisCount = results

    ? results.listenRepeat.filter((r) => !r.analysis).length +

      results.interview.filter((r) => !r.analysis).length

    : recordings.length;



  const showRescoreButton =

    stage === "results" &&

    recordings.length > 0 &&

    (Boolean(errorMessage) ||

      !results?.scored ||

      missingAnalysisCount > 0);



  const rescoreLabel = !results?.scored

    ? "Score recordings"

    : errorMessage || missingAnalysisCount > 0

      ? "Retry scoring"

      : "Re-score";



  const handleRescore = () => {

    const all = scoringRecordings;

    const needsScore = all.filter((item) => {

      if (!results?.scored) return true;

      if (item.kind === "listen_repeat") {

        return !results.listenRepeat.find(

          (row) => row.pending.promptId === item.promptId

        )?.analysis;

      }

      return !results.interview.find(

        (row) => row.pending.questionId === item.questionId

      )?.analysis;

    });



    if (needsScore.length > 0) {

      void runBatchAnalysis(needsScore, {

        allRecordings: all,

        mergeFrom: results,

      });

      return;

    }



    void runBatchAnalysis(all, { allRecordings: all });

  };



  const recordingStatusRef = useRef(recordingStatus);

  recordingStatusRef.current = recordingStatus;



  useEffect(() => {

    if (!isRecordingStage) {

      setRecordingStatus("idle");

      setMicStream(null);

      return;

    }



    setResponseTimeLeft(activeResponseSeconds);

    setStartSignal((n) => n + 1);

  }, [isRecordingStage, lrIndex, ivIndex, activeResponseSeconds]);



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

          if (recordingStatusRef.current === "recording") {

            setStopSignal((n) => n + 1);

          }

          return 0;

        }

        return prev - 1;

      });

    }, 1000);



    return clearResponseTimer;

  }, [isRecordingStage, recordingStatus, lrIndex, ivIndex, clearResponseTimer]);



  useEffect(() => {

    if (stage !== "iv_preparing") {

      clearPrepTimer();

      return;

    }



    prepTimerRef.current = setInterval(() => {

      setPrepTimeLeft((prev) => {

        if (prev <= 1) {

          clearInterval(prepTimerRef.current!);

          prepTimerRef.current = null;

          setStage("iv_recording");

          return 0;

        }

        return prev - 1;

      });

    }, 1000);



    return clearPrepTimer;

  }, [stage, clearPrepTimer]);



  useEffect(() => {

    if (stage !== "section_break" || mode !== "full") return;

    sectionBreakTimerRef.current = setTimeout(() => {

      setIvIndex(0);

      setQuestionAudioKey(0);

      setStage("iv_instruction");

    }, 3000);

    return () => {

      if (sectionBreakTimerRef.current) {

        clearTimeout(sectionBreakTimerRef.current);

      }

    };

  }, [stage, mode]);



  const startExam = () => {

    clearExamDraft(testId, mode);

    setSessionNote(null);

    setRecordings([]);

    setResults(null);

    setErrorMessage(null);

    setLrIndex(0);

    setIvIndex(0);

    if (mode === "interview") {

      setStage("iv_instruction");

    } else {

      setStage("lr_instruction");

    }

  };



  const onLrInstructionContinue = () => setStage("lr_listen");



  const onLrAudioEnded = () => {

    if (stage !== "lr_listen") return;

    setStage("lr_recording");

  };



  const onIvInstructionContinue = () => setStage("iv_intro");



  const onIvQuestionEnded = () => {

    if (stage !== "iv_question_listen") return;

    if (effectivePrepSeconds > 0) {

      setPrepTimeLeft(effectivePrepSeconds);

      setStage("iv_preparing");

    } else {

      setStage("iv_recording");

    }

  };



  const onIvIntroEnded = () => {

    if (stage !== "iv_intro") return;

    setQuestionAudioKey((k) => k + 1);

    setStage("iv_question_listen");

  };



  const showExamHeader = stage !== "ready";

  const stageLabel = stageToLabel(stage);



  return (

    <div

      className={`mx-auto max-w-2xl ${isRecordingStage || stage === "iv_preparing" ? "pb-36" : "space-y-6"}`}

    >

      {showExamHeader && (

        <ExamHeader

          testTitle={testTitle}

          progress={progress}

          stageLabel={stageLabel}

          exitHref={`/test/${testId}`}

        />

      )}



      <div className="space-y-4">

        {sessionNote && (

          <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">

            {sessionNote}

            {stage === "section_complete" && wantScoring && (

              <span> Tap Get scores and feedback to continue.</span>

            )}

            {stage === "results" && (

              <span> You can retry scoring if needed.</span>

            )}

          </div>

        )}

        {stage === "ready" && (

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-lg font-semibold text-slate-900">

              {MODE_LABEL[mode]}

            </h2>

            <p className="mt-2 text-sm text-slate-600">

              This practice follows the 2026 TOEFL Speaking format: clear stages,

              no chat-style interaction, and feedback only when you choose it.

            </p>



            {(mode === "full" || mode === "interview") && (

              <div className="mt-6 space-y-4 border-t border-slate-100 pt-4">

                <div>

                  <p className="text-sm font-medium text-slate-800">

                    Preparation time (Virtual Interview)

                  </p>

                  <div className="mt-2 flex flex-wrap gap-2">

                    {PREP_TIME_OPTIONS.map((sec) => (

                      <button

                        key={sec}

                        type="button"

                        onClick={() => setPrepChoice(sec)}

                        className={`rounded-lg border px-3 py-1.5 text-sm ${

                          prepChoice === sec

                            ? "border-[#1e3a5f] bg-[#1e3a5f] text-white"

                            : "border-slate-200 text-slate-700"

                        }`}

                      >

                        {sec}s

                      </button>

                    ))}

                    <button

                      type="button"

                      onClick={() => setPrepChoice("custom")}

                      className={`rounded-lg border px-3 py-1.5 text-sm ${

                        prepChoice === "custom"

                          ? "border-[#1e3a5f] bg-[#1e3a5f] text-white"

                          : "border-slate-200 text-slate-700"

                      }`}

                    >

                      Custom

                    </button>

                  </div>

                  {prepChoice === "custom" && (

                    <input

                      type="number"

                      min={5}

                      max={120}

                      value={customPrepSeconds}

                      onChange={(e) =>

                        setCustomPrepSeconds(Number(e.target.value) || 15)

                      }

                      className="mt-2 w-24 rounded border border-slate-200 px-2 py-1 text-sm"

                    />

                  )}

                </div>



                <div>

                  <p className="text-sm font-medium text-slate-800">

                    Interview talking points

                  </p>

                  <p className="mt-0.5 text-xs text-slate-500">

                    Concrete angles to mention — not a model answer.

                  </p>

                  <div className="mt-2 flex gap-2">

                    <button

                      type="button"

                      onClick={() => setShowHint(true)}

                      className={`rounded-lg border px-3 py-1.5 text-sm ${

                        showHint

                          ? "border-[#1e3a5f] bg-[#1e3a5f] text-white"

                          : "border-slate-200"

                      }`}

                    >

                      Show hint

                    </button>

                    <button

                      type="button"

                      onClick={() => setShowHint(false)}

                      className={`rounded-lg border px-3 py-1.5 text-sm ${

                        !showHint

                          ? "border-[#1e3a5f] bg-[#1e3a5f] text-white"

                          : "border-slate-200"

                      }`}

                    >

                      Hide hint

                    </button>

                  </div>

                </div>

              </div>

            )}



            <div className="mt-6 border-t border-slate-100 pt-4">

              <p className="text-sm font-medium text-slate-800">

                Scores and detailed feedback

              </p>

              <div className="mt-2 flex gap-2">

                <button

                  type="button"

                  onClick={() => setWantScoring(true)}

                  className={`rounded-lg border px-3 py-1.5 text-sm ${

                    wantScoring

                      ? "border-[#1e3a5f] bg-[#1e3a5f] text-white"

                      : "border-slate-200"

                  }`}

                >

                  Yes, score my responses

                </button>

                <button

                  type="button"

                  onClick={() => setWantScoring(false)}

                  className={`rounded-lg border px-3 py-1.5 text-sm ${

                    !wantScoring

                      ? "border-[#1e3a5f] bg-[#1e3a5f] text-white"

                      : "border-slate-200"

                  }`}

                >

                  No, just save recordings

                </button>

              </div>

            </div>



            <button

              type="button"

              onClick={startExam}

              className="mt-6 w-full rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white hover:bg-[#152a45]"

            >

              Start when ready

            </button>

          </section>

        )}



        {stage === "lr_instruction" && (

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-sm font-semibold text-slate-900">

              Listen & Repeat

            </h2>

            <p className="mt-3 text-sm leading-relaxed text-slate-700">

              {LR_INSTRUCTION}

            </p>

            <p className="mt-3 text-xs text-slate-500">

              Prompt audio plays once. Recording starts automatically after you

              hear the prompt.

            </p>

            <button

              type="button"

              onClick={onLrInstructionContinue}

              className="mt-6 w-full rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white"

            >

              Start when ready

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

                  Now repeat the prompt.

                </p>

                <p className="mt-2 text-xs text-slate-500">

                  Speak clearly and match the original as closely as you can.

                </p>

              </section>

            )}

          </>

        )}



        {stage === "lr_item_complete" && (

          <section className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">

            <p className="text-sm font-semibold text-slate-900">

              Response recorded

            </p>

            <p className="mt-2 text-xs text-slate-500">

              Question {lrIndex + 1} of {plan.listenRepeat.length} complete.

            </p>

            <button

              type="button"

              onClick={advanceFromLrItem}

              className="mt-6 w-full rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white"

            >

              {lrIndex >= plan.listenRepeat.length - 1

                ? mode === "full"

                  ? "Continue to Virtual Interview"

                  : "Finish section"

                : "Next question"}

            </button>

          </section>

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



        {stage === "iv_instruction" && (

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-sm font-semibold text-slate-900">

              Virtual Interview

            </h2>

            <p className="mt-3 text-sm leading-relaxed text-slate-700">

              {IV_INSTRUCTION}

            </p>

            {effectivePrepSeconds > 0 && (

              <p className="mt-2 text-xs text-slate-500">

                Preparation time: {effectivePrepSeconds} seconds before each

                response.

              </p>

            )}

            <button

              type="button"

              onClick={onIvInstructionContinue}

              className="mt-6 w-full rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white"

            >

              Continue

            </button>

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



        {stage === "iv_preparing" && currentIvQuestion && (

          <section className="space-y-4">

            <div className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">

              <p className="text-sm font-semibold text-slate-900">

                Preparation time

              </p>

              <p className="mt-2 font-mono text-4xl font-semibold tabular-nums text-violet-800">

                {prepTimeLeft}s

              </p>

              <p className="mt-2 text-xs text-slate-500">

                Think about your answer. Recording starts automatically.

              </p>

            </div>

            <InterviewHintPanel question={currentIvQuestion} visible={showHint} />

          </section>

        )}



        {stage === "iv_recording" && currentIvQuestion && (

          <section className="space-y-4">

            <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">

              <p className="text-sm font-semibold text-slate-900">

                Recording your response

              </p>

              <p className="mt-2 text-xs text-slate-500">

                {currentIvQuestion.taskLabel} · up to 45 seconds

              </p>

            </div>

            <InterviewHintPanel question={currentIvQuestion} visible={showHint} />

          </section>

        )}



        {stage === "iv_item_complete" && (

          <section className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm">

            <p className="text-sm font-semibold text-slate-900">

              Response recorded

            </p>

            <p className="mt-2 text-xs text-slate-500">

              Question {ivIndex + 1} of{" "}

              {plan.interviewSession.questions.length} complete.

            </p>

            <button

              type="button"

              onClick={advanceFromIvItem}

              className="mt-6 w-full rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white"

            >

              {ivIndex >= plan.interviewSession.questions.length - 1

                ? "Finish section"

                : "Next question"}

            </button>

          </section>

        )}



        {stage === "section_complete" && (

          <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

            <h2 className="text-sm font-semibold text-slate-900">

              Section complete

            </h2>

            <p className="mt-2 text-sm text-slate-600">

              You recorded {scoringRecordings.length} of {expectedRecordingCount}{" "}

              response{scoringRecordings.length === 1 ? "" : "s"} for this test.

            </p>

            {recordings.length > scoringRecordings.length && (

              <p className="mt-2 text-xs text-amber-700">

                Extra duplicate takes were ignored — only your latest recording per

                question will be scored.

              </p>

            )}

            {wantScoring ? (

              <>

                <p className="mt-3 text-xs text-slate-500">

                  Transcribing and analyzing your responses…

                </p>

                <button

                  type="button"

                  onClick={startSectionComplete}

                  className="mt-6 w-full rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white"

                >

                  Get scores and feedback

                </button>

              </>

            ) : (

              <button

                type="button"

                onClick={startSectionComplete}

                className="mt-6 w-full rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white"

              >

                View summary

              </button>

            )}

          </section>

        )}



        {isRecordingStage && recordingSessionKey && (

          <RecordButton

            key={recordingSessionKey}

            hideControls

            className="sr-only"

            onStatusChange={setRecordingStatus}

            onStreamReady={setMicStream}

            onRecordingComplete={handleRecordingComplete}

            onError={(err) =>

              setErrorMessage(err.message)

            }

            startSignal={startSignal}

            stopSignal={stopSignal}

          />

        )}



        {isRecordingStage && (

          <ExamRecordingStrip

            label={stage === "lr_recording" ? "Recording" : "Recording"}

            sublabel={

              stage === "lr_recording"

                ? `Listen & Repeat · Q${progress.sectionQuestion}`

                : `Interview · Q${progress.sectionQuestion}`

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

              Transcribing and analyzing your responses…

            </p>

            {analyzeProgress.currentTitle && (

              <p className="mt-2 text-xs font-medium text-slate-700">

                Working on: {analyzeProgress.currentTitle}

              </p>

            )}

            <p className="mt-2 text-xs text-slate-500">

              {analyzeProgress.done} of {analyzeProgress.total} finished

              {analyzeProgress.jobStatus &&

              analyzeProgress.jobStatus !== "starting"

                ? ` · ${analyzeProgress.jobStatus}`

                : analyzeProgress.currentTitle

                  ? " · submitting…"

                  : ""}

              . Keep this tab open.

            </p>

            <p className="mt-3 text-[11px] text-slate-400">

              About 1–3 minutes per question. Scoring {analyzeProgress.total}{" "}

              recording{analyzeProgress.total === 1 ? "" : "s"} — not{" "}

              {recordings.length}. Your audio is saved; use Retry scoring if this

              fails.

            </p>

          </section>

        )}



        {stage === "results" && results && (

          <>

            {results.scored && results.summary ? (

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

                <h2 className="text-sm font-semibold text-slate-900">Scores</h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">

                  {results.summary.listenRepeat.length > 0 && (

                    <div className="rounded-lg bg-slate-50 p-4 text-center">

                      <p className="text-xs text-slate-500">Listen & Repeat</p>

                      <p className="mt-1 text-2xl font-semibold">

                        {results.summary.listenRepeatAvg}/5

                      </p>

                    </div>

                  )}

                  {results.summary.interview.length > 0 && (

                    <div className="rounded-lg bg-slate-50 p-4 text-center">

                      <p className="text-xs text-slate-500">Virtual Interview</p>

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

            ) : (

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

                <h2 className="text-sm font-semibold text-slate-900">Summary</h2>

                <p className="mt-2 text-sm text-slate-600">

                  {recordings.length} recording

                  {recordings.length === 1 ? "" : "s"} saved. Scoring was not

                  requested for this attempt.

                </p>

                <p className="mt-2 text-xs text-slate-500">

                  Start the Python API on port 8000, then use Score recordings

                  below.

                </p>

              </section>

            )}



            {showRescoreButton && (errorMessage || missingAnalysisCount > 0) && (

              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">

                <p className="font-medium">Scoring incomplete</p>

                <p className="mt-1 text-xs text-amber-800">

                  {errorMessage ??

                    `${missingAnalysisCount} recording${missingAnalysisCount === 1 ? "" : "s"} still need scoring.`}

                </p>

                <p className="mt-1 text-xs text-amber-700">

                  Your recordings are still saved ({recordings.length} in this

                  session). Retry scoring will only process questions that did

                  not score yet.

                </p>

              </section>

            )}



            {results.listenRepeat.length > 0 && (

              <section className="space-y-4">

                <h3 className="text-sm font-semibold text-slate-900">

                  Listen & Repeat

                </h3>

                {results.listenRepeat.map(({ pending, analysis }, i) => (

                  <div key={pending.promptId}>

                    <p className="mb-2 text-xs text-slate-500">

                      Question {i + 1} · {pending.title}

                    </p>

                    {analysis ? (

                      <ListenRepeatFeedbackPanel

                        original={pending.original ?? pending.promptText}

                        analysis={analysis}

                        title={`Question ${i + 1} — detailed feedback`}

                      />

                    ) : (

                      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">

                        Recording saved (no score).

                      </p>

                    )}

                  </div>

                ))}

              </section>

            )}



            {results.interview.length > 0 && (

              <section className="space-y-4">

                <h3 className="text-sm font-semibold text-slate-900">

                  Virtual Interview

                </h3>

                {results.interview.map(({ pending, analysis }) => (

                  <details

                    key={pending.questionId}

                    className="rounded-xl border border-slate-200 bg-white shadow-sm"

                  >

                    <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-slate-900 [&::-webkit-details-marker]:hidden">

                      {pending.title}

                      {analysis && (

                        <span className="ml-2 text-slate-500">

                          · {interviewScoresAverage(analysis.scores)}/5

                        </span>

                      )}

                    </summary>

                    <div className="border-t border-slate-100 px-5 pb-5 pt-4">

                      <p className="text-sm text-slate-700">{pending.promptText}</p>

                      {analysis ? (

                        <>

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

                        </>

                      ) : (

                        <p className="mt-3 text-sm text-slate-500">

                          Recording saved (no score).

                        </p>

                      )}

                    </div>

                  </details>

                ))}

              </section>

            )}



            <div className="flex flex-wrap gap-3 pb-6">

              {showRescoreButton && (

                <button

                  type="button"

                  onClick={handleRescore}

                  className="rounded-lg bg-[#1e3a5f] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#152a45]"

                >

                  {rescoreLabel}

                </button>

              )}

              <button

                type="button"

                onClick={() => router.push(`/test/${testId}`)}

                className={`rounded-lg px-5 py-2.5 text-sm font-medium ${

                  showRescoreButton

                    ? "border border-slate-300 text-slate-700"

                    : "bg-[#1e3a5f] text-white"

                }`}

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


