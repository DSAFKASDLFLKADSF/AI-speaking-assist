"use client";

/** Fired after login, register, or logout so history/progress views refresh. */
export const AUTH_SESSION_EVENT = "speaking-auth-session-changed";

export function dispatchAuthSessionChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(AUTH_SESSION_EVENT));
}

export function subscribeAuthSessionChanged(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_SESSION_EVENT, listener);
  return () => window.removeEventListener(AUTH_SESSION_EVENT, listener);
}
