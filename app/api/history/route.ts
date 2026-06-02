import { NextResponse } from "next/server";
import { getPracticeHistory } from "@/lib/getPracticeHistory";
import type {
  PracticeHistoryQuery,
  PracticeHistoryResponse,
} from "@/lib/history-types";
import type { SessionStatus, ToeflTaskNumber } from "@/lib/session-types";
import { createSupabaseServerClient } from "@/lib/supabase-server";
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
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 401 });
    }

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to view practice history." },
        { status: 401 }
      );
    }

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

    const history = await getPracticeHistory(supabase, user.id, query);
    const response: PracticeHistoryResponse = history;

    return NextResponse.json(response);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to load practice history.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
