"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { SyncStatus } from "@/lib/sync";
import { useSession } from "@/lib/useSession";

/** "Sign in" when signed out; the first name plus a sync dot (links to the account page) when signed in. */
export default function AccountButton() {
  const t = useTranslations("Account");
  const locale = useLocale();
  const session = useSession();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [back, setBack] = useState("/");

  useEffect(() => setBack(window.location.pathname), []);

  useEffect(() => {
    if (!session) return;
    void import("@/lib/sync").then(({ startSync }) => startSync(setStatus));
  }, [session]);

  if (session === undefined) return null;

  const base = "inline-flex h-9 max-w-[9rem] items-center gap-1.5 rounded-full border border-border px-3 text-sm whitespace-nowrap";

  if (!session) {
    return (
      <a href={`/${locale}/login?callbackUrl=${encodeURIComponent(back)}`} className={base}>
        {t("signIn")}
      </a>
    );
  }

  const dot = status === "error" ? "bg-danger" : status === "syncing" ? "bg-warning" : "bg-success";
  const firstName = session.user.name?.split(" ")[0] || t("account");
  return (
    <a href={`/${locale}/account`} className={base} title={session.user.email ?? undefined}>
      <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden="true" />
      <span className="sr-only">{t(`status.${status}`)}</span>
      <span className="truncate">{firstName}</span>
    </a>
  );
}
