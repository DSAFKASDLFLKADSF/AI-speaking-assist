"use client";

import { ExamVisualPanel } from "@/components/ExamVisualPanel";
import { PromptAudioPlayer } from "@/components/PromptAudioPlayer";
import type { InterviewPrompt, InterviewSession } from "@/lib/interviewPrompts";
import {
  EXAMINER_IMAGE_URL,
  getInterviewSessionImageUrl,
} from "@/lib/visualAssets";

export interface InterviewQuestionPanelProps {
  question: InterviewPrompt;
  session?: InterviewSession;
  /** Real test: no visible question text */
  examMode: boolean;
  /** Drill only: user-controlled visibility */
  showQuestionText: boolean;
  showExaminerImage: boolean;
  showTopicImage?: boolean;
  autoPlayQuestion?: boolean;
  questionAudioSrc?: string;
  onQuestionAudioEnded?: () => void;
  disabled?: boolean;
  className?: string;
}

export function InterviewQuestionPanel({
  question,
  session,
  examMode,
  showQuestionText,
  showExaminerImage,
  showTopicImage = false,
  autoPlayQuestion = false,
  questionAudioSrc,
  onQuestionAudioEnded,
  disabled = false,
  className = "",
}: InterviewQuestionPanelProps) {
  const topicImage = session
    ? getInterviewSessionImageUrl(session)
    : getInterviewSessionImageUrl({ topic: question.topic, theme: question.theme });

  const revealText = !examMode && showQuestionText;

  return (
    <div className={`${examMode ? "space-y-3" : "space-y-4"} ${className}`}>
      {showExaminerImage && (
        <ExamVisualPanel
          variant="examiner"
          topicImageUrl={EXAMINER_IMAGE_URL}
          compact={examMode}
        />
      )}

      {showTopicImage && !showExaminerImage && (
        <ExamVisualPanel
          variant="topic"
          topicImageUrl={topicImage}
          topicLabel={question.topic}
          themeLabel={session?.theme ?? question.theme}
        />
      )}

      <section
        className={`rounded-xl border border-slate-200 bg-white shadow-sm ${
          examMode ? "p-4" : "p-5 sm:p-6"
        }`}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium text-slate-900">
            {examMode ? `Interview · Q${question.sequence}/4` : "Interview question"}
          </h2>
          {!examMode && (
            <span className="text-xs text-slate-500">
              {question.taskLabel} · {question.responseSeconds}s response
            </span>
          )}
        </div>

        {examMode && (
          <p className="mt-1 text-xs text-slate-500">
            Listen to the question — text hidden, as on the real test
          </p>
        )}

        <PromptAudioPlayer
          text={question.prompt}
          speechKind="interview"
          speechId={question.id}
          audioSrc={questionAudioSrc ?? `/audio/interview/${question.id}.mp3`}
          label="Play question audio"
          autoPlay={autoPlayQuestion}
          examMode={examMode}
          disabled={disabled}
          onEnded={onQuestionAudioEnded}
          className={examMode ? "mt-3" : "mt-4"}
        />

        {revealText && (
          <p className="mt-4 text-base leading-relaxed text-slate-800 border-t border-slate-100 pt-4">
            {question.prompt}
          </p>
        )}
      </section>
    </div>
  );
}
