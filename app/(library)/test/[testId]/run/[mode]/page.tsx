import { notFound } from "next/navigation";
import { TestExamRunner } from "@/components/exam/TestExamRunner";
import type { TestExamMode } from "@/lib/localHistory";
import { getTestSetById } from "@/lib/testLibrary";

const MODE_MAP: Record<string, TestExamMode> = {
  full: "full",
  "listen-repeat": "listen_repeat",
  interview: "interview",
};

export default function TestRunPage({
  params,
}: {
  params: { testId: string; mode: string };
}) {
  const testSet = getTestSetById(params.testId);
  const examMode = MODE_MAP[params.mode];
  if (!testSet || !examMode) notFound();

  return (
    <TestExamRunner
      testId={testSet.id}
      testTitle={testSet.title}
      mode={examMode}
    />
  );
}
