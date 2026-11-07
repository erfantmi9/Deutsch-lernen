"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { clearLocalProgress } from "@/lib/localData";
import { signOutAndClear } from "@/lib/signOutEverywhere";
import { useSession } from "@/lib/useSession";
import { signOut } from "next-auth/react";

export default function AccountView() {
  const t = useTranslations("AccountPage");
  const locale = useLocale();
  const session = useSession();
  const [confirm, setConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  if (session === undefined) return null;
  if (!session) {
    return (
      <div className="mx-auto max-w-sm py-10 text-center">
        <p className="mb-4">{t("signedOut")}</p>
        <a href={`/${locale}/login`} className="btn btn-primary">
          {t("signIn")}
        </a>
      </div>
    );
  }

  async function deleteAccount() {
    setBusy(true);
    setError(false);
    const res = await fetch("/api/account", { method: "DELETE" }).catch(() => null);
    if (!res?.ok) {
      setBusy(false);
      setConfirm(false);
      setError(true);
      return;
    }
    await signOut({ redirect: false });
    clearLocalProgress();
    window.location.assign(`/${locale}`);
  }

  return (
    <div className="mx-auto w-full max-w-sm py-10">
      <h1 className="mb-6 text-2xl font-bold">{t("title")}</h1>

      <dl className="mb-6 flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4 text-sm">
        <div>
          <dt className="text-text-muted">{t("name")}</dt>
          <dd className="font-semibold">{session.user.name}</dd>
        </div>
        <div>
          <dt className="text-text-muted">{t("email")}</dt>
          <dd className="font-semibold" dir="ltr">
            {session.user.email}
          </dd>
        </div>
      </dl>
      <p className="mb-6 text-sm text-text-muted">{t("syncNote")}</p>

      <button type="button" disabled={busy} onClick={() => void signOutAndClear(`/${locale}`)} className="btn btn-secondary w-full">
        {t("signOut")}
      </button>
      <p className="mt-2 text-xs text-text-muted">{t("signOutNote")}</p>

      <hr className="my-8 border-border" />

      <h2 className="mb-2 font-bold text-danger">{t("deleteTitle")}</h2>
      <p className="mb-4 text-sm text-text-muted">{t("deleteText")}</p>
      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger">
          {t("deleteError")}
        </p>
      )}
      <button type="button" disabled={busy} onClick={() => setConfirm(true)} className="btn w-full bg-danger text-on-primary shadow-soft">
        {t("deleteButton")}
      </button>

      <ConfirmDialog
        open={confirm}
        title={t("deleteTitle")}
        message={t("deleteConfirm")}
        confirmLabel={t("deleteButton")}
        onConfirm={() => void deleteAccount()}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}
