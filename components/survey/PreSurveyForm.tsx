"use client";

import { useState } from "react";
import type { PreSurveyAnswers } from "@/lib/surveys/types";
import {
  PAY_OPTIONS,
  PRE_AI_PRIORITY_OPTIONS,
  PRE_GRADE_OPTIONS,
  PRE_PLATFORM_PROBLEM_OPTIONS,
  PRE_PRACTICE_METHOD_OPTIONS,
  PRE_SELF_STUDY_PROBLEM_OPTIONS,
  PRE_SURVEY_COPY,
  PRE_TUTOR_PROBLEM_OPTIONS,
  PRE_WEEKLY_HOURS_OPTIONS,
} from "@/lib/surveys/questions";
import {
  SurveyOption,
  SurveySection,
  SurveyTextArea,
  SurveyTextInput,
  toggleInList,
} from "@/components/survey/SurveyFields";

export interface PreSurveyFormProps {
  onSubmit: (answers: PreSurveyAnswers) => Promise<void>;
  submitting?: boolean;
}

export function PreSurveyForm({ onSubmit, submitting }: PreSurveyFormProps) {
  const [answers, setAnswers] = useState<PreSurveyAnswers>({});
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (patch: Partial<PreSurveyAnswers>) =>
    setAnswers((prev) => ({ ...prev, ...patch }));

  const handleSubmit = async () => {
    setError(null);
    if (!answers.grade) {
      setError("请选择年级。");
      return;
    }
    if (!answers.practiceMethods?.length) {
      setError("请选择至少一种练习方式。");
      return;
    }
    if (!answers.weeklySpeakingHours) {
      setError("请选择每周口语练习时长。");
      return;
    }
    if (!answers.willingnessToPay) {
      setError("请选择愿意支付的价格。");
      return;
    }
    await onSubmit(answers);
    setDone(true);
  };

  if (done) {
    return (
      <div className="space-y-3 py-4 text-center">
        <p className="text-sm font-medium text-emerald-800">提交成功</p>
        <p className="text-sm leading-relaxed text-slate-600">
          {PRE_SURVEY_COPY.thankYou}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SurveySection title="1. 你目前的年级是？" required>
        <div className="grid gap-2 sm:grid-cols-2">
          {PRE_GRADE_OPTIONS.map((opt) => (
            <SurveyOption
              key={opt.id}
              type="radio"
              name="grade"
              label={opt.label}
              checked={answers.grade === opt.id}
              onChange={() => set({ grade: opt.id })}
            />
          ))}
        </div>
        {answers.grade === "other" && (
          <SurveyTextInput
            value={answers.gradeOther ?? ""}
            onChange={(v) => set({ gradeOther: v })}
            placeholder="请说明"
          />
        )}
      </SurveySection>

      <SurveySection title="2. 你目前主要如何练习托福口语？（可多选）" required>
        <div className="grid gap-2">
          {PRE_PRACTICE_METHOD_OPTIONS.map((opt) => (
            <SurveyOption
              key={opt.id}
              label={opt.label}
              checked={answers.practiceMethods?.includes(opt.id) ?? false}
              onChange={() =>
                set({
                  practiceMethods: toggleInList(
                    answers.practiceMethods ?? [],
                    opt.id
                  ),
                })
              }
            />
          ))}
        </div>
      </SurveySection>

      <SurveySection
        title="3. 在备考期间，你平均每周练习 speaking 多久？"
        required
      >
        <div className="grid gap-2">
          {PRE_WEEKLY_HOURS_OPTIONS.map((opt) => (
            <SurveyOption
              key={opt.id}
              type="radio"
              name="weeklyHours"
              label={opt.label}
              checked={answers.weeklySpeakingHours === opt.id}
              onChange={() => set({ weeklySpeakingHours: opt.id })}
            />
          ))}
        </div>
        <SurveyTextInput
          value={answers.lastSpeakingScore ?? ""}
          onChange={(v) => set({ lastSpeakingScore: v })}
          placeholder="如参加过考试，可选填最近一次 Speaking 成绩"
        />
      </SurveySection>

      <SurveySection title="4. 你觉得真人教学最大的问题是什么？（可多选）">
        <div className="grid gap-2">
          {PRE_TUTOR_PROBLEM_OPTIONS.map((opt) => (
            <SurveyOption
              key={opt.id}
              label={opt.label}
              checked={answers.tutorProblems?.includes(opt.id) ?? false}
              onChange={() =>
                set({
                  tutorProblems: toggleInList(
                    answers.tutorProblems ?? [],
                    opt.id
                  ),
                })
              }
            />
          ))}
        </div>
        {answers.tutorProblems?.includes("other") && (
          <SurveyTextInput
            value={answers.tutorProblemsOther ?? ""}
            onChange={(v) => set({ tutorProblemsOther: v })}
            placeholder="其他说明"
          />
        )}
      </SurveySection>

      <SurveySection title="5. 你觉得目前口语练习平台最大的问题是什么？（可多选）">
        <div className="grid gap-2">
          {PRE_PLATFORM_PROBLEM_OPTIONS.map((opt) => (
            <SurveyOption
              key={opt.id}
              label={opt.label}
              checked={answers.platformProblems?.includes(opt.id) ?? false}
              onChange={() =>
                set({
                  platformProblems: toggleInList(
                    answers.platformProblems ?? [],
                    opt.id
                  ),
                })
              }
            />
          ))}
        </div>
        {answers.platformProblems?.includes("other") && (
          <SurveyTextInput
            value={answers.platformProblemsOther ?? ""}
            onChange={(v) => set({ platformProblemsOther: v })}
            placeholder="其他说明"
          />
        )}
      </SurveySection>

      <SurveySection title="6. 你觉得自学口语最大的问题是什么？（可多选）">
        <div className="grid gap-2">
          {PRE_SELF_STUDY_PROBLEM_OPTIONS.map((opt) => (
            <SurveyOption
              key={opt.id}
              label={opt.label}
              checked={answers.selfStudyProblems?.includes(opt.id) ?? false}
              onChange={() =>
                set({
                  selfStudyProblems: toggleInList(
                    answers.selfStudyProblems ?? [],
                    opt.id
                  ),
                })
              }
            />
          ))}
        </div>
        {answers.selfStudyProblems?.includes("other") && (
          <SurveyTextInput
            value={answers.selfStudyProblemsOther ?? ""}
            onChange={(v) => set({ selfStudyProblemsOther: v })}
            placeholder="其他说明"
          />
        )}
      </SurveySection>

      <SurveySection title="7. 选择 AI 口语 app 时，你最看重哪些方面？（不超过 5 项）">
        <div className="grid gap-2">
          {PRE_AI_PRIORITY_OPTIONS.map((opt) => (
            <SurveyOption
              key={opt.id}
              label={opt.label}
              checked={answers.aiAppPriorities?.includes(opt.id) ?? false}
              onChange={() =>
                set({
                  aiAppPriorities: toggleInList(
                    answers.aiAppPriorities ?? [],
                    opt.id,
                    5
                  ),
                })
              }
            />
          ))}
        </div>
        {answers.aiAppPriorities?.includes("other") && (
          <SurveyTextInput
            value={answers.aiAppPrioritiesOther ?? ""}
            onChange={(v) => set({ aiAppPrioritiesOther: v })}
            placeholder="其他说明"
          />
        )}
      </SurveySection>

      <SurveySection
        title="8. 你愿意为我们 AI 托福口语练习网站上一套题的评分+反馈付多少钱？"
        required
      >
        <div className="grid gap-2 sm:grid-cols-3">
          {PAY_OPTIONS.map((opt) => (
            <SurveyOption
              key={opt.id}
              type="radio"
              name="pay"
              label={opt.label}
              checked={answers.willingnessToPay === opt.id}
              onChange={() => set({ willingnessToPay: opt.id })}
            />
          ))}
        </div>
        {answers.willingnessToPay === "custom" && (
          <SurveyTextInput
            value={answers.willingnessToPayCustom ?? ""}
            onChange={(v) => set({ willingnessToPayCustom: v })}
            placeholder="自定义金额（元）"
          />
        )}
      </SurveySection>

      <SurveySection title="9. 如果你可以改变现有 TOEFL Speaking 学习方式中的一件事，你最希望改变什么？">
        <SurveyTextArea
          value={answers.hopedChange ?? ""}
          onChange={(v) => set({ hopedChange: v })}
          placeholder="选填"
        />
      </SurveySection>

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <button
        type="button"
        disabled={submitting}
        onClick={() => void handleSubmit()}
        className="w-full rounded-lg bg-[#1e3a5f] py-3 text-sm font-medium text-white disabled:opacity-50"
      >
        {submitting ? "提交中…" : "提交前测问卷"}
      </button>
    </div>
  );
}
