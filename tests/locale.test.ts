import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import middleware from "@/middleware";
import { routing } from "@/i18n/routing";
import { pathInLocale } from "@/lib/localePreference";

const loc = (pathname: string, search = "", hash = "") => ({ pathname, search, hash });

describe("pathInLocale", () => {
  it("swaps the language prefix and keeps query and hash", () => {
    expect(pathInLocale("fa", loc("/en/verbs/sein", "?practice=1", "#top"))).toBe("/fa/verbs/sein?practice=1#top");
  });
  it("handles the home page and paths without a prefix", () => {
    expect(pathInLocale("de", loc("/en"))).toBe("/de");
    expect(pathInLocale("de", loc("/en/"))).toBe("/de");
    expect(pathInLocale("en", loc("/"))).toBe("/en");
    expect(pathInLocale("en", loc("/verbs"))).toBe("/en/verbs");
  });
});

function run(path: string, cookie?: string) {
  const headers = new Headers({ "accept-language": "en-US,en;q=0.9" });
  if (cookie) headers.set("cookie", cookie);
  const res = middleware(new NextRequest(new URL(path, "http://localhost:3000"), { headers }));
  return { status: res.status, location: res.headers.get("location"), setCookie: res.headers.get("set-cookie") };
}

describe("middleware: default and chosen language", () => {
  it("Persian is the default, even for an English browser", () => {
    expect(routing.defaultLocale).toBe("fa");
    const r = run("/");
    expect(r.status).toBe(307);
    expect(new URL(r.location!).pathname).toBe("/fa");
  });

  it("opens / and unprefixed paths in the chosen language", () => {
    expect(new URL(run("/", "doch-locale=en").location!).pathname).toBe("/en");
    const r = run("/verbs?x=1", "doch-locale=de");
    expect(new URL(r.location!).pathname).toBe("/de/verbs");
    expect(new URL(r.location!).search).toBe("?x=1");
  });

  it("ignores an unknown cookie value", () => {
    expect(new URL(run("/", "doch-locale=xx").location!).pathname).toBe("/fa");
  });

  it("leaves pages with a language alone and sets no next-intl cookie", () => {
    const r = run("/en/verbs", "doch-locale=fa");
    expect(r.location).toBeNull();
    expect(r.setCookie ?? "").not.toContain("NEXT_LOCALE");
  });
});
