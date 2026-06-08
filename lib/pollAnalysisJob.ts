import type { AnalysisJobPollResponse } from "@/lib/analysisJobTypes";

export interface PollAnalysisJobOptions {
  intervalMs?: number;
  maxWaitMs?: number;
  /** Per-request timeout so a stuck server cannot hang the UI forever. */
  requestTimeoutMs?: number;
  /** Called on each poll tick with the latest job status. */
  onStatus?: (status: string) => void;
}

export class PollAnalysisJobError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: unknown
  ) {
    super(message);
    this.name = "PollAnalysisJobError";
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function fetchWithTimeout(
  url: string,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      credentials: "same-origin",
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new PollAnalysisJobError(
        "Analysis status check timed out. The server may be busy — try Retry scoring.",
        504
      );
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

/** Poll a Next.js analysis job until done or failed. */
export async function pollAnalysisJob<T>(
  pollUrl: string,
  options: PollAnalysisJobOptions = {}
): Promise<T> {
  const intervalMs = options.intervalMs ?? 2500;
  const maxWaitMs = options.maxWaitMs ?? 300_000;
  const requestTimeoutMs = options.requestTimeoutMs ?? 45_000;
  const startedAt = Date.now();

  while (Date.now() - startedAt < maxWaitMs) {
    const res = await fetchWithTimeout(pollUrl, requestTimeoutMs);
    const data: unknown = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new PollAnalysisJobError(
        (data as { error?: string }).error ?? `Poll failed (${res.status})`,
        res.status,
        data
      );
    }

    const poll = data as AnalysisJobPollResponse<T>;

    if (poll.status) {
      options.onStatus?.(poll.status);
    }

    if (poll.status === "failed") {
      throw new PollAnalysisJobError(poll.error ?? "Analysis failed.", 502, poll);
    }

    if (poll.status === "done" && poll.result !== undefined) {
      return poll.result;
    }

    await sleep(intervalMs);
  }

  throw new PollAnalysisJobError(
    "Analysis timed out while waiting for results.",
    504
  );
}
