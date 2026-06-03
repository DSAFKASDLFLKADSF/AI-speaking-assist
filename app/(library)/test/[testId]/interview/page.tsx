import { redirect } from "next/navigation";

export default function TestInterviewHub({
  params,
}: {
  params: { testId: string };
}) {
  redirect(`/test/${params.testId}/run/interview`);
}
