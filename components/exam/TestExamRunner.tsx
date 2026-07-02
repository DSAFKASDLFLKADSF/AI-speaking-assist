"use client";



import { useRouter } from "next/navigation";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ExamVisualPanel } from "@/components/ExamVisualPanel";

import { InterviewQuestionPanel } from "@/components/InterviewQuestionPanel";

import { ListenRepeatVisualPanel } from "@/components/ListenRepeatVisualPanel";

import { PromptAudioPlayer } from "@/components/PromptAudioPlayer";

import { ExamHeader } from "@/components/exam/ExamHeader";

import { ExamRecordingStrip } from "@/components/exam/ExamRecordingStrip";

import { InterviewHintPanel } from "@/components/exam/InterviewHintPanel";

import { InterviewFeedbackPanel } from "@/components/exam/InterviewFeedbackPanel";
import { ListenRepeatFeedbackPanel } from "@/components/exam/ListenRepeatFeedbackPanel";

import {

  RecordButton,

  type RecordingResult,

  type RecordingStatus,

} from "@/components/RecordButton";

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
  formatSpeakingBand,
  itemScoresToSpeakingBand,
  SPEAKING_BAND_MAX,
} from "@/lib/toeflSpeakingBand";

import {

  buildExamPlanForTest,

  MOCK_EXAM_RESPONSE_SECONDS,

  type MockExamPlan,

} from "@/lib/mockExamConfig";

import {

  buildBatchAnalysisErrorMessage,
  collectUnscoredFailures,
  findResumeIvIndex,
  formatAnalysisError,
  formatUploadError,
  buildLowMicQualityWarning,
  dedupeRecordings,
  getExpectedRecordingCount,
  getScoringRecordings,
  mergeExamAnalysisResults,
  needsInterviewContinuation,
  recordingKey,
  upsertRecording,
} from "@/lib/examRecordings";

import {

  applyPipelineOutcome,

  analyzeExamRecordingsParallel,

  clearPipelineEntry,

  countPipelineInFlight,

  countPipelineScored,

  emptyPipelinePartial,

  ExamAnalysisPipeline,

  getPipelineAnalysis,

  needsPipelineAnalysis,

  PIPELINE_MAX_CONCURRENT,

  type PipelinePartialResults,

} from "@/lib/examPipelineAnalysis";

import {

  clearExamDraft,

  loadExamDraft,

  sanitizeRestoredStage,

  saveExamDraft,

} from "@/lib/examSessionPersistence";

