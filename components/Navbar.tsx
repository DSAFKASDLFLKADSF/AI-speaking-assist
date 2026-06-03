"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { AuthModal, type AuthMode } from "@/components/AuthModal";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase";

const navLinks = [
  { label: "Test Library", href: "/dashboard" },
  { label: "Growth", href: "/growth" },
] as const;

function displayEmail(user: User): string {
  return user.email ?? "Account";
}

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const openAuth = useCallback((mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
  }, []);

  const handleSignOut = async () => {
    if (!isSupabaseConfigured()) return;
    setSigningOut(true);
    try {
      await getSupabase().auth.signOut();
    } finally {
      setSigningOut(false);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-14 items-center justify-between">
            <Link
              href="/"
              className="shrink-0 text-sm font-semibold tracking-tight text-slate-900 sm:text-base"
            >
              TOEFL Speaking AI
            </Link>

            <nav
              aria-label="Main"
              className="hidden items-center gap-1 md:flex"
            >
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-md px-3 py-1.5 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              {user ? (
                <>
                  <span
                    className="hidden max-w-[140px] truncate text-sm text-slate-600 sm:inline"
                    title={displayEmail(user)}
                  >
                    {displayEmail(user)}
                  </span>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 disabled:opacity-50"
                  >
                    {signingOut ? "Signing out…" : "Log out"}
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => openAuth("login")}
                    className="rounded-md px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100"
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuth("register")}
                    className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-slate-800"
                  >
                    Sign up
                  </button>
                </>
              )}
            </div>
          </div>

          <nav
            aria-label="Main mobile"
            className="-mx-1 flex gap-1 overflow-x-auto border-t border-slate-100 py-2 md:hidden"
          >
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="whitespace-nowrap rounded-md px-3 py-1 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        defaultMode={authMode}
      />
    </>
  );
}
