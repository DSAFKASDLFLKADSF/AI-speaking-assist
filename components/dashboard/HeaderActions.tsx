"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { AuthModal, type AuthMode } from "@/components/AuthModal";
import { getLocalHistory } from "@/lib/localHistory";
import { MOCK_TEST_SETS } from "@/lib/testLibrary";
import type { PublicUser } from "@/lib/auth/types";
import { fetchCurrentUser, logout } from "@/lib/auth/client";
import { subscribeAuthSessionChanged } from "@/lib/auth/sessionEvents";

type Panel = "search" | "notifications" | "account" | null;

interface NotificationItem {
  id: string;
  title: string;
  body: string;
  href?: string;
  tone: "info" | "success" | "reminder";
}

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  onOutside: () => void,
  enabled: boolean
) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onOutside();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ref, onOutside, enabled]);
}

function buildNotifications(viewerUserId: string | null): NotificationItem[] {
  const items: NotificationItem[] = [];
  const history = getLocalHistory(viewerUserId);

  if (history.length === 0) {
    items.push({
      id: "start",
      title: "Get started",
      body: "Open a test set and complete your first Listen & Repeat drill.",
      href: "/dashboard",
      tone: "info",
    });
    return items;
  }

  const latest = new Date(history[0]!.createdAt);
  const daysSince =
    (Date.now() - latest.getTime()) / (1000 * 60 * 60 * 24);

  if (daysSince >= 2) {
    items.push({
      id: "inactive",
      title: "Time to practice",
      body: `Last session was ${Math.floor(daysSince)} day${Math.floor(daysSince) === 1 ? "" : "s"} ago. A short drill keeps momentum.`,
      href: "/dashboard",
      tone: "reminder",
    });
  }

  const mockCount = history.filter((e) => e.mode === "mock_exam").length;
  if (mockCount === 0) {
    items.push({
      id: "mock",
      title: "Try a full mock exam",
      body: "Simulate the full 11-question Speaking section under timed conditions.",
      href: "/dashboard",
      tone: "info",
    });
  } else {
    items.push({
      id: "growth",
      title: "Review your progress",
      body: `You have ${mockCount} mock exam${mockCount === 1 ? "" : "s"} logged. Check Growth for trends.`,
      href: "/growth",
      tone: "success",
    });
  }

  const lrCount = history.filter((e) => e.mode === "listen_repeat").length;
  const ivCount = history.filter((e) => e.mode === "interview").length;
  if (lrCount > ivCount * 2) {
    items.push({
      id: "balance-iv",
      title: "Balance your practice",
      body: "You've done more Listen & Repeat than Interview — add a Virtual Interview session.",
      href: "/dashboard",
      tone: "reminder",
    });
  } else if (ivCount > lrCount * 2) {
    items.push({
      id: "balance-lr",
      title: "Balance your practice",
      body: "Try more Listen & Repeat drills to sharpen pronunciation accuracy.",
      href: "/dashboard",
      tone: "reminder",
    });
  }

  return items.slice(0, 4);
}

const TONE_STYLE: Record<NotificationItem["tone"], string> = {
  info: "border-l-blue-500 bg-blue-50/60",
  success: "border-l-emerald-500 bg-emerald-50/60",
  reminder: "border-l-amber-500 bg-amber-50/60",
};

function displayEmail(user: PublicUser): string {
  return user.email ?? "Account";
}

