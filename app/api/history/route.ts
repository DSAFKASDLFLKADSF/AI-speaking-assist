import { NextResponse } from "next/server";
import { getPracticeHistory } from "@/lib/getPracticeHistory";
import { AuthError, requireUser } from "@/lib/auth/getCurrentUser";
import { isAuthConfigured } from "@/lib/auth/session";
import type {
  PracticeHistoryQuery,
  PracticeHistoryResponse,
} from "@/lib/history-types";
import type { SessionStatus, ToeflTaskNumber } from "@/lib/session-types";

export const runtime = "nodejs";

const SESSION_STATUSES: SessionStatus[] = [
  "pending",
  "preparing",
  "recording",
  "processing",
  "completed",
  "abandoned",
];

const TASK_NUMBERS: ToeflTaskNumber[] = ["1", "2", "3", "4"];

function parseQuery(searchParams: URLSearchParams): PracticeHistoryQuery {
  const limitRaw = searchParams.get("limit");
  const offsetRaw = searchParams.get("offset");
  const status = searchParams.get("status");
  const taskNumber = searchParams.get("taskNumber");

  const query: PracticeHistoryQuery = {};

  if (limitRaw !== null && limitRaw !== "") {
    query.limit = Number(limitRaw);
  }
  if (offsetRaw !== null && offsetRaw !== "") {
    query.offset = Number(offsetRaw);
  }
  if (status && SESSION_STATUSES.includes(status as SessionStatus)) {
    query.status = status as SessionStatus;
  }
  if (taskNumber && TASK_NUMBERS.includes(taskNumber as ToeflTaskNumber)) {
    query.taskNumber = taskNumber as ToeflTaskNumber;
  }

  return query;
}

export async function GET(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Auth is not configured on this server." },
      { status: 503 }
    );
  }

  try {
    const user = await requireUser();
    const { searchParams } = new URL(request.url);
    const query = parseQuery(searchParams);

    if (
      (searchParams.get("limit") && Number.isNaN(query.limit)) ||
      (searchParams.get("offset") && Number.isNaN(query.offset))
    ) {
      return NextResponse.json(
        { error: "limit and offset must be valid numbers." },
        { status: 400 }
      );
    }

    const history = await getPracticeHistory(user.id, query);
    const response: PracticeHistoryResponse = history;

    return NextResponse.json(response);
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    const message =
      err instanceof Error ? err.message : "Failed to load practice history.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
