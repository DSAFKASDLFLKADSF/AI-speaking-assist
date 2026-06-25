import { NextResponse } from "next/server";
import { verifyPassword } from "@/lib/auth/password";
import { toPublicUser } from "@/lib/auth/types";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  isAuthConfigured,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { findUserByEmail } from "@/lib/repositories/users";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      {
        error:
          "Server auth is not configured. Set DATABASE_URL and AUTH_SECRET in .env.local.",
      },
      { status: 503 }
    );
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    const record = await findUserByEmail(email);
    if (!record) {
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, record.passwordHash);
    if (!valid) {
      return NextResponse.json(
        { error: "Incorrect email or password." },
        { status: 401 }
      );
    }

    const token = await createSessionToken(record.id, record.email);
    const response = NextResponse.json({ user: toPublicUser(record) });
    response.cookies.set(AUTH_COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Login failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
