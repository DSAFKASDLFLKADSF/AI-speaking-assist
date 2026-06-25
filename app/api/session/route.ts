import { NextResponse } from "next/server";
import {
  PracticeSessionValidationError,
  createPracticeSession,
} from "@/lib/createPracticeSession";
import { AuthError, requireUser } from "@/lib/auth/getCurrentUser";
import { isAuthConfigured } from "@/lib/auth/session";
import type {
  CreatePracticeSessionRequest,
  CreatePracticeSessionResponse,
} from "@/lib/session-types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Auth is not configured on this server." },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as CreatePracticeSessionRequest;
    const user = await requireUser();
    const session = await createPracticeSession(user.id, body);

    const response: CreatePracticeSessionResponse = { session };

    return NextResponse.json(response, { status: 201 });
  } catch (err) {
    if (err instanceof AuthError) {
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    if (err instanceof PracticeSessionValidationError) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }

    const message =
      err instanceof Error ? err.message : "Failed to create practice session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
