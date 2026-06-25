import { SignJWT, jwtVerify } from "jose";

export const AUTH_COOKIE_NAME =
  process.env.AUTH_COOKIE_NAME?.trim() || "speaking_session";

const SESSION_DAYS = Number(process.env.AUTH_SESSION_DAYS ?? 30);

function getSecretKey(): Uint8Array {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error(
      "AUTH_SECRET is not configured. Generate one with: openssl rand -base64 32"
    );
  }
  return new TextEncoder().encode(secret);
}

import { useDevDatabase } from "@/lib/devDb";

export function isAuthConfigured(): boolean {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) return false;
  return Boolean(process.env.DATABASE_URL?.trim()) || useDevDatabase();
}

export interface SessionPayload {
  userId: string;
  email: string;
}

export async function createSessionToken(
  userId: string,
  email: string
): Promise<string> {
  return new SignJWT({ email })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecretKey());
}

export async function verifySessionToken(
  token: string
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    const userId = payload.sub;
    const email = payload.email;
    if (!userId || typeof email !== "string") return null;
    return { userId, email };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: maxAge ?? 60 * 60 * 24 * SESSION_DAYS,
  };
}
