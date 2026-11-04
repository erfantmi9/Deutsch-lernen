import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  reactStrictMode: true,
  async redirects() {
    // Old search/deep links: /verbs?verb=<id> (optionally locale-prefixed) -> /verbs/<id>.
    const hasVerb = [{ type: "query" as const, key: "verb", value: "(?<verbId>[^&]+)" }];
    return [
      { source: "/:locale(en|fa|de)/verbs", has: hasVerb, destination: "/:locale/verbs/:verbId", permanent: true },
      { source: "/verbs", has: hasVerb, destination: "/verbs/:verbId", permanent: true },
    ];
  },
};

export default withNextIntl(nextConfig);
