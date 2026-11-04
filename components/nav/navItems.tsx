import type { ReactNode } from "react";

export type NavKey =
  | "home"
  | "grammar"
  | "verbs"
  | "vocabulary"
  | "numbers"
  | "arcade"
  | "sentences"
  | "listen"
  | "review"
  | "dialogues"
  | "reading"
  | "exam"
  | "progress";

export type GroupKey = "learn" | "practice" | "read" | "more";

export interface NavLeaf {
  key: NavKey;
  /** Locale-less path. */
  href: string;
  icon: ReactNode;
}

export type NavEntry =
  | { type: "link"; item: NavLeaf }
  | { type: "group"; key: GroupKey; icon: ReactNode; items: readonly NavLeaf[] };

const svgProps = {
  viewBox: "0 0 24 24",
  width: 24,
  height: 24,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
};

const icon = (children: ReactNode): ReactNode => <svg {...svgProps}>{children}</svg>;

export const ICONS = {
  home: icon(
    <>
      <path d="M3.5 11 12 4l8.5 7" />
      <path d="M5.5 10v9.5h13V10" />
      <path d="M10 19.5v-5h4v5" />
    </>,
  ),
  grammar: icon(
    <>
      <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" />
      <path d="M12 6.5v13" />
    </>,
  ),
  arcade: icon(
    <>
      <rect x="3" y="7" width="18" height="11" rx="4" />
      <path d="M8 10.5v4M6 12.5h4" />
      <circle cx="15.5" cy="11.5" r="1" />
      <circle cx="17.5" cy="14" r="1" />
    </>,
  ),
  verbs: icon(<path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />),
  sentences: icon(
    <>
      <path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1h-8l-4.5 3.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z" />
      <path d="M7.5 10h9M7.5 13h5" />
    </>,
  ),
  vocabulary: icon(
    <>
      <rect x="4" y="4" width="16" height="16" rx="3" />
      <path d="M8 9h8M8 13h8M8 17h4" />
    </>,
  ),
  numbers: icon(
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3 2" />
    </>,
  ),
  listen: icon(
    <>
      <path d="M4 10v4h4l5 4V6L8 10z" />
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a8 8 0 0 1 0 11" />
    </>,
  ),
  review: icon(
    <>
      <path d="M4 12a8 8 0 0 1 14-5.3L20 9" />
      <path d="M20 4v5h-5" />
      <path d="M20 12a8 8 0 0 1-14 5.3L4 15" />
      <path d="M4 20v-5h5" />
    </>,
  ),
  dialogues: icon(
    <>
      <path d="M4 5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H9l-3 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
      <path d="M17 9h3a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1v3l-3-3h-4" />
    </>,
  ),
  reading: icon(
    <>
      <path d="M6 3.5h9l4 4V20a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4.5a1 1 0 0 1 1-1z" />
      <path d="M14.5 3.5v4.5H19M8.5 12h7M8.5 16h5" />
    </>,
  ),
  exam: icon(
    <>
      <path d="M12 3.5 3 8l9 4.5L21 8z" />
      <path d="M7 10.5v5c1.5 1.5 3 2 5 2s3.5-.5 5-2v-5" />
    </>,
  ),
  progress: icon(
    <>
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </>,
  ),
  learn: icon(
    <>
      <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5z" />
      <path d="M12 6.5v13" />
    </>,
  ),
  practice: icon(
    <>
      <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />
    </>,
  ),
  read: icon(
    <>
      <path d="M4 5h11a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H9l-3 3v-3H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z" />
      <path d="M17 9h3a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1h-1v3l-3-3h-4" />
    </>,
  ),
  search: icon(
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.5 4.5" />
    </>,
  ),
  chevron: icon(<path d="m6 9 6 6 6-6" />),
  more: icon(
    <>
      <circle cx="5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="19" cy="12" r="1.5" />
    </>,
  ),
} as const;

const leaf = (key: NavKey, href: string): NavLeaf => ({ key, href, icon: ICONS[key] });

export const NAV_ENTRIES: readonly NavEntry[] = [
  { type: "link", item: leaf("home", "/") },
  {
    type: "group",
    key: "learn",
    icon: ICONS.learn,
    items: [leaf("grammar", "/grammar"), leaf("verbs", "/verbs"), leaf("vocabulary", "/vocabulary"), leaf("numbers", "/numbers")],
  },
  {
    type: "group",
    key: "practice",
    icon: ICONS.practice,
    items: [leaf("arcade", "/arcade"), leaf("sentences", "/sentences"), leaf("listen", "/listen"), leaf("review", "/review")],
  },
  { type: "group", key: "read", icon: ICONS.read, items: [leaf("dialogues", "/dialogues"), leaf("reading", "/reading")] },
  { type: "link", item: leaf("exam", "/exam") },
  { type: "link", item: leaf("progress", "/progress") },
];

/**
 * Desktop header: the content column is only max-w-4xl wide, so the full six-entry nav can never fit with its
 * text labels. These entries stay inline; everything else lives in a "More" menu.
 */
export const HEADER_INLINE_ENTRIES: readonly NavEntry[] = NAV_ENTRIES.filter(
  (e) => (e.type === "link" ? e.item.key === "home" : e.key === "learn" || e.key === "practice"),
);
export const HEADER_MORE_ITEMS: readonly NavLeaf[] = [
  leaf("dialogues", "/dialogues"),
  leaf("reading", "/reading"),
  leaf("exam", "/exam"),
  leaf("progress", "/progress"),
];

/** `pathname` comes from next-intl's usePathname(), i.e. without the locale prefix. */
export function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export const isGroupActive = (pathname: string, items: readonly NavLeaf[]): boolean => items.some((i) => isActivePath(pathname, i.href));
