"use client";

import { useCallback, useMemo, useState } from "react";
import { BenchmarkScoreResult } from "@/components/admin/BenchmarkScoreResult";
import { isAdminUser } from "@/lib/auth/admins";
import { useAuthSession } from "@/lib/auth/useAuthSession";
import type {
  PythonBenchmarkInterviewResult,
  PythonBenchmarkListenRepeatResult,
  PythonBenchmarkStage,
} from "@/lib/pythonSpeechApi";
import {
  buildBenchmarkPayloads,
  stageLabelZh,
  type BenchmarkKind,
  type BenchmarkRunOnePayload,
} from "@/lib/scoringBenchmark";

interface QuestionResult {
  index: number;
  title: string;
  success: boolean;
  stages: PythonBenchmarkStage[];
  totalSeconds: number;
  apiRoundTripSeconds: number;
  error?: string | null;
  scorePreview?: string | null;
  result?: PythonBenchmarkInterviewResult | PythonBenchmarkListenRepeatResult | null;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return (
    Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
  );
}

export function ScoringBenchmarkClient() {
  const { user, ready } = useAuthSession();
  const isAdmin = Boolean(user && isAdminUser(user));

  const [kind, setKind] = useState<BenchmarkKind>("interview");
  const [count, setCount] = useState(1);
  const [running, setRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [results, setResults] = useState<QuestionResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  const maxCount = kind === "interview" ? 4 : 7;

  const summary = useMemo(() => {
    if (results.length === 0) return null;
    const stageTotals = new Map<string, number[]>();
    for (const r of results) {
      for (const s of r.stages) {
        if (s.id === "failed") continue;
        const list = stageTotals.get(s.id) ?? [];
        list.push(s.seconds);
        stageTotals.set(s.id, list);
      }
    }
    const stageAverages = Array.from(stageTotals.entries()).map(
      ([id, secs]) => ({
        id,
        seconds: average(secs),
      })
    );
    return {
      count: results.length,
      successCount: results.filter((r) => r.success).length,
      avgTotal: average(results.map((r) => r.totalSeconds)),
      avgApi: average(results.map((r) => r.apiRoundTripSeconds)),
      stageAverages,
    };
  }, [results]);

  const runBenchmark = useCallback(async () => {
    if (!isAdmin || running) return;

    setError(null);
    setResults([]);
    setRunning(true);

    const origin = window.location.origin;
    const payloads = buildBenchmarkPayloads(kind, count, origin);

    try {
      for (let i = 0; i < payloads.length; i += 1) {
        setCurrentIndex(i + 1);
        const payload = payloads[i] as BenchmarkRunOnePayload;
        const res = await fetch("/api/admin/scoring-benchmark", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = (await res.json()) as QuestionResult & {
          error?: string;
          api_round_trip_seconds?: number;
          total_seconds?: number;
          score_preview?: string | null;
          result?: PythonBenchmarkInterviewResult | PythonBenchmarkListenRepeatResult | null;
        };

        if (!res.ok) {
          throw new Error(data.error ?? "Benchmark failed.");
        }

        setResults((prev) => [
          ...prev,
          {
            index: i + 1,
            title: payload.kind === "interview"
              ? payload.interview.title
              : payload.listen_repeat.title,
            success: data.success,
            stages: data.stages,
            totalSeconds: data.total_seconds ?? 0,
            apiRoundTripSeconds: data.api_round_trip_seconds ?? 0,
            error: data.error,
            scorePreview: data.score_preview,
            result: data.result ?? null,
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Benchmark failed.");
    } finally {
      setCurrentIndex(null);
      setRunning(false);
    }
  }, [count, isAdmin, kind, running]);

  if (!ready) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
        Loading…
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-8 text-sm text-amber-900">
        仅管理员可访问评分耗时测试。请使用管理员账号登录。
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">开发者 · 评分测试</h1>
        <p className="mt-2 text-sm text-slate-600">
          用官方样例音频跑完整评分管线：汇报各环节耗时，并展示与正式考试相同的评分结果（分数、转写、反馈）。
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">题型</span>
            <select
              value={kind}
              disabled={running}
              onChange={(e) => {
                const next = e.target.value as BenchmarkKind;
                setKind(next);
                setCount(1);
              }}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              <option value="interview">Interview（最多 4 题）</option>
              <option value="listen_repeat">Listen &amp; Repeat（最多 7 题）</option>
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block font-medium text-slate-700">题目数量</span>
            <select
              value={count}
              disabled={running}
              onChange={(e) => setCount(Number(e.target.value))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900"
            >
              {Array.from({ length: maxCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} 题
                </option>
              ))}
            </select>
          </label>
        </div>

        <button
          type="button"
          disabled={running}
          onClick={() => void runBenchmark()}
          className="mt-5 rounded-lg bg-[#1e3a5f] px-5 py-2.5 text-sm font-medium text-white transition hover:opacity-90 disabled:opacity-50"
        >
          {running
            ? `测试中… 第 ${currentIndex ?? "—"} / ${count} 题`
            : "开始测试"}
        </button>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </section>

      {results.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-900">各环节耗时</h2>

          {results.map((result) => (
            <article
              key={result.index}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-medium text-slate-900">
                  第 {result.index} 题 · {result.title}
                </h3>
                <span
                  className={`text-sm font-semibold ${
                    result.success ? "text-emerald-700" : "text-red-600"
                  }`}
                >
                  {result.success ? "成功" : "失败"} · 管线{" "}
                  {result.totalSeconds}s · API {result.apiRoundTripSeconds}s
                </span>
              </div>

              {result.error && (
                <p className="mb-3 text-sm text-red-600">{result.error}</p>
              )}

              <ol className="relative border-l border-slate-200 pl-5">
                {result.stages.map((stage, idx) => (
                  <li key={`${result.index}-${stage.id}-${idx}`} className="mb-4 last:mb-0">
                    <span
                      className={`absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-white ${
                        stage.id === "failed"
                          ? "bg-red-500"
                          : idx === result.stages.length - 1 && result.success
                            ? "bg-emerald-500"
                            : "bg-blue-500"
                      }`}
                      aria-hidden
                    />
                    <p className="text-sm font-medium text-slate-800">
                      {stageLabelZh(stage.id, stage.label)}
                    </p>
                    <p className="text-sm text-slate-500">
                      本环节 <strong className="text-slate-800">{stage.seconds}s</strong>
                    </p>
                  </li>
                ))}
              </ol>

              {result.scorePreview && !result.result && (
                <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-600">
                  {result.scorePreview}
                </p>
              )}

              {result.success && result.result && (
                <BenchmarkScoreResult kind={kind} result={result.result} />
              )}
            </article>
          ))}
        </section>
      )}

      {summary && (
        <section className="rounded-xl border border-blue-100 bg-blue-50/60 p-6">
          <h2 className="text-lg font-semibold text-slate-900">汇总</h2>
          <p className="mt-2 text-sm text-slate-700">
            完成 {summary.successCount}/{summary.count} 题 · 平均每题管线{" "}
            <strong>{summary.avgTotal}s</strong> · 平均 API 往返{" "}
            <strong>{summary.avgApi}s</strong>
          </p>
          <ul className="mt-3 space-y-1 text-sm text-slate-700">
            {summary.stageAverages.map((s) => (
              <li key={s.id}>
                {stageLabelZh(s.id, s.id)}：平均 <strong>{s.seconds}s</strong>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
        <h2 className="mb-2 text-base font-semibold text-slate-900">
          为什么一道题要这么久？（预估）
        </h2>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>语音转文字 (AssemblyAI)</strong>：通常 5–15 秒，要等音频上传、排队、模型转写完成，往往是最大头。
          </li>
          <li>
            <strong>AI 评分 (GLM)</strong>：通常 15–60 秒。Interview 还要生成逐句 Topic / Grammar / Conciseness 反馈，JSON 更大、更容易触发限流或超时。
          </li>
          <li>
            <strong>转写指标</strong>：毫秒级，从 AssemblyAI 词时间戳 + 文本统计语速、停顿、填充词。
          </li>
          <li>
            <strong>正式考试里更慢</strong>：4 道 Interview 题串行评分（同时只跑 1 个任务），前面题目还在排队时你会在结果页看到「分析中」。
          </li>
        </ul>
      </section>
    </div>
  );
}
