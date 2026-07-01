import type {
  PostSurveyAnswers,
  PreSurveyAnswers,
  SurveyResponseRow,
} from "@/lib/surveys/types";
import {
  labelForOption,
  PAY_OPTIONS,
  POST_COMPLETE_COUNT_OPTIONS,
  POST_CONTINUE_OPTIONS,
  POST_TASK_TYPE_OPTIONS,
  POST_USAGE_PROBLEM_OPTIONS,
  PRE_AI_PRIORITY_OPTIONS,
  PRE_GRADE_OPTIONS,
  PRE_PLATFORM_PROBLEM_OPTIONS,
  PRE_PRACTICE_METHOD_OPTIONS,
  PRE_SELF_STUDY_PROBLEM_OPTIONS,
  PRE_TUTOR_PROBLEM_OPTIONS,
  PRE_WEEKLY_HOURS_OPTIONS,
  RESOLUTION_LEVEL_OPTIONS,
} from "@/lib/surveys/questions";

export interface OptionCount {
  id: string;
  label: string;
  count: number;
  percent: number;
}

export interface SurveyAnalyticsSummary {
  preCount: number;
  postCount: number;
  preResponses: SurveyResponseRow[];
  postResponses: SurveyResponseRow[];
  preBreakdown: Record<string, OptionCount[]>;
  postBreakdown: Record<string, OptionCount[]>;
}

function countOptions(
  rows: SurveyResponseRow[],
  field: string,
  getValues: (answers: Record<string, unknown>) => string[],
  options: readonly { id: string; label: string }[]
): OptionCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const answers = row.answers as Record<string, unknown>;
    for (const id of getValues(answers)) {
      counts.set(id, (counts.get(id) ?? 0) + 1);
    }
  }
  const total = rows.length || 1;
  return options.map((opt) => ({
    id: opt.id,
    label: opt.label,
    count: counts.get(opt.id) ?? 0,
    percent: Math.round(((counts.get(opt.id) ?? 0) / total) * 1000) / 10,
  }));
}

function countSingle(
  rows: SurveyResponseRow[],
  field: string,
  options: readonly { id: string; label: string }[]
): OptionCount[] {
  return countOptions(
    rows,
    field,
    (a) => {
      const v = a[field];
      return typeof v === "string" && v ? [v] : [];
    },
    options
  );
}

function countMulti(
  rows: SurveyResponseRow[],
  field: string,
  options: readonly { id: string; label: string }[]
): OptionCount[] {
  return countOptions(
    rows,
    field,
    (a) => {
      const v = a[field];
      return Array.isArray(v) ? (v as string[]) : [];
    },
    options
  );
}

function countResolution(
  rows: SurveyResponseRow[],
  field: string
): OptionCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const map = (row.answers as PostSurveyAnswers)[
      field as keyof PostSurveyAnswers
    ] as Record<string, string> | undefined;
    if (!map) continue;
    for (const level of Object.values(map)) {
      counts.set(level, (counts.get(level) ?? 0) + 1);
    }
  }
  const total =
    Array.from(counts.values()).reduce((a, b) => a + b, 0) || 1;
  return RESOLUTION_LEVEL_OPTIONS.map((opt) => ({
    id: opt.id,
    label: opt.label,
    count: counts.get(opt.id) ?? 0,
    percent: Math.round(((counts.get(opt.id) ?? 0) / total) * 1000) / 10,
  }));
}