import { uploadAudioWithMeta } from "@/lib/uploadAudio";
import {
  ensureMicrophonePermission,
  formatMicrophoneError,
} from "@/lib/microphone";
import { useAuthSession } from "@/lib/auth/useAuthSession";
import {
  getViewerSurveyKey,
  markPracticeCompleteForSurvey,
} from "@/lib/surveys/localState";
import { getOrCreateSurveyClientId } from "@/lib/surveys/clientId";
import { getInterviewSectionImageUrl } from "@/lib/visualAssets";
import { buildInterviewSampleAnswer } from "@/lib/interviewSampleAnswer";



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

  bucket?: string;

  durationMs: number;

  lowMicQuality?: boolean;

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

  const [micAccessError, setMicAccessError] = useState<string | null>(null);

  const [micEnabling, setMicEnabling] = useState(false);

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

  const [partialResults, setPartialResults] = useState<PipelinePartialResults>(

    () => emptyPipelinePartial()

  );

  const [draftReady, setDraftReady] = useState(false);

  const [recordingError, setRecordingError] = useState<string | null>(null);

  const { user, userId } = useAuthSession();
  const isAdmin = Boolean(user?.isAdmin);



  const wantScoringRef = useRef(wantScoring);

  wantScoringRef.current = wantScoring;

  const partialResultsRef = useRef(partialResults);

  partialResultsRef.current = partialResults;

  const pipelineRef = useRef<ExamAnalysisPipeline | null>(null);

  const restoredPipelineEnqueueRef = useRef(false);

  if (!pipelineRef.current) {

    pipelineRef.current = new ExamAnalysisPipeline({

      maxConcurrent: PIPELINE_MAX_CONCURRENT,

      onItemDone: (recording, outcome) => {

        setPartialResults((prev) => {

          const next = applyPipelineOutcome(prev, recording, outcome);

          partialResultsRef.current = next;

          return next;

        });

      },

    });

  }



  const responseTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const responseDeadlineRef = useRef<number | null>(null);

  const prepTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const uploadInFlightRef = useRef<Set<string>>(new Set());

  const stopRetryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const lrIndexRef = useRef(lrIndex);

  lrIndexRef.current = lrIndex;

  const ivIndexRef = useRef(ivIndex);

  ivIndexRef.current = ivIndex;

  const [uploadingRecordingKey, setUploadingRecordingKey] = useState<string | null>(null);

  const analysisInFlightRef = useRef(false);

  /** Matches `recordingSessionKey` — rejects stale uploads after question change. */
  const activeRecordingKeyRef = useRef<string | null>(null);

  const recordingArmRef = useRef<string | null>(null);

  const stageRef = useRef(stage);

  stageRef.current = stage;

  const sectionBreakTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);



  useEffect(() => {

    const draft = loadExamDraft(testId, mode);

    if (draft && draft.recordings.length > 0) {

      const restored = dedupeRecordings(draft.recordings);

      setRecordings(restored);

      setLrIndex(

        Math.min(

          Math.max(0, draft.lrIndex),

          Math.max(0, plan.listenRepeat.length - 1)

        )

      );

      setIvIndex(

        Math.min(

          Math.max(0, draft.ivIndex),

          Math.max(0, plan.interviewSession.questions.length - 1)

        )

      );

      setWantScoring(draft.wantScoring);

      setPrepChoice(draft.prepChoice);

      setCustomPrepSeconds(draft.customPrepSeconds);

      setShowHint(draft.showHint);

      if (draft.results) {

        setResults(draft.results as ExamResults);

      }

      const restoredResults = draft.results as ExamResults | null;

      const restoredMissing = restoredResults

        ? restoredResults.listenRepeat.filter((r) => !r.analysis).length +

          restoredResults.interview.filter((r) => !r.analysis).length

        : 1;

      setErrorMessage(

        restoredResults?.scored && restoredMissing === 0

          ? null

          : draft.errorMessage

      );

      if (draft.partialResults) {

        setPartialResults({

          listenRepeat: (draft.partialResults.listenRepeat ??

            []) as PipelinePartialResults["listenRepeat"],

          interview: (draft.partialResults.interview ??

            []) as PipelinePartialResults["interview"],

        });

      }

      setStage(

        sanitizeRestoredStage(

          draft.stage,

          draft.recordings,

          draft.results,

          {
            mode: draft.mode,
            lrIndex: draft.lrIndex,
            ivIndex: draft.ivIndex,
            lrTotal: plan.listenRepeat.length,
            ivTotal: plan.interviewSession.questions.length,
          }

        ) as ExamStage

      );

      const forScoring = getScoringRecordings(restored, plan, mode);

      setSessionNote(

        draft.recordings.length > restored.length

          ? `Restored ${forScoring.length} question recording${forScoring.length === 1 ? "" : "s"} (removed ${draft.recordings.length - restored.length} duplicate take${draft.recordings.length - restored.length === 1 ? "" : "s"}).`

          : `Restored ${forScoring.length} saved recording${forScoring.length === 1 ? "" : "s"} from your last session.`

      );

    }

    setDraftReady(true);

  }, [testId, mode, plan]);



  useEffect(() => {

    if (!draftReady || restoredPipelineEnqueueRef.current) return;

    restoredPipelineEnqueueRef.current = true;

    if (!wantScoring) return;

    const forScoring = getScoringRecordings(recordings, plan, mode);

    for (const recording of forScoring) {

      if (getPipelineAnalysis(partialResultsRef.current, recording)) continue;

      const key = recordingKey(recording);

      const row =

        recording.kind === "listen_repeat"

          ? partialResultsRef.current.listenRepeat.find(

              (r) => recordingKey(r.pending) === key

            )

          : partialResultsRef.current.interview.find(

              (r) => recordingKey(r.pending) === key

            );

      if (

        row?.error &&

        row.pending.storagePath === recording.storagePath

      ) {

        continue;

      }

      pipelineRef.current?.enqueue(recording);

    }

  }, [draftReady, wantScoring, recordings, plan, mode]);



  const scoringRecordings = useMemo(

    () => getScoringRecordings(recordings, plan, mode),

    [recordings, plan, mode]

  );

  const micQualityWarning = useMemo(

    () => buildLowMicQualityWarning(scoringRecordings),

    [scoringRecordings]

  );

  const expectedRecordingCount = getExpectedRecordingCount(mode);



  useEffect(() => {

    if (!draftReady) return;

    saveExamDraft({

      testId,

      mode,

      testTitle,

      stage,

      lrIndex,

      ivIndex,

      recordings: dedupeRecordings(recordings),

      results,

      partialResults: {

        listenRepeat: partialResults.listenRepeat,

        interview: partialResults.interview,

        summary: null,

        scored: false,

      },

      wantScoring,

      prepChoice,

      customPrepSeconds,

      showHint,

      errorMessage:

        results?.scored &&

        results.listenRepeat.filter((r) => !r.analysis).length +

          results.interview.filter((r) => !r.analysis).length ===

          0

          ? null

          : errorMessage,

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

    partialResults,

    wantScoring,

    prepChoice,

    customPrepSeconds,

    showHint,

    errorMessage,

    draftReady,

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



  const runBatchAnalysis = useCallback(

    async (

      pending: PendingRecording[],

      options?: {

        allRecordings?: PendingRecording[];

        mergeFrom?: ExamResults | null;

      }

    ) => {

      if (analysisInFlightRef.current) return;

      const allRecordings = options?.allRecordings ?? pending;

      if (allRecordings.length === 0) return;

      analysisInFlightRef.current = true;

      setErrorMessage(null);

      setStage("analyzing");



      const pipelineMerge: ExamResults | null = options?.mergeFrom ?? {

        listenRepeat: partialResultsRef.current.listenRepeat,

        interview: partialResultsRef.current.interview,

        summary: null,

        scored: false,

      };



      let alreadyScored =

        (pipelineMerge?.listenRepeat.filter((r) => r.analysis).length ?? 0) +

        (pipelineMerge?.interview.filter((r) => r.analysis).length ?? 0);

      const totalWork = allRecordings.length;



      setAnalyzeProgress({

        done: alreadyScored,

        total: totalWork,

        currentTitle: null,

        jobStatus: null,

      });



      try {

        await pipelineRef.current?.waitForIdle();



        const mergeAfterWait: ExamResults = {

          listenRepeat: partialResultsRef.current.listenRepeat,

          interview: partialResultsRef.current.interview,

          summary: null,

          scored: false,

        };



        alreadyScored =

          mergeAfterWait.listenRepeat.filter((r) => r.analysis).length +

          mergeAfterWait.interview.filter((r) => r.analysis).length;



        const toAnalyze = pending.filter((item) =>

          needsPipelineAnalysis(partialResultsRef.current, item)

        );



        setAnalyzeProgress((prev) => ({

          ...prev,

          done: alreadyScored,

        }));



        const parallelResults =

          toAnalyze.length > 0

            ? await analyzeExamRecordingsParallel(toAnalyze, {

                maxConcurrent: PIPELINE_MAX_CONCURRENT,

                onProgress: (done, _total, title) => {

                  setAnalyzeProgress({

                    done: alreadyScored + done,

                    total: totalWork,

                    currentTitle: title,

                    jobStatus: title ? "running" : null,

                  });

                },

                onStatus: (status) => {

                  setAnalyzeProgress((prev) => ({

                    ...prev,

                    jobStatus: status,

                  }));

                },

              })

            : [];



        for (const row of parallelResults) {

          partialResultsRef.current = applyPipelineOutcome(

            partialResultsRef.current,

            row.pending,

            row.analysis

              ? { status: "done", analysis: row.analysis }

              : { status: "failed", error: row.error ?? "Analysis failed." }

          );

        }

        setPartialResults(partialResultsRef.current);



        const lrResults: ExamResults["listenRepeat"] = [];

        const ivResults: ExamResults["interview"] = [];



        for (const row of parallelResults) {

          if (row.pending.kind === "listen_repeat") {

            lrResults.push(

              row.analysis

                ? { pending: row.pending, analysis: row.analysis as AnalyzeSpeechResponse }

                : { pending: row.pending }

            );

          } else {

            ivResults.push(

              row.analysis

                ? {

                    pending: row.pending,

                    analysis: row.analysis as AnalyzeInterviewResponse,

                  }

                : { pending: row.pending }

            );

          }

        }



        const merged = mergeExamAnalysisResults(
          allRecordings,
          lrResults,
          ivResults,
          mergeAfterWait
        );

        const scoredCount =

          merged.listenRepeat.filter((row) => row.analysis).length +

          merged.interview.filter((row) => row.analysis).length;

        if (scoredCount >= allRecordings.length) {

          setErrorMessage(null);

        } else {

          setErrorMessage(

            buildBatchAnalysisErrorMessage(

              collectUnscoredFailures(partialResultsRef.current),

              scoredCount,

              allRecordings.length

            )

          );

        }

        finishWithResults(merged.listenRepeat, merged.interview, true);

      } catch (err) {

        const merged = mergeExamAnalysisResults(
          allRecordings,
          [],
          [],
          {
            listenRepeat: partialResultsRef.current.listenRepeat,
            interview: partialResultsRef.current.interview,
          }
        );

        setErrorMessage(

          formatAnalysisError(

            err instanceof Error ? err.message : "Analysis failed."

          )

        );

        finishWithResults(merged.listenRepeat, merged.interview, true);

      } finally {

        analysisInFlightRef.current = false;

      }

    },

    [plan.interviewSession, testId, testTitle, mode] // eslint-disable-line react-hooks/exhaustive-deps -- finishWithResults defined below

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



    const lrItemScores = listenRepeatDetails.map((d) => d.score);

    const ivItemScores = interviewDetails.map((d) =>
      interviewScoresAverage(d.scores)
    );

    const allItemScores = [...lrItemScores, ...ivItemScores];

    const listenRepeatAvg =
      lrItemScores.length > 0
        ? itemScoresToSpeakingBand(lrItemScores)
        : 0;

    const interviewAvg =
      ivItemScores.length > 0 ? itemScoresToSpeakingBand(ivItemScores) : 0;

    const overallScore =
      scored && allItemScores.length > 0
        ? itemScoresToSpeakingBand(allItemScores)
        : 0;



    const summary: LocalMockExamDetail | null = scored

      ? {

          sessionId: plan.interviewSession.id,

          sessionTheme: plan.interviewSession.theme,

          listenRepeat: listenRepeatDetails,

          interview: interviewDetails,

          listenRepeatAvg,

          interviewAvg,

          overallScore,

        }

      : null;



    if (scored && summary) {

      saveMockExamLocalHistory(summary, {

        testSetId: testId,

        examMode: mode,

        title: `${testTitle} · ${MODE_LABEL[mode]}`,

        userId: userId ?? undefined,

      });

    }



    setResults({

      listenRepeat: lrResults,

      interview: ivResults,

      summary,

      scored,

    });

    setStage("results");

    if (lrResults.length + ivResults.length > 0) {
      markPracticeCompleteForSurvey(
        getViewerSurveyKey(userId ?? null, getOrCreateSurveyClientId())
      );
    }

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

    [plan.interviewSession, testId, testTitle, mode] // eslint-disable-line react-hooks/exhaustive-deps -- finishWithResults defined below

  );



  const handleRecordingComplete = useCallback(

    async (result: RecordingResult) => {

      clearResponseTimer();

      setRecordingError(null);



      const captureStage = stageRef.current;

      const captureLrIdx = lrIndexRef.current;

      const captureIvIdx = ivIndexRef.current;

      const captureLr =

        captureStage === "lr_recording"

          ? plan.listenRepeat[captureLrIdx]

          : undefined;

      const captureIv =

        captureStage === "iv_recording"

          ? plan.interviewSession.questions[captureIvIdx]

          : undefined;

      const captureKey =

        captureStage === "lr_recording"

          ? `lr-${captureLrIdx}`

          : captureStage === "iv_recording"

            ? `iv-${captureIvIdx}`

            : null;



      if (!captureKey || (!captureLr && !captureIv)) {

        return;

      }

      if (uploadInFlightRef.current.has(captureKey)) {

        return;

      }

      uploadInFlightRef.current.add(captureKey);

      setUploadingRecordingKey(captureKey);



      const pendingId = crypto.randomUUID();

      const provisionalPath = `pending:${pendingId}`;



      const buildPending = (

        audioUrl: string,

        storagePath: string,

        bucket?: string

      ): PendingRecording => {

        if (captureStage === "lr_recording" && captureLr) {

          return {

            kind: "listen_repeat",

            promptId: captureLr.id,

            promptText: captureLr.transcript,

            original: captureLr.transcript,

            title: captureLr.title,

            responseSeconds: getListenRepeatRecordingSeconds(captureLr),

            audioUrl,

            storagePath,

            bucket,

            durationMs: result.durationMs,

            lowMicQuality: result.lowMicQuality,

          };

        }

        return {

          kind: "interview",

          questionId: captureIv!.id,

          promptText: captureIv!.prompt,

          title: captureIv!.taskLabel,

          responseSeconds: captureIv!.responseSeconds,

          audioUrl,

          storagePath,

          bucket,

          durationMs: result.durationMs,

          lowMicQuality: result.lowMicQuality,

        };

      };



      const provisional = buildPending(result.url, provisionalPath, "pending");

      setRecordings((prev) => upsertRecording(prev, provisional));

      if (captureStage === "lr_recording") {

        setStage("lr_item_complete");

      } else if (captureStage === "iv_recording") {

        setStage("iv_item_complete");

      }



      try {

        const { audioUrl: storedUrl, storagePath, bucket } =

          await uploadAudioWithMeta(result.blob, {

            allowAnonymous: true,

            fileName: `exam-${testId}-${Date.now()}-${pendingId.slice(0, 8)}.webm`,

          });



        URL.revokeObjectURL(result.url);



        const final = buildPending(storedUrl, storagePath, bucket);

        setRecordings((prev) => upsertRecording(prev, final));



        if (wantScoringRef.current) {

          const cleared = clearPipelineEntry(

            partialResultsRef.current,

            final

          );

          partialResultsRef.current = cleared;

          setPartialResults(cleared);

          pipelineRef.current?.enqueue(final);

        }

      } catch (err) {

        URL.revokeObjectURL(result.url);

        setRecordings((prev) =>

          prev.filter((r) => recordingKey(r) !== recordingKey(provisional))

        );

        if (captureStage === "lr_recording") {

          setStage("lr_recording");

        } else if (captureStage === "iv_recording") {

          setStage("iv_recording");

        }

        recordingArmRef.current = null;



        const message = formatUploadError(

          err instanceof Error ? err.message : "Upload failed."

        );

        setRecordingError(message);

        setErrorMessage(message);

      } finally {

        uploadInFlightRef.current.delete(captureKey);

        setUploadingRecordingKey((key) => (key === captureKey ? null : key));

      }

    },

    [plan.listenRepeat, plan.interviewSession.questions, testId, clearResponseTimer]

  );



  const handleRecordingStart = useCallback(() => {
    responseDeadlineRef.current =
      Date.now() + activeResponseSeconds * 1000;
    setResponseTimeLeft(activeResponseSeconds);
  }, [activeResponseSeconds]);



  const retryCurrentRecording = useCallback(() => {
    setRecordingError(null);
    setErrorMessage(null);
    recordingArmRef.current = null;
    setResponseTimeLeft(activeResponseSeconds);
    responseDeadlineRef.current = null;
    setStartSignal((n) => n + 1);
  }, [activeResponseSeconds]);



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

    if (needsInterviewContinuation(mode, recordings, plan)) {
      return;
    }

    const normalized = getScoringRecordings(recordings, plan, mode);

    const removedDupes = recordings.length - normalized.length;

    if (normalized.length !== recordings.length) {

      setRecordings(normalized);

    }

    if (removedDupes > 0) {

      setSessionNote(

        `Scoring ${normalized.length} question${normalized.length === 1 ? "" : "s"} (${removedDupes} extra duplicate take${removedDupes === 1 ? "" : "s"} ignored).`

      );

    }

    if (wantScoring) {

      void runBatchAnalysis(normalized, { allRecordings: normalized });

    } else {

      finishWithoutScoring(normalized);

    }

  };



  const continueToInterview = () => {

    const nextIvIndex = findResumeIvIndex(recordings, plan);

    setIvIndex(nextIvIndex);

    setQuestionAudioKey((k) => k + 1);

    setStage(

      nextIvIndex === 0 &&

        !recordings.some((r) => r.kind === "interview")

        ? "iv_instruction"

        : "iv_question_listen"

    );

  };



  const interviewStillNeeded = needsInterviewContinuation(

    mode,

    recordings,

    plan

  );



  const pipelineScoredCount = useMemo(

    () => countPipelineScored(partialResults),

    [partialResults]

  );



  const backgroundScoringPending = useMemo(

    () =>

      wantScoring

        ? countPipelineInFlight(partialResults, scoringRecordings)

        : 0,

    [wantScoring, partialResults, scoringRecordings]

  );



  const missingAnalysisCount = results

    ? results.listenRepeat.filter((r) => !r.analysis).length +

      results.interview.filter((r) => !r.analysis).length

    : recordings.length;



  useEffect(() => {

    if (stage !== "results" || !results?.scored) return;

    if (missingAnalysisCount === 0) {

      setErrorMessage(null);

    }

  }, [stage, results, missingAnalysisCount]);



  const scoringIncomplete =

    missingAnalysisCount > 0 && Boolean(errorMessage);



  const showRescoreButton =

    stage === "results" &&

    recordings.length > 0 &&

    (missingAnalysisCount > 0 ||

      !results?.scored);



  const rescoreLabel = !results?.scored

    ? "Score recordings"

    : missingAnalysisCount > 0

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



    setPartialResults(emptyPipelinePartial());

    pipelineRef.current?.reset();

    void runBatchAnalysis(all, { allRecordings: all, mergeFrom: null });

  };



  const recordingStatusRef = useRef(recordingStatus);

  recordingStatusRef.current = recordingStatus;



  useEffect(() => {

    if (!isRecordingStage) {

      activeRecordingKeyRef.current = null;

      recordingArmRef.current = null;

      setRecordingStatus("idle");

      return;

    }



    const armKey =

      stage === "lr_recording" ? `lr-${lrIndex}` : `iv-${ivIndex}`;



    activeRecordingKeyRef.current = armKey;

    responseDeadlineRef.current = null;



    if (recordingArmRef.current === armKey) {

      return;

    }

    recordingArmRef.current = armKey;

    setRecordingError(null);

    setResponseTimeLeft(activeResponseSeconds);

    setStartSignal((n) => n + 1);

  }, [isRecordingStage, stage, lrIndex, ivIndex, activeResponseSeconds]);



  useEffect(() => {

    if (!isRecordingStage || recordingStatus !== "recording") {

      clearResponseTimer();

      return;

    }



    const tick = () => {

      const deadline = responseDeadlineRef.current;

      if (!deadline) return;

      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));

      setResponseTimeLeft(left);

      if (left <= 0) {

        clearResponseTimer();

        const requestStop = () => {

          if (

            recordingStatusRef.current === "recording" ||

            recordingStatusRef.current === "requesting"

          ) {

            setStopSignal((n) => n + 1);

          }

        };

        requestStop();

        if (stopRetryTimerRef.current) {

          clearTimeout(stopRetryTimerRef.current);

        }

        stopRetryTimerRef.current = setTimeout(requestStop, 800);

      }

    };



    tick();

    responseTimerRef.current = setInterval(tick, 250);



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



  const startExam = async () => {

    setMicAccessError(null);

    setMicEnabling(true);

    try {

      await ensureMicrophonePermission({ examMode: true });

    } catch (err) {

      const msg = formatMicrophoneError(err);

      setMicAccessError(msg);

      setErrorMessage(msg);

      return;

    } finally {

      setMicEnabling(false);

    }

    clearExamDraft(testId, mode);

    pipelineRef.current?.reset();

    restoredPipelineEnqueueRef.current = false;

    setSessionNote(null);

    setRecordings([]);

    setResults(null);

    setPartialResults(emptyPipelinePartial());

    setErrorMessage(null);

    setRecordingError(null);

    setLrIndex(0);

    setIvIndex(0);

    if (mode === "interview") {

      setStage("iv_instruction");

    } else {

      setStage("lr_instruction");

    }

  };



  const onLrInstructionContinue = async () => {

    try {

      await ensureMicrophonePermission({ examMode: true });

    } catch (err) {

      setMicAccessError(formatMicrophoneError(err));

      return;

    }

    setStage("lr_listen");

  };



  const onLrAudioEnded = () => {

    if (stage !== "lr_listen") return;

    setStage("lr_recording");

  };



  const onIvInstructionContinue = async () => {

    try {

      await ensureMicrophonePermission({ examMode: true });

    } catch (err) {

      setMicAccessError(formatMicrophoneError(err));

      return;

    }

    setStage("iv_intro");

  };



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

          onExit={() => clearExamDraft(testId, mode)}

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



            <p className="mt-3 text-xs text-slate-500">

              When you click Start, your browser will ask for microphone access.

              Allow it so recording can begin after each prompt.

            </p>

            {micAccessError && (

              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">

                {micAccessError}

              </p>

            )}

            <button

              type="button"

              onClick={() => void startExam()}

              disabled={micEnabling}

              className="mt-6 w-full rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white hover:bg-[#152a45] disabled:opacity-50"

            >

              {micEnabling ? "Requesting microphone…" : "Start when ready"}

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

              onClick={() => void onLrInstructionContinue()}

              className="mt-6 w-full rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white"

            >

              Start when ready

            </button>

            {micAccessError && (

              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">

                {micAccessError}

              </p>

            )}

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

              <section className="space-y-4">

                {isAdmin && (

                  <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

                    <p className="text-xs font-medium uppercase tracking-wide text-slate-500">

                      Original sentence — repeat this

                    </p>

                    <p className="mt-2 text-sm leading-relaxed text-slate-900">

                      {currentLrPrompt.transcript}

                    </p>

                  </div>

                )}

                <div className="rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm">

                  <p className="text-sm font-semibold text-slate-900">

                    Now repeat the prompt aloud.

                  </p>

                  <p className="mt-2 text-xs text-slate-500">

                    Speak clearly and match the original as closely as you can.

                  </p>

                </div>

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

            {uploadingRecordingKey === `lr-${lrIndex}` && (

              <p className="mt-2 text-xs text-slate-400">Uploading response…</p>

            )}

            {wantScoring && backgroundScoringPending > 0 && (

              <p className="mt-2 text-xs text-slate-400">

                Scoring in background ({pipelineScoredCount} of{" "}

                {scoringRecordings.length} done)…

              </p>

            )}

            <button

              type="button"

              onClick={advanceFromLrItem}

              disabled={uploadingRecordingKey === `lr-${lrIndex}`}

              className="mt-6 w-full rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"

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

              onClick={() => void onIvInstructionContinue()}

              className="mt-6 w-full rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white"

            >

              Continue

            </button>

            {micAccessError && (

              <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">

                {micAccessError}

              </p>

            )}

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

          <>

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

            {isAdmin && (

              <div className="mt-4 rounded-xl border border-violet-100 bg-violet-50/60 p-4 shadow-sm">

                <p className="text-xs font-medium uppercase tracking-wide text-violet-700">

                  Example answer (AI sample)

                </p>

                <p className="mt-2 text-sm leading-relaxed text-violet-950">

                  {buildInterviewSampleAnswer(currentIvQuestion)}

                </p>

              </div>

            )}

          </>

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

            {isAdmin && (

              <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 shadow-sm">

                <p className="text-xs font-medium uppercase tracking-wide text-violet-700">

                  Example answer (AI sample)

                </p>

                <p className="mt-2 text-sm leading-relaxed text-violet-950">

                  {buildInterviewSampleAnswer(currentIvQuestion)}

                </p>

              </div>

            )}

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

            {isAdmin && (

              <div className="rounded-xl border border-violet-100 bg-violet-50/60 p-4 shadow-sm">

                <p className="text-xs font-medium uppercase tracking-wide text-violet-700">

                  Example answer (AI sample)

                </p>

                <p className="mt-2 text-sm leading-relaxed text-violet-950">

                  {buildInterviewSampleAnswer(currentIvQuestion)}

                </p>

              </div>

            )}

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

            {uploadingRecordingKey === `iv-${ivIndex}` && (

              <p className="mt-2 text-xs text-slate-400">Uploading response…</p>

            )}

            {wantScoring && backgroundScoringPending > 0 && (

              <p className="mt-2 text-xs text-slate-400">

                Scoring in background ({pipelineScoredCount} of{" "}

                {scoringRecordings.length} done)…

              </p>

            )}

            <button

              type="button"

              onClick={advanceFromIvItem}

              disabled={uploadingRecordingKey === `iv-${ivIndex}`}

              className="mt-6 w-full rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"

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

            {interviewStillNeeded && (

              <p className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900">

                Listen & Repeat is done. Continue to Virtual Interview to finish

                the full test ({scoringRecordings.filter((r) => r.kind === "interview").length} of{" "}

                {plan.interviewSession.questions.length} interview questions recorded).

              </p>

            )}

            {interviewStillNeeded ? (

              <button

                type="button"

                onClick={continueToInterview}

                className="mt-6 w-full rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white"

              >

                Continue to Virtual Interview

              </button>

            ) : wantScoring ? (

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



        {isRecordingStage && (

          <RecordButton

            hideControls

            examMode

            className="sr-only"

            onStatusChange={setRecordingStatus}

            onRecordingStart={handleRecordingStart}

            onRecordingComplete={handleRecordingComplete}

            onError={(err) => {

              setRecordingError(err.message);

            }}

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

            micStream={null}

          />

        )}



        {isRecordingStage &&

          (recordingError || recordingStatus === "error") && (

            <section className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm">

              <p className="font-medium text-red-800">Recording failed</p>

              <p className="mt-1 text-xs text-red-700">

                {recordingError ?? errorMessage}

              </p>

              <button

                type="button"

                onClick={retryCurrentRecording}

                className="mt-3 rounded-lg bg-red-700 px-4 py-2 text-xs font-medium text-white"

              >

                Retry recording

              </button>

            </section>

          )}



        {stage === "analyzing" && (

          <section className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">

            <p className="text-sm font-medium text-slate-900">

              {analyzeProgress.done >= analyzeProgress.total &&

              analyzeProgress.total > 0

                ? "Finalizing your scores…"

                : "Finishing analysis…"}

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

            {micQualityWarning && (

              <section className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">

                <p className="font-medium">Microphone level warning</p>

                <p className="mt-1 text-xs text-amber-800">{micQualityWarning}</p>

              </section>

            )}

            {results.scored && results.summary ? (

              <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

                <h2 className="text-sm font-semibold text-slate-900">Scores</h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-3">

                  {results.summary.listenRepeat.length > 0 && (

                    <div className="rounded-lg bg-slate-50 p-4 text-center">

                      <p className="text-xs text-slate-500">Listen & Repeat</p>

                      <p className="mt-1 text-2xl font-semibold">

                        {formatSpeakingBand(results.summary.listenRepeatAvg)}/{SPEAKING_BAND_MAX}

                      </p>

                    </div>

                  )}

                  {results.summary.interview.length > 0 && (

                    <div className="rounded-lg bg-slate-50 p-4 text-center">

                      <p className="text-xs text-slate-500">Virtual Interview</p>

                      <p className="mt-1 text-2xl font-semibold">

                        {formatSpeakingBand(results.summary.interviewAvg)}/{SPEAKING_BAND_MAX}

                      </p>

                    </div>

                  )}

                  <div className="rounded-lg bg-slate-900 p-4 text-center text-white">

                    <p className="text-xs text-slate-300">Overall Speaking</p>

                    <p className="mt-1 text-2xl font-semibold">

                      {formatSpeakingBand(results.summary.overallScore)}/{SPEAKING_BAND_MAX}

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



            {showRescoreButton && scoringIncomplete && (

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

                        audioUrl={pending.audioUrl}

                        title={`Question ${i + 1} — detailed feedback`}

                      />

                    ) : (

                      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">

                        {(() => {

                          const row = partialResults.listenRepeat.find(

                            (r) => r.pending.promptId === pending.promptId

                          );

                          return row?.error

                            ? formatAnalysisError(row.error)

                            : "Recording saved (no score yet).";

                        })()}

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

                  <div key={pending.questionId}>

                    <p className="mb-2 text-xs text-slate-500">{pending.title}</p>

                    {analysis ? (

                      <InterviewFeedbackPanel

                        question={pending.promptText}

                        analysis={analysis}

                        audioUrl={pending.audioUrl}

                        title={`${pending.title} — detailed feedback`}

                      />

                    ) : (

                      <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">

                        {(() => {

                          const row = partialResults.interview.find(

                            (r) => r.pending.questionId === pending.questionId

                          );

                          return row?.error

                            ? formatAnalysisError(row.error)

                            : "Recording saved (no score yet).";

                        })()}

                      </p>

                    )}

                  </div>

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



        {errorMessage && missingAnalysisCount > 0 && stage !== "results" && (

          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">

            {errorMessage}

          </p>

        )}

      </div>

    </div>

  );

}


