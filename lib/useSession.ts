"use client";

import { useEffect, useState } from "react";

export type ClientSession = { user: { id?: string; name?: string | null; email?: string | null } } | null;

let cached: Promise<ClientSession> | null = null;

/** Fetched once per page load, shared by every component that asks. */
export function loadSession(): Promise<ClientSession> {
  cached ??= fetch("/api/auth/session", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((s: { user?: ClientSession extends null ? never : NonNullable<ClientSession>["user"] } | null) =>
      s?.user ? { user: s.user } : null,
    )
    .catch(() => null);
  return cached;
}

/** `undefined` while loading, `null` when signed out. */
export function useSession(): ClientSession | undefined {
  const [session, setSession] = useState<ClientSession | undefined>(undefined);
  useEffect(() => {
    let alive = true;
    void loadSession().then((s) => alive && setSession(s));
    return () => {
      alive = false;
    };
  }, []);
  return session;
}
