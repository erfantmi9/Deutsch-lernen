import createMiddleware from "next-intl/middleware";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isLocale, LOCALE_COOKIE, routing } from "./i18n/routing";

const intl = createMiddleware(routing);

export default function middleware(request: NextRequest) {
  // A path without a language (`/`, the installed app's start page, old links like `/verbs`) opens in the language
  // the learner chose; next-intl sends everyone else to the default (Persian).
  const { pathname, search } = request.nextUrl;
  const first = pathname.split("/")[1];
  const chosen = request.cookies.get(LOCALE_COOKIE)?.value;
  if (!isLocale(first) && isLocale(chosen)) {
    const url = request.nextUrl.clone();
    url.pathname = `/${chosen}${pathname === "/" ? "" : pathname}`;
    url.search = search;
    return NextResponse.redirect(url);
  }
  return intl(request);
}

export const config = {
  // Exclude /api, /_next, /_vercel and any path containing a dot (static files)
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
