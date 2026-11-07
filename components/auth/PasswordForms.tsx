"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { PASSWORD_MIN } from "@/lib/authSchemas";

const input =
  "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary";

/** Asks for the email and sends a reset link. Always shows the same message, whether the email has an account or not. */
export function ForgotPasswordForm() {
  const t = useTranslations("Password");
  const locale = useLocale();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "sent" | "rate" | "error">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const res = await fetch("/api/password/forgot", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, locale }),
    }).catch(() => null);
    setState(res?.ok ? "sent" : res?.status === 429 ? "rate" : "error");
  }

  return (
    <div className="mx-auto w-full max-w-sm py-10">
      <h1 className="mb-2 text-2xl font-bold">{t("forgotTitle")}</h1>
      <p className="mb-6 text-sm text-text-muted">{t("forgotText")}</p>
      {state === "sent" ? (
        <p role="status" className="rounded-xl bg-success-soft px-3 py-3 text-sm">
          {t("sent")}
        </p>
      ) : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t("email")}
            <input className={input} type="email" autoComplete="email" dir="ltr" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {(state === "rate" || state === "error") && (
            <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
              {state === "rate" ? t("rate") : t("error")}
            </p>
          )}
          <button type="submit" disabled={state === "busy"} className="btn btn-primary">
            {t("sendLink")}
          </button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <a href={`/${locale}/login`} className="font-semibold underline underline-offset-2">
          {t("backToSignIn")}
        </a>
      </p>
    </div>
  );
}

/** Sets a new password from the emailed link (?token=...). */
export function ResetPasswordForm() {
  const t = useTranslations("Password");
  const locale = useLocale();
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [state, setState] = useState<"idle" | "busy" | "done" | "expired" | "error">("idle");

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"));
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("busy");
    const res = await fetch("/api/password/reset", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    }).catch(() => null);
    if (res?.ok) return setState("done");
    const body = (await res?.json().catch(() => null)) as { error?: string } | null;
    setState(body?.error === "expired" ? "expired" : "error");
  }

  return (
    <div className="mx-auto w-full max-w-sm py-10">
      <h1 className="mb-6 text-2xl font-bold">{t("resetTitle")}</h1>
      {state === "done" ? (
        <>
          <p role="status" className="mb-6 rounded-xl bg-success-soft px-3 py-3 text-sm">
            {t("done")}
          </p>
          <a href={`/${locale}/login`} className="btn btn-primary w-full">
            {t("backToSignIn")}
          </a>
        </>
      ) : !token && token !== null ? null : (
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t("newPassword")}
            <input
              className={input}
              type="password"
              autoComplete="new-password"
              dir="ltr"
              required
              minLength={PASSWORD_MIN}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <span className="text-xs font-normal text-text-muted">{t("hint", { min: PASSWORD_MIN })}</span>
          </label>
          {(state === "expired" || state === "error" || token === "") && (
            <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
              {state === "error" ? t("error") : t("expired")}{" "}
              <a href={`/${locale}/forgot-password`} className="font-semibold underline">
                {t("newLink")}
              </a>
            </p>
          )}
          <button type="submit" disabled={state === "busy" || !token} className="btn btn-primary">
            {t("save")}
          </button>
        </form>
      )}
    </div>
  );
}
