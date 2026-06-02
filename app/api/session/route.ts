import { NextResponse } from "next/server";
import {
  PracticeSessionValidationError,
  createPracticeSession,
} from "@/lib/createPracticeSession";
import type {
  CreatePracticeSessionRequest,
  CreatePracticeSessionResponse,
} from "@/lib/session-types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreatePracticeSessionRequest;

    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError) {
      return NextResponse.json(
        { error: authError.message },
        { status: 401 }
      );
    }

    if (!user) {
      return NextResponse.json(
        { error: "You must be logged in to create a practice session." },
        { status: 401 }
      );
    }

    const session = await createPracticeSession(supabase, user.id, body);

    const response: CreatePracticeSessionResponse = { session };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    if (err instanceof PracticeSessionValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const message =
      err instanceof Error ? err.message : "Failed to create practice session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