export function HeaderActions() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [panel, setPanel] = useState<Panel>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<PublicUser | null>(null);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<AuthMode>("login");
  const [signingOut, setSigningOut] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  const closePanel = useCallback(() => setPanel(null), []);
  useClickOutside(rootRef, closePanel, panel != null);

  useEffect(() => {
    void fetchCurrentUser().then(setUser);
    return subscribeAuthSessionChanged(() => {
      void fetchCurrentUser().then(setUser);
    });
  }, []);

  useEffect(() => {
    if (panel === "notifications") {
      setNotifications(buildNotifications(user?.id ?? null));
    }
  }, [panel, user]);

  const openAuth = (mode: AuthMode) => {
    setAuthMode(mode);
    setAuthOpen(true);
    setPanel(null);
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await logout();
      setUser(null);
      setPanel(null);
    } finally {
      setSigningOut(false);
    }
  };

  const handleAuthSuccess = async () => {
    const current = await fetchCurrentUser();
    setUser(current);
  };

  const toggle = (next: Panel) => {
    setPanel((current) => (current === next ? null : next));
    if (next !== "search") setSearchQuery("");
  };

  const filteredTests = searchQuery.trim()
    ? MOCK_TEST_SETS.filter(
        (t) =>
          t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.subtitle.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : MOCK_TEST_SETS;

  const btnClass = (active: boolean) =>
    `rounded-lg p-2 transition-colors ${
      active
        ? "bg-blue-50 text-blue-600"
        : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
    }`;

  return (
    <>
      <div ref={rootRef} className="relative flex items-center gap-1">
        <button
          type="button"
          className={btnClass(panel === "search")}
          aria-label="Search tests"
          aria-expanded={panel === "search"}
          onClick={() => toggle("search")}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
        </button>

        {panel === "search" && (
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 p-3">
              <input
                type="search"
                autoFocus
                placeholder="Search test sets…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none ring-blue-500 focus:border-blue-400 focus:ring-2"
              />
            </div>
            <ul className="max-h-64 overflow-y-auto p-2">
              {filteredTests.length === 0 ? (
                <li className="px-3 py-4 text-center text-sm text-slate-500">
                  No matching tests
                </li>
              ) : (
                filteredTests.map((test) => (
                  <li key={test.id}>
                    <Link
                      href={`/test/${test.id}`}
                      onClick={closePanel}
                      className="block rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-50"
                    >
                      <p className="text-sm font-medium text-slate-900">{test.title}</p>
                      <p className="text-xs text-slate-500">{test.subtitle}</p>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}

        <button
          type="button"
          className={btnClass(panel === "notifications")}
          aria-label="Notifications"
          aria-expanded={panel === "notifications"}
          onClick={() => toggle("notifications")}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
          </svg>
        </button>

        {panel === "notifications" && (
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-sm font-semibold text-slate-900">Practice tips</p>
              <p className="text-xs text-slate-500">Based on your recent activity</p>
            </div>
            <ul className="max-h-80 space-y-2 overflow-y-auto p-3">
              {notifications.map((n) => (
                <li key={n.id}>
                  {n.href ? (
                    <Link
                      href={n.href}
                      onClick={closePanel}
                      className={`block rounded-lg border-l-4 px-3 py-2.5 transition-opacity hover:opacity-90 ${TONE_STYLE[n.tone]}`}
                    >
                      <p className="text-sm font-medium text-slate-900">{n.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{n.body}</p>
                    </Link>
                  ) : (
                    <div className={`rounded-lg border-l-4 px-3 py-2.5 ${TONE_STYLE[n.tone]}`}>
                      <p className="text-sm font-medium text-slate-900">{n.title}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">{n.body}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        <button
          type="button"
          className={btnClass(panel === "account")}
          aria-label="Account"
          aria-expanded={panel === "account"}
          onClick={() => toggle("account")}
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
          </svg>
        </button>

        {panel === "account" && (
          <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
            {user ? (
              <>
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {displayEmail(user)}
                  </p>
                  <p className="text-xs text-emerald-600">Signed in · cloud sync on</p>
                </div>
                <div className="p-2">
                  <Link
                    href="/growth"
                    onClick={closePanel}
                    className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Growth summary
                  </Link>
                  <Link
                    href="/dashboard"
                    onClick={closePanel}
                    className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    Test library
                  </Link>
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={signingOut}
                    className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    {signingOut ? "Signing out…" : "Log out"}
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="border-b border-slate-100 px-4 py-3">
                  <p className="text-sm font-medium text-slate-900">Guest mode</p>
                  <p className="text-xs text-slate-500">
                    Practice saves locally. Sign in to sync across devices.
                  </p>
                </div>
                <div className="space-y-2 p-3">
                  <button
                    type="button"
                    onClick={() => openAuth("login")}
                    className="w-full rounded-lg border border-slate-200 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuth("register")}
                    className="w-full rounded-lg bg-[#1e3a5f] py-2 text-sm font-medium text-white hover:bg-[#152a45]"
                  >
                    Sign up
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <AuthModal
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        defaultMode={authMode}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
}
