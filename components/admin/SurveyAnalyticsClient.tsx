"use client";

import { useCallback, useEffect, useState } from "react";
import { isAdminUser } from "@/lib/auth/admins";
import { useAuthSession } from "@/lib/auth/useAuthSession";
import type { OptionCount, SurveyAnalyticsSummary } from "@/lib/surveys/analytics";
import {
  formatPostAnswerSummary,
  formatPreAnswerSummary,
} from "@/lib/surveys/analytics";

const PRE_SECTION_LABELS: Record<string, string> = {
  grade: "1. 年级",
  practiceMethods: "2. 练习方式",
  weeklySpeakingHours: "3. 每周口语练习时长",
  tutorProblems: "4. 真人教学问题",
  platformProblems: "5. 口语练习平台问题",
  selfStudyProblems: "6. 自学口语问题",
  aiAppPriorities: "7. AI 口语 App 看重方面",
  willingnessToPay: "8. 愿付价格（一套题）",
};

const POST_SECTION_LABELS: Record<string, string> = {
  completePracticeCount: "1. 完整练习次数",
  taskTypesUsed: "2. 使用题型",
  usageProblems: "3. 使用中遇到的问题",
  tutorResolution: "4. 真人教学问题解决情况",
  platformResolution: "5. 平台问题解决情况",
  selfStudyResolution: "6. 自学问题解决情况",
  continueUsing: "7. 继续意愿",
  willingnessToPay: "8. 愿付价格（一套题）",
};

function BreakdownChart({
  title,
  items,
}: {
  title: string;
  items: OptionCount[];
}) {
  const max = Math.max(...items.map((i) => i.count), 1);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      {items.every((i) => i.count === 0) ? (
        <p className="text-xs text-slate-400">暂无数据</p>
      ) : (
        <ul className="space-y-2">
          {items.map((item) => (
            <li key={item.id}>
              <div className="mb-1 flex items-center justify-between gap-2 text-xs">
                <span className="text-slate-700">{item.label}</span>
                <span className="shrink-0 text-slate-500">
                  {item.count} ({item.percent}%)
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-[#1e3a5f]"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ResponseTable({
  title,
  rows,
  formatSummary,
}: {
  title: string;
  rows: SurveyAnalyticsSummary["preResponses"];
  formatSummary: (answers: (typeof rows)[0]["answers"]) => string[];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-xs text-slate-400">暂无答卷</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-500">
                <th className="py-2 pr-3 font-medium">时间</th>
                <th className="py-2 pr-3 font-medium">用户</th>
                <th className="py-2 font-medium">摘要</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const summary = formatSummary(row.answers);
                const isOpen = expanded === row.id;
                return (
                  <tr
                    key={row.id}
                    className="border-b border-slate-50 align-top"
                  >
                    <td className="py-2 pr-3 whitespace-nowrap text-slate-600">
                      {new Date(row.createdAt).toLocaleString("zh-CN")}
                    </td>
                    <td className="py-2 pr-3 text-slate-600">
                      {row.userEmail ?? row.clientId ?? "—"}
                    </td>
                    <td className="py-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded(isOpen ? null : row.id)
                        }
                        className="text-left text-[#1e3a5f] hover:underline"
                      >
                        {summary.slice(0, 2).join(" · ") || "查看详情"}
                        {summary.length > 2 ? " …" : ""}
                      </button>
                      {isOpen && (
                        <div className="mt-2 space-y-1 rounded-lg bg-slate-50 p-2 text-slate-700">
                          {summary.map((line) => (
                            <p key={line}>{line}</p>
                          ))}
                          <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap break-all text-[10px] text-slate-500">
                            {JSON.stringify(row.answers, null, 2)}
                          </pre>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export function SurveyAnalyticsClient() {
  const { user, ready } = useAuthSession();
  const isAdmin = Boolean(user && isAdminUser(user));

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState(true);
  const [summary, setSummary] = useState<SurveyAnalyticsSummary | null>(null);

  const load = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/survey-analytics", {
        credentials: "same-origin",
      });
      const data = (await res.json()) as {
        error?: string;
        configured?: boolean;
        summary?: SurveyAnalyticsSummary;
      };
      if (!res.ok) throw new Error(data.error ?? "加载失败");
      setConfigured(Boolean(data.configured));
      setSummary(data.summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载失败");
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (ready && isAdmin) void load();
  }, [ready, isAdmin, load]);

  if (!ready) {
    return <p className="text-sm text-slate-500">加载中…</p>;
  }

  if (!isAdmin) {
    return (
      <p className="text-sm text-red-600">需要管理员权限才能查看问卷统计。</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">问卷统计</h1>
          <p className="mt-1 text-sm text-slate-500">
            前测与后测问卷的所有回答汇总（仅管理员可见）。
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-50"
        >
          刷新
        </button>
      </div>

      {!configured && (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          数据库未配置。本地开发使用 pg-mem 时数据在重启后会清空；生产环境请配置
          DATABASE_URL 并执行 deploy/sql/003_surveys.sql。
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && !summary ? (
        <p className="text-sm text-slate-500">加载统计数据…</p>
      ) : summary ? (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">前测答卷</p>
              <p className="mt-1 text-3xl font-semibold text-[#1e3a5f]">
                {summary.preCount}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs text-slate-500">后测答卷</p>
              <p className="mt-1 text-3xl font-semibold text-[#1e3a5f]">
                {summary.postCount}
              </p>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-slate-900">
              前测分布
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {Object.entries(summary.preBreakdown).map(([key, items]) => (
                <BreakdownChart
                  key={key}
                  title={PRE_SECTION_LABELS[key] ?? key}
                  items={items}
                />
              ))}
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-base font-semibold text-slate-900">
              后测分布
            </h2>
            <div className="grid gap-4 lg:grid-cols-2">
              {Object.entries(summary.postBreakdown).map(([key, items]) => (
                <BreakdownChart
                  key={key}
                  title={POST_SECTION_LABELS[key] ?? key}
                  items={items}
                />
              ))}
            </div>
          </div>

          <ResponseTable
            title="前测原始答卷"
            rows={summary.preResponses}
            formatSummary={(a) => formatPreAnswerSummary(a)}
          />
          <ResponseTable
            title="后测原始答卷"
            rows={summary.postResponses}
            formatSummary={(a) => formatPostAnswerSummary(a)}
          />
        </>
      ) : null}
    </div>
  );
}
