"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ComparisonText, type ComparisonWord } from "@/components/ComparisonText";
import { FeedbackCard, type FeedbackSection } from "@/components/FeedbackCard";
import { ListenRepeatVisualPanel } from "@/components/ListenRepeatVisualPanel";
import { PracticeFormatSelector } from "@/components/PracticeFormatSelector";
import {
  RecordButton,
  type RecordingResult,
  type RecordingStatus,
} from "@/components/RecordButton";
import { ScoreCard, type ListenRepeatScore } from "@/components/ScoreCard";
import { Timer } from "@/components/Timer";
import { Waveform } from "@/components/Waveform";
import { analyzeSpeech } from "@/lib/analyzeSpeech";
import { saveListenRepeatLocalHistory } from "@/lib/localHistory";
import {
  getListenRepeatSectionPrompts,
  LISTEN_REPEAT_SECTION_COUNT,
  type PracticeFormat,
} from "@/lib/practiceConfig";
import {
  DEFAULT_PROMPT_ID,
  getPromptById,
  type ListenRepeatPrompt,
} from "@/lib/prompts";
import { uploadAudioWithMeta } from "@/lib/uploadAudio";
import { MOCK_EXAM_RESPONSE_SECONDS } from "@/lib/mockExamConfig";

const singlePrompt = getPromptById(DEFAULT_PROMPT_ID)!;
const sectionPrompts = getListenRepeatSectionPrompts();

type LrPhase =
  | "ready"
  | "listen"
  | "recording"
  | "uploading"
  | "analyzing"
  | "done"
  | "section_analyzing"
  | "section_done";

interface AnalysisResult {
  transcript: string;
  score: ListenRepeatScore;
  scoreSummary: string;
  words: ComparisonWord[];
  feedback: {
    summary: string;
    sections: FeedbackSection[];
  };
}

interface SectionItemResult {
  prompt: ListenRepeatPrompt;
  analysis: AnalysisResult;
}

interface PendingLr {
  prompt: ListenRepeatPrompt;
  audioUrl: string;
  storagePath: string;
}

