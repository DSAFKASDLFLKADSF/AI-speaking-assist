"use client";

import { useEffect, useState } from "react";
import { AuthModal } from "@/components/AuthModal";
import { fetchCurrentUser } from "@/lib/auth/client";
import type { PublicUser } from "@/lib/auth/types";

export function HomeLoginPrompt() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState<PublicUser | null | undefined>(undefined);

  useEffect(() => {
    void fetchCurrentUser().then(setUser);
  }, []);

  if (user === undefined) {
    return null;
  }

  if (user) {
    return null;
  }

  return (
    <>
      <p className="text-sm text-slate-500">
        Already have an account?{" "}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-4 transition-colors hover:decoration-slate-500"
        >
          Log in
        </button>{" "}
        to track your progress and scores.
      </p>

      <AuthModal
        open={open}
        onClose={() => setOpen(false)}
        defaultMode="login"
        onSuccess={() => {
          void fetchCurrentUser().then(setUser);
        }}
      />
    </>
  );
}
