"use client";

import { useEffect, useState } from "react";
import { fetchCurrentUser } from "@/lib/auth/client";
import { subscribeAuthSessionChanged } from "@/lib/auth/sessionEvents";
import type { PublicUser } from "@/lib/auth/types";
import { claimLegacyLocalHistory } from "@/lib/localHistory";

export function useAuthSession() {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      const current = await fetchCurrentUser();
      if (current) {
        claimLegacyLocalHistory(current.id);
      }
      if (!cancelled) {
        setUser(current);
        setReady(true);
      }
    };

    void refresh();
    const unsubscribe = subscribeAuthSessionChanged(() => {
      void refresh();
    });

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return { user, ready, userId: user?.id ?? null };
}
