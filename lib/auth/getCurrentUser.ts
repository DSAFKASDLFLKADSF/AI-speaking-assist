import { cookies } from "next/headers";
import { findUserById } from "@/lib/repositories/users";
import type { AppUser } from "@/lib/auth/types";
import { AUTH_COOKIE_NAME, verifySessionToken } from "@/lib/auth/session";

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export async function getSessionFromRequest(): Promise<{
  userId: string;
  email: string;
} | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function getCurrentUser(): Promise<AppUser | null> {
  const session = await getSessionFromRequest();
  if (!session) return null;
  return findUserById(session.userId);
}

export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new AuthError("You must be logged in.");
  }
  return user;
}
