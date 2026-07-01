"use client";

import type {
  PythonBenchmarkInterviewResult,
  PythonBenchmarkListenRepeatResult,
} from "@/lib/pythonSpeechApi";

export interface BenchmarkScoreResultProps {
  kind: "interview" | "listen_repeat";
  result: PythonBenchmarkInterviewResult | PythonBenchmarkListenRepeatResult;
}

function wordStats(
  words: PythonBenchmarkListenRepeatResult["words"]
): { correct: number; missing: number; replacement: number; total: number } {
  const list = words ?? [];
  return {
    correct: list.filter((w) => w.status === "correct").length,
    missing: list.filter((w) => w.status === "missing").length,
    replacement: list.filter((w) => w.status === "replacement").length,
    total: list.filter((w) => w.original != null).length,
  };
}

export function BenchmarkScoreResult({ kind, result }: BenchmarkScoreResultProps) {
  if (kind === "listen_repeat") {
    const lr = result as PythonBenchmarkListenRepeatResult;
    const stats = wordStats(lr.words);

    return (
      <div className="mt-4 space-y-3 rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
        <h4 className="text-sm font-semibold text-slate-900">评分结果</h4>
        <p className="text-lg font-bold text-emerald-800">
          {lr.score}/5 · {lr.score_summary}
        </p>
        {lr.model && (
          <p className="text-xs text-slate-500">模型：{lr.model}</p>
        )}
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
            转写
          </p>
          <p className="mt-1 text-sm text-slate-800">{lr.transcript}</p>
        </div>
        {stats.total > 0 && (
          <p className="text-sm text-slate-700">
            词对齐：正确 {stats.correct}/{stats.total}
            {stats.missing > 0 && ` · 漏读 ${stats.missing}`}
            {stats.replacement > 0 && ` · 错读 ${stats.replacement}`}
          </p>
        )}
        {lr.feedback?.summary && (
          <p className="text-sm text-slate-700">{lr.feedback.summary}</p>
        )}
        {lr.feedback?.sections?.map((section) => (
          <div key={section.title} className="text-sm">
            <p className="font-medium text-slate-800">{section.title}</p>
            <p className="text-slate-600">{section.content}</p>
          </div>
        ))}
      </div>
    );
  }

  const iv = result as PythonBenchmarkInterviewResult;
  const issueCount =
    iv.transcript_segments?.filter((s) => s.has_issue).length ?? 0;

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-emerald-100 bg-emerald-50/40 p-4">
      <h4 className="text-sm font-semibold text-slate-900">评分结果</h4>
      <div className="flex flex-wrap gap-2 text-sm">
        {(
          [
            ["Topic", iv.scores.topic],
            ["Pace", iv.scores.pace],
            ["Pronunciation", iv.scores.pronunciation],
            ["Grammar", iv.scores.grammar],
          ] as const
        ).map(([label, value]) => (
          <span
            key={label}
            className="rounded-md bg-white px-2 py-1 font-medium text-slate-800 shadow-sm"
          >
            {label} {value}/5
          </span>
        ))}
      </div>
      <p className="text-sm text-slate-800">{iv.score_summary}</p>
      {iv.model && <p className="text-xs text-slate-500">模型：{iv.model}</p>}
      <div className="grid gap-2 text-xs text-slate-600 sm:grid-cols-2">
        <span>WPM {iv.metrics.speaking_rate_wpm}</span>
        <span>停顿 {iv.metrics.pause_count}</span>
        <span>填充词 {iv.metrics.filler_word_count}</span>
        <span>最长停顿 {iv.metrics.longest_pause_seconds}s</span>
      </div>
      <div>
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          转写
        </p>
        <p className="mt-1 text-sm text-slate-800">{iv.transcript}</p>
      </div>
      {iv.transcript_segments && iv.transcript_segments.length > 0 && (
        <p className="text-sm text-slate-700">
          逐句反馈：{issueCount} 段有问题 / 共 {iv.transcript_segments.length} 段
        </p>
      )}
      {iv.pace_feedback?.summary && (
        <div className="text-sm">
          <p className="font-medium text-slate-800">Pace</p>
          <p className="text-slate-600">{iv.pace_feedback.summary}</p>
          {iv.pace_feedback.suggestion && (
            <p className="text-slate-500">{iv.pace_feedback.suggestion}</p>
          )}
        </div>
      )}
      {iv.pronunciation_feedback?.summary && (
        <div className="text-sm">
          <p className="font-medium text-slate-800">Pronunciation</p>
          <p className="text-slate-600">{iv.pronunciation_feedback.summary}</p>
          {iv.pronunciation_feedback.suggestion && (
            <p className="text-slate-500">{iv.pronunciation_feedback.suggestion}</p>
          )}
        </div>
      )}
      {iv.transcript_segments
        ?.filter((s) => s.has_issue)
        .slice(0, 3)
        .map((seg, i) => (
          <div
            key={`${seg.text.slice(0, 24)}-${i}`}
            className="rounded-md bg-white p-2 text-sm shadow-sm"
          >
            <p className="font-medium text-slate-800">&ldquo;{seg.text}&rdquo;</p>
            {seg.grammar_vocabulary && (
              <p className="mt-1 text-amber-800">
                Grammar: {seg.grammar_vocabulary.what_needs_improvement}
              </p>
            )}
            {seg.topic_development && (
              <p className="mt-1 text-blue-800">
                Topic: {seg.topic_development.what_needs_improvement}
              </p>
            )}
            {seg.improved_version && (
              <p className="mt-1 text-slate-600">
                改进：{seg.improved_version}
              </p>
            )}
          </div>
        ))}
      {issueCount > 3 && (
        <p className="text-xs text-slate-500">另有 {issueCount - 3} 段反馈未展开</p>
      )}
      {iv.feedback?.sections?.map((section) => (
        <div key={section.title} className="text-sm">
          <p className="font-medium text-slate-800">{section.title}</p>
          <p className="text-slate-600">{section.content}</p>
        </div>
      ))}
    </div>
  );
}
