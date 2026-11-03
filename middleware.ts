import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Exclude /api, /_next, /_vercel and any path containing a dot (static files)
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