export function buildSurveyAnalytics(
  rows: SurveyResponseRow[]
): SurveyAnalyticsSummary {
  const preResponses = rows.filter((r) => r.surveyType === "pre");
  const postResponses = rows.filter((r) => r.surveyType === "post");

  return {
    preCount: preResponses.length,
    postCount: postResponses.length,
    preResponses,
    postResponses,
    preBreakdown: {
      grade: countSingle(preResponses, "grade", PRE_GRADE_OPTIONS),
      practiceMethods: countMulti(
        preResponses,
        "practiceMethods",
        PRE_PRACTICE_METHOD_OPTIONS
      ),
      weeklySpeakingHours: countSingle(
        preResponses,
        "weeklySpeakingHours",
        PRE_WEEKLY_HOURS_OPTIONS
      ),
      tutorProblems: countMulti(
        preResponses,
        "tutorProblems",
        PRE_TUTOR_PROBLEM_OPTIONS
      ),
      platformProblems: countMulti(
        preResponses,
        "platformProblems",
        PRE_PLATFORM_PROBLEM_OPTIONS
      ),
      selfStudyProblems: countMulti(
        preResponses,
        "selfStudyProblems",
        PRE_SELF_STUDY_PROBLEM_OPTIONS
      ),
      aiAppPriorities: countMulti(
        preResponses,
        "aiAppPriorities",
        PRE_AI_PRIORITY_OPTIONS
      ),
      willingnessToPay: countSingle(
        preResponses,
        "willingnessToPay",
        PAY_OPTIONS
      ),
    },
    postBreakdown: {
      completePracticeCount: countSingle(
        postResponses,
        "completePracticeCount",
        POST_COMPLETE_COUNT_OPTIONS
      ),
      taskTypesUsed: countMulti(
        postResponses,
        "taskTypesUsed",
        POST_TASK_TYPE_OPTIONS
      ),
      usageProblems: countMulti(
        postResponses,
        "usageProblems",
        POST_USAGE_PROBLEM_OPTIONS
      ),
      continueUsing: countSingle(
        postResponses,
        "continueUsing",
        POST_CONTINUE_OPTIONS
      ),
      willingnessToPay: countSingle(
        postResponses,
        "willingnessToPay",
        PAY_OPTIONS
      ),
      tutorResolution: countResolution(
        postResponses,
        "tutorProblemResolution"
      ),
      platformResolution: countResolution(
        postResponses,
        "platformProblemResolution"
      ),
      selfStudyResolution: countResolution(
        postResponses,
        "selfStudyProblemResolution"
      ),
    },
  };
}

export function formatPreAnswerSummary(answers: PreSurveyAnswers): string[] {
  const lines: string[] = [];
  if (answers.grade) {
    lines.push(
      `年级：${labelForOption(PRE_GRADE_OPTIONS, answers.grade)}${answers.gradeOther ? `（${answers.gradeOther}）` : ""}`
    );
  }
  if (answers.practiceMethods?.length) {
    lines.push(
      `练习方式：${answers.practiceMethods.map((id) => labelForOption(PRE_PRACTICE_METHOD_OPTIONS, id)).join("、")}`
    );
  }
  if (answers.weeklySpeakingHours) {
    lines.push(
      `每周口语练习：${labelForOption(PRE_WEEKLY_HOURS_OPTIONS, answers.weeklySpeakingHours)}`
    );
  }
  if (answers.lastSpeakingScore?.trim()) {
    lines.push(`最近 Speaking 成绩：${answers.lastSpeakingScore.trim()}`);
  }
  if (answers.willingnessToPay) {
    const pay =
      answers.willingnessToPay === "custom"
        ? answers.willingnessToPayCustom ?? "自定义"
        : labelForOption(PAY_OPTIONS, answers.willingnessToPay);
    lines.push(`愿付价格（一套题）：${pay}`);
  }
  if (answers.hopedChange?.trim()) {
    lines.push(`希望改变：${answers.hopedChange.trim()}`);
  }
  return lines;
}

export function formatPostAnswerSummary(answers: PostSurveyAnswers): string[] {
  const lines: string[] = [];
  if (answers.completePracticeCount) {
    lines.push(
      `完整练习次数：${labelForOption(POST_COMPLETE_COUNT_OPTIONS, answers.completePracticeCount)}`
    );
  }
  if (answers.continueUsing) {
    lines.push(
      `继续意愿：${labelForOption(POST_CONTINUE_OPTIONS, answers.continueUsing)}`
    );
  }
  if (answers.topImprovement?.trim()) {
    lines.push(`最需改进：${answers.topImprovement.trim()}`);
  }
  return lines;
}