export default function ListenRepeatPage() {
  const [practiceFormat, setPracticeFormat] = useState<PracticeFormat>("section");
  const [showTranscript, setShowTranscript] = useState(true);
  const [promptIndex, setPromptIndex] = useState(0);
  const [phase, setPhase] = useState<LrPhase>("ready");
  const [recordingStatus, setRecordingStatus] = useState<RecordingStatus>("idle");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [sectionResults, setSectionResults] = useState<SectionItemResult[]>([]);
  const [analyzeProgress, setAnalyzeProgress] = useState({ done: 0, total: 0 });
  const [startSignal, setStartSignal] = useState(0);
  const [responseTimeLeft, setResponseTimeLeft] = useState(
    MOCK_EXAM_RESPONSE_SECONDS
  );

  const localBlobUrlRef = useRef<string | null>(null);
  const processingRef = useRef(false);
  const pendingSectionRef = useRef<PendingLr[]>([]);

  const isSectionMode = practiceFormat === "section";
  const examMode = isSectionMode || !showTranscript;
  const activePrompt = isSectionMode
    ? sectionPrompts[promptIndex]!
    : singlePrompt;
  const recording = recordingStatus === "recording";
  const isProcessing =
    phase === "uploading" ||
    phase === "analyzing" ||
    phase === "section_analyzing";

  const revokeLocalBlobUrl = useCallback(() => {
    if (localBlobUrlRef.current) {
      URL.revokeObjectURL(localBlobUrlRef.current);
      localBlobUrlRef.current = null;
    }
  }, []);

  const resetAll = useCallback(() => {
    revokeLocalBlobUrl();
    setAudioUrl(null);
    setAnalysis(null);
    setSectionResults([]);
    setErrorMessage(null);
    setPromptIndex(0);
    processingRef.current = false;
    pendingSectionRef.current = [];
  }, [revokeLocalBlobUrl]);

  const runSectionBatch = useCallback(async (pending: PendingLr[]) => {
    setPhase("section_analyzing");
    setAnalyzeProgress({ done: 0, total: pending.length });
    const results: SectionItemResult[] = [];

    try {
      for (let i = 0; i < pending.length; i += 1) {
        const item = pending[i]!;
        const response = await analyzeSpeech({
          audioUrl: item.audioUrl,
          storagePath: item.storagePath,
          original: item.prompt.transcript,
          promptId: item.prompt.id,
        });
        const mapped: AnalysisResult = {
          transcript: response.transcript,
          score: response.score,
          scoreSummary: response.scoreSummary,
          words: response.words,
          feedback: response.feedback,
        };
        results.push({ prompt: item.prompt, analysis: mapped });
        saveListenRepeatLocalHistory({
          promptId: item.prompt.id,
          title: item.prompt.title,
          score: response.score,
          scoreSummary: response.scoreSummary,
          feedbackSummary: response.feedback.summary,
        });
        setAnalyzeProgress({ done: i + 1, total: pending.length });
      }
      setSectionResults(results);
      setPhase("section_done");
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Section analysis failed."
      );
      setPhase("section_done");
    } finally {
      processingRef.current = false;
    }
  }, []);

  const handleRecordingComplete = useCallback(
    async (result: RecordingResult) => {
      if (processingRef.current) return;
      processingRef.current = true;
      revokeLocalBlobUrl();
      localBlobUrlRef.current = result.url;
      setAudioUrl(result.url);
      setAnalysis(null);
      setErrorMessage(null);

      try {
        setPhase("uploading");
        const { audioUrl: storedUrl, storagePath } = await uploadAudioWithMeta(
          result.blob,
          { allowAnonymous: true, fileName: `${activePrompt.id}.webm` }
        );
        setAudioUrl(storedUrl);
        revokeLocalBlobUrl();

        if (isSectionMode) {
          const pending: PendingLr = {
            prompt: activePrompt,
            audioUrl: storedUrl,
            storagePath,
          };
          const all = [...pendingSectionRef.current, pending];
          pendingSectionRef.current = all;

          if (promptIndex >= sectionPrompts.length - 1) {
            await runSectionBatch(all);
          } else {
            processingRef.current = false;
            setPromptIndex((i) => i + 1);
            setPhase("listen");
          }
          return;
        }

        setPhase("analyzing");
        const response = await analyzeSpeech({
          audioUrl: storedUrl,
          storagePath,
          original: singlePrompt.transcript,
          promptId: DEFAULT_PROMPT_ID,
        });
        setAnalysis({
          transcript: response.transcript,
          score: response.score,
          scoreSummary: response.scoreSummary,
          words: response.words,
          feedback: response.feedback,
        });
        setPhase("done");
        saveListenRepeatLocalHistory({
          promptId: DEFAULT_PROMPT_ID,
          title: singlePrompt.title,
          score: response.score,
          scoreSummary: response.scoreSummary,
          feedbackSummary: response.feedback.summary,
        });
      } catch (err) {
        setPhase("done");
        setErrorMessage(
          err instanceof Error ? err.message : "Something went wrong."
        );
      } finally {
        if (!isSectionMode) processingRef.current = false;
      }
    },
    [
      activePrompt,
      isSectionMode,
      promptIndex,
      revokeLocalBlobUrl,
      runSectionBatch,
    ]
  );

  const handleRecordingStart = useCallback(() => {
    revokeLocalBlobUrl();
    setAudioUrl(null);
    setAnalysis(null);
    setErrorMessage(null);
  }, [revokeLocalBlobUrl]);

  const beginRecording = useCallback(() => {
    setResponseTimeLeft(MOCK_EXAM_RESPONSE_SECONDS);
    setStartSignal((n) => n + 1);
  }, []);

  useEffect(() => {
    if (phase !== "recording" || !isSectionMode) return;
    const id = setInterval(() => {
      setResponseTimeLeft((prev) => (prev <= 1 ? 0 : prev - 1));
    }, 1000);
    return () => clearInterval(id);
  }, [phase, isSectionMode]);

  const startSection = () => {
    resetAll();
    pendingSectionRef.current = [];
    setPromptIndex(0);
    setPhase("listen");
  };

  const startSingle = () => {
    resetAll();
    setPhase("listen");
  };

  const statusLabel =
    phase === "uploading"
      ? "Uploading…"
      : phase === "analyzing" || phase === "section_analyzing"
        ? "Analyzing…"
        : phase === "recording"
          ? "Recording your response…"
          : phase === "listen"
            ? "Listen to the model, then record"
            : "Configure format and start";

  const sectionAvg =
    sectionResults.length > 0
      ? sectionResults.reduce((s, r) => s + r.analysis.score, 0) /
        sectionResults.length
      : 0;

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-3xl px-4 pb-16 pt-28 sm:px-6 md:pt-24 lg:px-8 lg:pt-28">
        <header className="mb-8">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-slate-500">
            Listen & Repeat
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900 sm:text-3xl">
            {isSectionMode ? "Section practice" : activePrompt.title}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            {isSectionMode
              ? `${LISTEN_REPEAT_SECTION_COUNT} prompts per run · topic visuals · transcript hidden during the section`
              : "Listen to the model, then record your version."}
          </p>
        </header>

        <div className="space-y-6">
          <PracticeFormatSelector
            value={practiceFormat}
            onChange={setPracticeFormat}
            disabled={phase !== "ready"}
            sectionDescription={`All ${LISTEN_REPEAT_SECTION_COUNT} prompts in one sitting — like the Listen & Repeat section of the mock exam.`}
            singleDescription="One prompt with immediate scoring and optional transcript."
          />

          {phase === "ready" && !isSectionMode && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-sm font-medium text-slate-900">
                    Show transcript
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Hide during practice to rely on listening only
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={showTranscript}
                  onClick={() => setShowTranscript((v) => !v)}
                  className={`relative h-6 w-11 shrink-0 rounded-full ${
                    showTranscript ? "bg-slate-900" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                      showTranscript ? "translate-x-5" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>
            </section>
          )}

          {phase !== "ready" && phase !== "section_done" && (
            <>
              {isSectionMode && (
                <p className="text-xs font-medium text-slate-500">
                  Prompt {promptIndex + 1} of {sectionPrompts.length}
                </p>
              )}
              <ListenRepeatVisualPanel
                prompt={activePrompt}
                examMode={examMode}
                showTranscript={showTranscript}
              />
            </>
          )}

          {(phase === "listen" || phase === "recording") && (
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              {phase === "listen" && (
                <button
                  type="button"
                  onClick={() => {
                    setPhase("recording");
                    beginRecording();
                  }}
                  className="mb-4 w-full rounded-full bg-slate-900 py-3 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Ready to record
                </button>
              )}
              {phase === "recording" && isSectionMode && (
                <Timer
                  value={responseTimeLeft}
                  totalSeconds={MOCK_EXAM_RESPONSE_SECONDS}
                  mode="response"
                  label="Response time"
                  sublabel="Record your repetition"
                  warningThreshold={10}
                />
              )}
              <h2 className="text-sm font-medium text-slate-900">
                Your recording
              </h2>
              <p className="mt-1 text-xs text-slate-500">{statusLabel}</p>
              <Waveform
                url={audioUrl}
                active={recording}
                className="mt-5"
              />
              <div className="mt-5 flex justify-center">
                <RecordButton
                  onRecordingStart={handleRecordingStart}
                  onRecordingComplete={handleRecordingComplete}
                  onStatusChange={setRecordingStatus}
                  startSignal={startSignal}
                  disabled={isProcessing || phase === "listen"}
                />
              </div>
            </section>
          )}

          {phase === "ready" && (
            <button
              type="button"
              onClick={isSectionMode ? startSection : startSingle}
              className="w-full rounded-full bg-slate-900 py-3 text-sm font-medium text-white hover:bg-slate-800"
            >
              {isSectionMode ? "Start section mock" : "Start practice"}
            </button>
          )}

          {(phase === "uploading" ||
            phase === "analyzing" ||
            phase === "section_analyzing") && (
            <p className="text-center text-sm text-slate-500">
              {phase === "section_analyzing"
                ? `Analyzing ${analyzeProgress.done}/${analyzeProgress.total}…`
                : statusLabel}
            </p>
          )}

          {errorMessage && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {errorMessage}
            </p>
          )}

          {!isSectionMode && analysis && phase === "done" && (
            <>
              <ScoreCard score={analysis.score} feedback={analysis.scoreSummary} />
              <FeedbackCard
                summary={analysis.feedback.summary}
                sections={analysis.feedback.sections}
              />
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <ComparisonText
                  original={singlePrompt.transcript}
                  user={analysis.transcript}
                  words={analysis.words}
                />
              </section>
            </>
          )}

          {isSectionMode && phase === "section_done" && sectionResults.length > 0 && (
            <>
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <h2 className="text-sm font-medium text-slate-900">
                  Section average
                </h2>
                <p className="mt-2 text-2xl font-semibold text-slate-900">
                  {sectionAvg.toFixed(1)} / 5
                </p>
              </section>
              {sectionResults.map(({ prompt, analysis: a }) => (
                <div key={prompt.id} className="space-y-3">
                  <p className="text-sm font-medium text-slate-800">
                    {prompt.title}
                  </p>
                  <ScoreCard score={a.score} feedback={a.scoreSummary} />
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </main>
  );
}
