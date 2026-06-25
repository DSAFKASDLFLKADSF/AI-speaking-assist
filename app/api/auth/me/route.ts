import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/getCurrentUser";
import { toPublicUser } from "@/lib/auth/types";
import { isAuthConfigured } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  if (!isAuthConfigured()) {
    return NextResponse.json(
      { error: "Auth is not configured on this server." },
      { status: 503 }
    );
  }

  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  }

  return NextResponse.json({ user: toPublicUser(user) });
}
