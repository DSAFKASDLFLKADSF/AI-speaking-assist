import { redirect } from "next/navigation";

export default function TestListenRepeatHub({
  params,
}: {
  params: { testId: string };
}) {
  redirect(`/test/${params.testId}/run/listen-repeat`);
}
