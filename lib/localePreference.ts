"use client";

import { isLocale, LOCALE_COOKIE } from "@/i18n/routing";
import type { Locale } from "@/i18n/routing";
import { loadSession } from "@/lib/useSession";

/**
 * The learner's interface language.
 *
 * - On this device: the LOCALE_COOKIE (one year). middleware.ts uses it to open `/` in that language.
 * - With an account: also saved on the account (`/api/locale`), so every device opens in it. Once per browser session
 *   (when the app is opened, or right after signing in) the saved language is applied.
 *
 * When saving to the account fails (offline), the choice waits in PENDING_KEY and is sent on the next check, so the
 * old saved language cannot switch the learner back.
 */

const YEAR = 60 * 60 * 24 * 365;
const PENDING_KEY = "deutsch-learner:locale-pending";
const CHECKED_KEY = "deutsch-learner:locale-checked";
const SAVE_TIMEOUT_MS = 3000;

export function writeLocaleCookie(locale: Locale) {
  const secure = window.location.protocol === "https:" ? "; secure" : "";
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${YEAR}; samesite=lax${secure}`;
}

function readLocaleCookie(): Locale | null {
  const m = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE}=([^;]*)`));
  return m && isLocale(m[1]) ? m[1] : null;
}

function storage(kind: "local" | "session"): Storage | null {
  try {
    return kind === "local" ? window.localStorage : window.sessionStorage;
  } catch {
    return null;
  }
}

async function putLocale(locale: Locale): Promise<boolean> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), SAVE_TIMEOUT_MS);
  try {
    const res = await fetch("/api/locale", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ locale }),
      signal: ctrl.signal,
      keepalive: true,
    });
    return res.ok;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

/** Remembers a language the learner picked: on this device, and on the account when signed in. */
export async function chooseLocale(locale: Locale): Promise<void> {
  writeLocaleCookie(locale);
  const session = await loadSession();
  if (!session?.user) return;
  if (await putLocale(locale)) storage("local")?.removeItem(PENDING_KEY);
  else storage("local")?.setItem(PENDING_KEY, locale);
}

/** `/en/verbs?x=1#y` in another language. */
export function pathInLocale(locale: Locale, loc: Pick<Location, "pathname" | "search" | "hash">): string {
  const parts = loc.pathname.split("/");
  if (isLocale(parts[1])) parts.splice(1, 1);
  const rest = parts.join("/").replace(/^\/$/, "");
  return `/${locale}${rest}${loc.search}${loc.hash}`;
}

/**
 * Signed in: once per browser session, opens the app in the account's language (a full reload when it differs from the
 * page's). An account without a saved language takes this device's choice, or the language in use.
 */
export async function applyAccountLocale(current: Locale): Promise<void> {
  const session = await loadSession();
  const userId = session?.user?.id;
  if (!userId) return;
  const tab = storage("session");
  const flag = `${CHECKED_KEY}:${userId}`;
  if (tab?.getItem(flag)) return;

  const pending = storage("local")?.getItem(PENDING_KEY);
  if (isLocale(pending)) {
    if (await putLocale(pending)) {
      storage("local")?.removeItem(PENDING_KEY);
      tab?.setItem(flag, "1");
    }
    return;
  }

  let saved: Locale | null = null;
  try {
    const res = await fetch("/api/locale", { cache: "no-store" });
    if (!res.ok) return;
    const body = (await res.json()) as { locale?: unknown };
    saved = isLocale(body.locale) ? body.locale : null;
  } catch {
    return;
  }
  tab?.setItem(flag, "1");

  const target = saved ?? readLocaleCookie() ?? current;
  if (!saved) await putLocale(target);
  writeLocaleCookie(target);
  if (target !== current) window.location.replace(pathInLocale(target, window.location));
}
