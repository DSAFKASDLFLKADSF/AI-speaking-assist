import type { PublicUser } from "@/lib/auth/types";
import { dispatchAuthSessionChanged } from "@/lib/auth/sessionEvents";
import {
  claimLegacyLocalHistory,
  sealLocalHistoryOnLogout,
} from "@/lib/localHistory";

export async function fetchCurrentUser(): Promise<PublicUser | null> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "include" });
    if (!res.ok) return null;
    const data = (await res.json()) as { user: PublicUser };
    return data.user ?? null;
  } catch {
    return null;
  }
}

export async function loginWithPassword(
  email: string,
  password: string
): Promise<{ user: PublicUser } | { error: string }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: (data.error as string) ?? "Login failed." };
  }
  const user = data.user as PublicUser;
  claimLegacyLocalHistory(user.id);
  dispatchAuthSessionChanged();
  return { user };
}

export async function registerWithPassword(input: {
  email: string;
  password: string;
  displayName?: string;
}): Promise<{ user: PublicUser } | { error: string }> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  const data = await res.json();
  if (!res.ok) {
    return { error: (data.error as string) ?? "Registration failed." };
  }
  const user = data.user as PublicUser;
  claimLegacyLocalHistory(user.id);
  dispatchAuthSessionChanged();
  return { user };
}

export async function logout(): Promise<void> {
  const user = await fetchCurrentUser();
  if (user) {
    sealLocalHistoryOnLogout(user.id);
  }
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "include",
  });
  dispatchAuthSessionChanged();
}

export function isAuthClientConfigured(): boolean {
  return process.env.NEXT_PUBLIC_AUTH_ENABLED !== "false";
}
