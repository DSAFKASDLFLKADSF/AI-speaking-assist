import { notFound } from "next/navigation";
import { TestOverviewClient } from "@/components/dashboard/TestOverviewClient";
import { getTestSetById } from "@/lib/testLibrary";

export default function TestOverviewPage({
  params,
}: {
  params: { testId: string };
}) {
  if (!getTestSetById(params.testId)) notFound();
  return <TestOverviewClient testId={params.testId} />;
}
