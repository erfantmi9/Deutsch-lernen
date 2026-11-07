"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useLocale, useTranslations } from "next-intl";
import { PASSWORD_MIN } from "@/lib/authSchemas";

type Mode = "signIn" | "signUp";

/** Email + password first (sign in or create an account), Google as the second option. */
export default function LoginForm({ googleEnabled }: { googleEnabled: boolean }) {
  const t = useTranslations("Login");
  const locale = useLocale();
  const [mode, setMode] = useState<Mode>("signIn");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [callbackUrl, setCallbackUrl] = useState(`/${locale}`);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cb = params.get("callbackUrl");
    // Only same-site paths, never another host.
    if (cb && cb.startsWith("/") && !cb.startsWith("//")) setCallbackUrl(cb);
    const err = params.get("error");
    if (err === "OAuthAccountNotLinked") setError(t("errors.notLinked"));
    else if (err) setError(t("errors.generic"));
  }, [t]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === "signUp") {
        const res = await fetch("/api/register", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        if (res.status === 409) return setError(t("errors.exists"));
        if (!res.ok) return setError(t("errors.invalid"));
      }
      const result = await signIn("credentials", { email, password, redirect: false });
      if (!result || result.error) return setError(t("errors.wrong"));
      window.location.assign(callbackUrl);
    } catch {
      setError(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  }

  const input =
    "w-full rounded-xl border border-border bg-surface px-3 py-2.5 text-base outline-none focus:ring-2 focus:ring-primary";
  const isSignUp = mode === "signUp";

  return (
    <div className="mx-auto w-full max-w-sm py-10">
      <h1 className="mb-6 text-2xl font-bold">{isSignUp ? t("signUpTitle") : t("signInTitle")}</h1>

      <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate={false}>
        {isSignUp && (
          <label className="flex flex-col gap-1.5 text-sm font-medium">
            {t("fullName")}
            <input
              className={input}
              name="name"
              autoComplete="name"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
        )}
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("email")}
          <input
            className={input}
            type="email"
            name="email"
            autoComplete="email"
            dir="ltr"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="flex flex-col gap-1.5 text-sm font-medium">
          {t("password")}
          <input
            className={input}
            type="password"
            name="password"
            autoComplete={isSignUp ? "new-password" : "current-password"}
            dir="ltr"
            required
            minLength={isSignUp ? PASSWORD_MIN : 1}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {isSignUp && <span className="text-xs font-normal text-text-muted">{t("passwordHint", { min: PASSWORD_MIN })}</span>}
        </label>

        {error && (
          <p role="alert" className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-primary px-4 py-2.5 font-semibold text-on-primary disabled:opacity-60"
        >
          {isSignUp ? t("createAccount") : t("signIn")}
        </button>
      </form>

      <p className="mt-4 text-center text-sm">
        {isSignUp ? t("haveAccount") : t("noAccount")}{" "}
        <button
          type="button"
          className="font-semibold underline underline-offset-2"
          onClick={() => {
            setMode(isSignUp ? "signIn" : "signUp");
            setError(null);
          }}
        >
          {isSignUp ? t("signIn") : t("createAccount")}
        </button>
      </p>

      {googleEnabled && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-text-muted">
            <span className="h-px flex-1 bg-border" />
            {t("or")}
            <span className="h-px flex-1 bg-border" />
          </div>
          <button
            type="button"
            onClick={() => void signIn("google", { callbackUrl })}
            className="w-full rounded-xl border border-border px-4 py-2.5 font-medium"
          >
            {t("google")}
          </button>
        </>
      )}
    </div>
  );
}
