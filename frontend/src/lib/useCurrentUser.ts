"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { apiFetch, getAuthToken } from "./api";

export type CurrentUser = { id: string; email?: string | null; name?: string | null } | null;

export function useCurrentUser(): { user: CurrentUser; loading: boolean } {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<CurrentUser>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setUser({
        id: (session.user as { id?: string }).id ?? "",
        email: session.user.email ?? null,
        name: session.user.name ?? null,
      });
      setLoading(false);
      return;
    }

    if (status === "loading") return;

    if (!getAuthToken()) {
      setUser(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch("/api/me");
        if (!res.ok) throw new Error("me fetch failed");
        const data = await res.json();
        if (!cancelled) setUser(data.user ?? null);
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session, status]);

  return { user, loading };
}
