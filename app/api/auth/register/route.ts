import { NextResponse } from "next/server";
import { hashPassword } from "@/lib/auth/password";
import { toPublicUser } from "@/lib/auth/types";
import {
  AUTH_COOKIE_NAME,
  createSessionToken,
  isAuthConfigured,
  sessionCookieOptions,
} from "@/lib/auth/session";
import { createUser, findUserByEmail } from "@/lib/repositories/users";

export const runtime = "nodejs";

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

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
      displayName?: string;
    };

    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    const displayName = body.displayName?.trim() || null;

    if (!email || !isValidEmail(email)) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Try logging in." },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await createUser({ email, passwordHash, displayName });
    const token = await createSessionToken(user.id, user.email);

    const response = NextResponse.json(
      { user: toPublicUser(user) },
      { status: 201 }
    );
    response.cookies.set(AUTH_COOKIE_NAME, token, sessionCookieOptions());
    return response;
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Registration failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
