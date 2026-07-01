import { getOrCreateSurveyClientId } from "@/lib/surveys/clientId";
import type { PostSurveyAnswers, PreSurveyAnswers } from "@/lib/surveys/types";
import type { SurveyStatus } from "@/lib/surveys/types";

function headers(): HeadersInit {
  const clientId = getOrCreateSurveyClientId();
  return {
    "Content-Type": "application/json",
    "x-survey-client-id": clientId,
  };
}

export async function fetchSurveyStatus(): Promise<SurveyStatus> {
  const res = await fetch("/api/surveys/status", {
    credentials: "same-origin",
    headers: { "x-survey-client-id": getOrCreateSurveyClientId() },
  });
  if (!res.ok) {
    throw new Error("Failed to load survey status.");
  }
  return res.json() as Promise<SurveyStatus>;
}

export async function submitPreSurvey(
  answers: PreSurveyAnswers,
  postPending: boolean
): Promise<{ showPostImmediately: boolean }> {
  const res = await fetch("/api/surveys/pre", {
    method: "POST",
    credentials: "same-origin",
    headers: headers(),
    body: JSON.stringify({ answers, postPending }),
  });
  const data = (await res.json()) as {
    error?: string;
    showPostImmediately?: boolean;
  };
  if (!res.ok) throw new Error(data.error ?? "Submit failed.");
  return { showPostImmediately: Boolean(data.showPostImmediately) };
}

export async function submitPostSurvey(
  answers: PostSurveyAnswers
): Promise<void> {
  const res = await fetch("/api/surveys/post", {
    method: "POST",
    credentials: "same-origin",
    headers: headers(),
    body: JSON.stringify({ answers }),
  });
  const data = (await res.json()) as { error?: string };
  if (!res.ok) throw new Error(data.error ?? "Submit failed.");
}
