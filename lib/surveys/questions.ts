export const PRE_SURVEY_COPY = {
  title: "AI TOEFL Speaking 平台使用前测问卷",
  subtitle: "预计填写时间：3–5 分钟。您的真实反馈对产品改进非常重要！",
  thankYou:
    "非常感谢您的填写！您已获得免费使用额度。请您使用平台后填写终测问卷。如果您想持续使用本平台，可参见付费规则，感谢您的支持！",
} as const;

export const POST_SURVEY_COPY = {
  title: "AI TOEFL Speaking 平台使用后测问卷",
  subtitle: "预计填写时间：3 分钟。您积极或消极的真实反馈都对产品改进有帮助！",
} as const;

export const PRE_GRADE_OPTIONS = [
  { id: "g1", label: "高一" },
  { id: "g2", label: "高二" },
  { id: "g3", label: "高三" },
  { id: "gap", label: "Gap Year" },
  { id: "other", label: "其他" },
] as const;

export const PRE_PRACTICE_METHOD_OPTIONS = [
  { id: "tutor", label: "真人老师" },
  { id: "self", label: "自学" },
  { id: "ai", label: "AI 工具" },
] as const;

export const PRE_WEEKLY_HOURS_OPTIONS = [
  { id: "none", label: "几乎不练" },
  { id: "0.5-1", label: "0.5～1 小时" },
  { id: "1-2", label: "1–2 小时" },
  { id: "3-5", label: "3–5 小时" },
  { id: "5+", label: "5 小时以上" },
] as const;

export const PRE_TUTOR_PROBLEM_OPTIONS = [
  { id: "fixed_schedule", label: "上课时间固定，老师无法随时陪练" },
  { id: "delayed_feedback", label: "课后做完练习后不能立即获得老师反馈" },
  { id: "low_frequency", label: "上课间隔太长，难以获得高频练习" },
  { id: "expensive", label: "价格高" },
  { id: "vague_feedback", label: "反馈较为笼统" },
  { id: "other", label: "其他" },
  { id: "never", label: "没用过" },
] as const;

export const PRE_PLATFORM_PROBLEM_OPTIONS = [
  { id: "score_only", label: "只会评分" },
  { id: "vague_feedback", label: "反馈笼统，不知道如何改进" },
  { id: "quota", label: "评分和个性化反馈功能有额度限制" },
  { id: "not_exam_like", label: "不够像真实考试" },
  { id: "no_progress", label: "无法持续追踪进步" },
  { id: "other", label: "其他" },
  { id: "never", label: "没用过" },
] as const;

export const PRE_SELF_STUDY_PROBLEM_OPTIONS = [
  { id: "no_feedback", label: "无反馈，不知道提升方向" },
  { id: "afraid", label: "不敢开口" },
  { id: "no_pressure", label: "无法模拟考试压力" },
  { id: "low_efficiency", label: "练习效率低" },
  { id: "few_mocks", label: "模考资源少" },
  { id: "other", label: "其他" },
  { id: "never", label: "没用过" },
] as const;

export const PRE_AI_PRIORITY_OPTIONS = [
  { id: "fast_feedback", label: "反馈速度快" },
  {
    id: "actionable_feedback",
    label: "反馈具体，并告诉我如何修改回答",
  },
  { id: "exam_realistic", label: "符合真实 TOEFL 题型与考试节奏" },
  {
    id: "beginner_aids",
    label:
      "为入门考生设计了辅助练习功能（比如每道题延长准备时间，有思路提示功能）",
  },
  { id: "accurate", label: "评分和反馈精准可信" },
  { id: "cheap", label: "价格便宜" },
  { id: "progress", label: "能够追踪长期进步" },
  { id: "stable", label: "操作简单且技术稳定" },
  { id: "other", label: "其他" },
] as const;

export const PAY_OPTIONS = [
  { id: "0", label: "0 元" },
  { id: "0.5", label: "0.5 元" },
  { id: "1", label: "1 元" },
  { id: "2", label: "2 元" },
  { id: "3", label: "3 元" },
  { id: "custom", label: "自定义" },
] as const;

export const POST_COMPLETE_COUNT_OPTIONS = [
  { id: "1", label: "1 次" },
  { id: "2-3", label: "2—3 次" },
  { id: "4+", label: "4 次及以上" },
  { id: "none", label: "没有完成完整练习" },
] as const;

export const POST_TASK_TYPE_OPTIONS = [
  { id: "interview", label: "Virtual Interview" },
  { id: "listen_repeat", label: "Listen & Repeat" },
  { id: "none", label: "没有完成完整练习" },
] as const;

export const POST_USAGE_PROBLEM_OPTIONS = [
  { id: "record_fail", label: "录音失败" },
  { id: "upload_fail", label: "音频无法提交" },
  { id: "asr_bad", label: "语音识别结果不准确" },
  { id: "score_fail", label: "评分或反馈生成失败" },
  { id: "display_fail", label: "反馈出现乱码或无法显示" },
  { id: "slow", label: "等待反馈的时间过长" },
  { id: "unclear_ui", label: "页面或操作流程不清楚" },
  { id: "none", label: "无" },
  { id: "other", label: "其他" },
] as const;

export const POST_TUTOR_RESOLUTION_ITEMS = [
  { id: "fixed_schedule", label: "上课时间固定，老师无法随时陪练" },
  { id: "delayed_feedback", label: "课后做完练习后不能立即获得老师反馈" },
  { id: "low_frequency", label: "上课间隔太长，难以获得高频练习" },
  { id: "vague_feedback", label: "反馈较为笼统" },
  { id: "expensive", label: "价格高" },
] as const;

export const POST_PLATFORM_RESOLUTION_ITEMS = [
  { id: "quota", label: "评分和个性化反馈功能有额度限制" },
  { id: "score_only", label: "只会评分" },
  {
    id: "vague_feedback",
    label: "反馈比较笼统，不知道下一步应该怎样改进",
  },
  { id: "no_progress", label: "无法持续追踪进步" },
  { id: "other", label: "其他" },
] as const;

export const POST_SELF_STUDY_RESOLUTION_ITEMS = [
  { id: "no_feedback", label: "无反馈，不知道提升方向" },
  { id: "afraid", label: "不敢开口" },
  { id: "no_pressure", label: "无法模拟考试压力" },
  { id: "low_efficiency", label: "练习效率低" },
  { id: "few_mocks", label: "模考资源少" },
  { id: "other", label: "其他" },
] as const;

export const RESOLUTION_LEVEL_OPTIONS = [
  { id: "resolved", label: "解决" },
  { id: "partial", label: "部分解决" },
  { id: "unresolved", label: "未解决" },
  { id: "na", label: "不适用" },
] as const;

export const POST_CONTINUE_OPTIONS = [
  { id: "very", label: "很愿意" },
  { id: "yes", label: "愿意" },
  { id: "unsure", label: "不确定" },
  { id: "no", label: "不愿意" },
] as const;

export function labelForOption(
  options: readonly { id: string; label: string }[],
  id: string
): string {
  return options.find((o) => o.id === id)?.label ?? id;
}
