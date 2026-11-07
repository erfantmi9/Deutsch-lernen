"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { signOut } from "next-auth/react";
import type { SyncStatus } from "@/lib/sync";

type Session = { user?: { name?: string | null; email?: string | null } } | null;

/** Sign in / out plus a sync dot. The session is fetched on the client, so pages stay static. */
export default function AccountButton() {
  const t = useTranslations("Account");
  const locale = useLocale();
  const [session, setSession] = useState<Session | undefined>(undefined);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [back, setBack] = useState("/");

  useEffect(() => {
    let cancelled = false;
    setBack(window.location.pathname);
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then(async (s: Session) => {
        if (cancelled) return;
        const signedIn = s?.user ? s : null;
        setSession(signedIn);
        if (signedIn) {
          const { startSync } = await import("@/lib/sync");
          void startSync(setStatus);
        }
      })
      .catch(() => {
        if (!cancelled) setSession(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (session === undefined) return null;

  const base = "inline-flex h-9 items-center gap-1.5 rounded-full border border-border px-3 text-sm whitespace-nowrap";

  if (!session) {
    return (
      <a href={`/${locale}/login?callbackUrl=${encodeURIComponent(back)}`} className={base}>
        {t("signIn")}
      </a>
    );
  }

  const dot = status === "error" ? "bg-red-500" : status === "syncing" ? "bg-amber-400" : "bg-emerald-500";
  return (
    <button
      type="button"
      onClick={() => void signOut({ callbackUrl: back })}
      className={base}
      title={session.user?.email ?? undefined}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden="true" />
      <span className="sr-only">{t(`status.${status}`)}</span>
      {t("signOut")}
    </button>
  );
}
