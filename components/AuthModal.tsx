"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

export type AuthMode = "login" | "register";

export interface AuthModalProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: AuthMode;
  onSuccess?: (mode: AuthMode) => void;
}

function friendlyAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password.";
  }
  if (lower.includes("user already registered")) {
    return "An account with this email already exists. Try logging in.";
  }
  if (lower.includes("password should be at least")) {
    return "Password must be at least 6 characters.";
  }
  if (lower.includes("unable to validate email")) {
    return "Please enter a valid email address.";
  }
  return message;
}

export function AuthModal({
  open,
  onClose,
  defaultMode = "login",
  onSuccess,
}: AuthModalProps) {
  const titleId = useId();
  const descId = useId();

  const [mode, setMode] = useState<AuthMode>(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const resetForm = useCallback(() => {
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setError(null);
    setMessage(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (open) {
      setMode(defaultMode);
      resetForm();
    }
  }, [open, defaultMode, resetForm]);

  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, loading, onClose]);

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setError(null);
    setMessage(null);
    setConfirmPassword("");
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (mode === "register" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (!isSupabaseConfigured()) {
      setError(
        "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local, then restart npm run dev."
      );
      return;
    }

    setLoading(true);

    try {
      const supabase = getSupabase();

      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (signInError) {
          throw signInError;
        }

        onSuccess?.("login");
        onClose();
        return;
      }

      const { data, error: signUpError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.session) {
        onSuccess?.("register");
        onClose();
        return;
      }

      setMessage(
        "Check your email to confirm your account, then log in."
      );
      switchMode("login");
    } catch (err) {
      const raw =
        err instanceof Error ? err.message : "Authentication failed.";
      setError(friendlyAuthError(raw));
    } finally {
      setLoading(false);
    }
  };

  const supabaseReady = isSupabaseConfigured();

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close dialog"
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]"
        onClick={() => !loading && onClose()}
        disabled={loading}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="relative w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8"
      >
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Close"
          className="absolute top-4 right-4 rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18 18 6M6 6l12 12"
            />
          </svg>
        </button>

        <p className="text-xs font-medium uppercase tracking-[0.15em] text-slate-500">
          TOEFL Speaking AI
        </p>
        <h2 id={titleId} className="mt-2 text-xl font-semibold text-slate-900">
          {mode === "login" ? "Log in" : "Create account"}
        </h2>
        <p id={descId} className="mt-1 text-sm text-slate-600">
          {mode === "login"
            ? "Sign in with your email to save practice sessions."
            : "Register with email to track your progress."}
        </p>

        <div className="mt-5 flex rounded-lg bg-slate-100 p-1">
          <button
            type="button"
            disabled={loading}
            onClick={() => switchMode("login")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              mode === "login"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Log in
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => switchMode("register")}
            className={`flex-1 rounded-md py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              mode === "register"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Sign up
          </button>
        </div>

        {!supabaseReady && (
          <p className="mt-5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Supabase is not configured. Copy{" "}
            <code className="text-xs">.env.example</code> to{" "}
            <code className="text-xs">.env.local</code> and paste your Project
            URL + anon key from{" "}
            <a
              href="https://supabase.com/dashboard/project/_/settings/api"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline underline-offset-2"
            >
              Supabase Dashboard → Settings → API
            </a>
            . Restart the dev server after saving.
          </p>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="auth-email"
              className="block text-sm font-medium text-slate-700"
            >
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              autoComplete="email"
              required
              disabled={loading}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 disabled:opacity-50"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-sm font-medium text-slate-700"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              disabled={loading}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 6 characters"
              className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 disabled:opacity-50"
            />
          </div>

          {mode === "register" && (
            <div>
              <label
                htmlFor="auth-confirm-password"
                className="block text-sm font-medium text-slate-700"
              >
                Confirm password
              </label>
              <input
                id="auth-confirm-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                disabled={loading}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-slate-400 disabled:opacity-50"
              />
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          {message && (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !supabaseReady}
            className="w-full rounded-full bg-slate-900 py-3 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading
              ? mode === "login"
                ? "Signing in…"
                : "Creating account…"
              : mode === "login"
                ? "Log in"
                : "Sign up"}
          </button>
        </form>
      </div>
    </div>
  );
}
