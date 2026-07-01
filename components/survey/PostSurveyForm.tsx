"use client";

import { useState } from "react";
import type { PostSurveyAnswers, ResolutionLevel } from "@/lib/surveys/types";
import {
  PAY_OPTIONS,
  POST_COMPLETE_COUNT_OPTIONS,
  POST_CONTINUE_OPTIONS,
  POST_PLATFORM_RESOLUTION_ITEMS,
  POST_SELF_STUDY_RESOLUTION_ITEMS,
  POST_SURVEY_COPY,
  POST_TASK_TYPE_OPTIONS,
  POST_TUTOR_RESOLUTION_ITEMS,
  POST_USAGE_PROBLEM_OPTIONS,
  RESOLUTION_LEVEL_OPTIONS,
} from "@/lib/surveys/questions";
import {
  SurveyOption,
  SurveySection,
  SurveyTextArea,
  SurveyTextInput,
  toggleInList,
} from "@/components/survey/SurveyFields";

function ResolutionMatrix({
  title,
  items,
  values,
  onChange,
}: {
  title: string;
  items: readonly { id: string; label: string }[];
  values: Record<string, ResolutionLevel | "na">;
  onChange: (id: string, level: ResolutionLevel | "na") => void;
}) {
  return (
    <SurveySection title={title}>
      <div className="space-y-4">
        {items.map((item) => (
          <div key={item.id} className="rounded-lg border border-slate-100 p-3">
            <p className="mb-2 text-sm text-slate-800">{item.label}</p>
            <div className="flex flex-wrap gap-2">
              {RESOLUTION_LEVEL_OPTIONS.map((level) => (
                <label
                  key={level.id}
                  className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${
                    values[item.id] === level.id
                      ? "border-[#1e3a5f] bg-[#1e3a5f] text-white"
                      : "border-slate-200 text-slate-600"
                  }`}
                >
                  <input
                    type="radio"
                    className="sr-only"
                    name={`${title}-${item.id}`}
                    checked={values[item.id] === level.id}
                    onChange={() =>
                      onChange(item.id, level.id as ResolutionLevel | "na")
                    }
                  />
                  {level.label}
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>
    </SurveySection>
  );
}

export interface PostSurveyFormProps {
  onSubmit: (answers: PostSurveyAnswers) => Promise<void>;
  submitting?: boolean;
}

export function PostSurveyForm({ onSubmit, submitting }: PostSurveyFormProps) {
  const [answers, setAnswers] = useState<PostSurveyAnswers>({
    tutorProblemResolution: {},
    platformProblemResolution: {},
    selfStudyProblemResolution: {},
  });
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const set = (patch: Partial<PostSurveyAnswers>) =>
    setAnswers((prev) => ({ ...prev, ...patch }));

  const setResolution = (
    field:
      | "tutorProblemResolution"
      | "platformProblemResolution"
      | "selfStudyProblemResolution",
    id: string,
    level: ResolutionLevel | "na"
  ) => {
    set({
      [field]: { ...(answers[field] ?? {}), [id]: level },
    });
  };

  const handleSubmit = async () => {
    setError(null);
    if (!answers.completePracticeCount) {
      setError("请回答完整练习次数。");
      return;
    }
    if (!answers.continueUsing) {
      setError("请选择是否愿意继续使用。");
      return;
    }
    await onSubmit(answers);
    setDone(true);
  };

  if (done) {
    return (
      <div className="space-y-3 py-4 text-center">
        <p className="text-sm font-medium text-emerald-800">感谢您的反馈！</p>
        <p className="text-sm text-slate-600">{POST_SURVEY_COPY.subtitle}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SurveySection
        title="1. 你完成了多少次完整练习？（完成录音并收到评分或反馈）"
        required
      >
        <div className="grid gap-2">
          {POST_COMPLETE_COUNT_OPTIONS.map((opt) => (
            <SurveyOption
              key={opt.id}
              type="radio"
              name="completeCount"
              label={opt.label}
              checked={answers.completePracticeCount === opt.id}
              onChange={() => set({ completePracticeCount: opt.id })}
            />
          ))}
        </div>
      </SurveySection>

      <SurveySection title="2. 你使用过哪些题型？（可多选）">
        <div className="grid gap-2">
          {POST_TASK_TYPE_OPTIONS.map((opt) => (
            <SurveyOption
              key={opt.id}
              label={opt.label}
              checked={answers.taskTypesUsed?.includes(opt.id) ?? false}
              onChange={() =>
                set({
                  taskTypesUsed: toggleInList(
                    answers.taskTypesUsed ?? [],
                    opt.id
                  ),
                })
              }
            />
          ))}
        </div>
      </SurveySection>

      <SurveySection title="3. 你在使用过程中遇到了哪些问题？（可多选）">
        <div className="grid gap-2">
          {POST_USAGE_PROBLEM_OPTIONS.map((opt) => (
            <SurveyOption
              key={opt.id}
              label={opt.label}
              checked={answers.usageProblems?.includes(opt.id) ?? false}
              onChange={() =>
                set({
                  usageProblems: toggleInList(
                    answers.usageProblems ?? [],
                    opt.id
                  ),
                })
              }
            />
          ))}
        </div>
        {answers.usageProblems?.includes("other") && (
          <SurveyTextInput
            value={answers.usageProblemsOther ?? ""}
            onChange={(v) => set({ usageProblemsOther: v })}
            placeholder="其他问题"
          />
        )}
      </SurveySection>

      <ResolutionMatrix
        title="4. 本网站有没有帮你解决以下真人教学的问题？"
        items={POST_TUTOR_RESOLUTION_ITEMS}
        values={answers.tutorProblemResolution ?? {}}
        onChange={(id, level) =>
          setResolution("tutorProblemResolution", id, level)
        }
      />

      <ResolutionMatrix
        title="5. 本网站有没有帮你解决现有口语备考 APP 或网站的问题？"
        items={POST_PLATFORM_RESOLUTION_ITEMS}
        values={answers.platformProblemResolution ?? {}}
        onChange={(id, level) =>
          setResolution("platformProblemResolution", id, level)
        }
      />

      <ResolutionMatrix
        title="6. 本网站有没有帮你解决自学托福口语的问题？"
        items={POST_SELF_STUDY_RESOLUTION_ITEMS}
        values={answers.selfStudyProblemResolution ?? {}}
        onChange={(id, level) =>
          setResolution("selfStudyProblemResolution", id, level)
        }
      />

      <SurveySection title="7. 你之后是否愿意继续使用本平台？" required>
        <div className="grid gap-2 sm:grid-cols-2">
          {POST_CONTINUE_OPTIONS.map((opt) => (
            <SurveyOption
              key={opt.id}
              type="radio"
              name="continue"
              label={opt.label}
              checked={answers.continueUsing === opt.id}
              onChange={() => set({ continueUsing: opt.id })}
            />
          ))}
        </div>
      </SurveySection>

      <SurveySection title="8. 你愿意为一套题的评分+个性化反馈服务支付多少钱？">
        <div className="grid gap-2 sm:grid-cols-3">
          {PAY_OPTIONS.map((opt) => (
            <SurveyOption
              key={opt.id}
              type="radio"
              name="postPay"
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

      <SurveySection title="9. 平台最需要改进的一点是什么？（选填）">
        <SurveyTextArea
          value={answers.topImprovement ?? ""}
          onChange={(v) => set({ topImprovement: v })}
          placeholder="一句话即可"
          rows={2}
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
        {submitting ? "提交中…" : "提交后测问卷"}
      </button>
    </div>
  );
}
