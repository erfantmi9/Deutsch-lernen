import type { ReactNode } from "react";

export type NavKey = "home" | "arcade" | "verbs" | "sentences";

export type NavItem = {
  key: NavKey;
  href: "/" | "/arcade" | "/verbs" | "/sentences";
  icon: ReactNode;
};

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

export const NAV_ITEMS: readonly NavItem[] = [
  {
    key: "home",
    href: "/",
    icon: (
      <svg {...svgProps}>
        <path d="M3.5 11 12 4l8.5 7" />
        <path d="M5.5 10v9.5h13V10" />
        <path d="M10 19.5v-5h4v5" />
      </svg>
    ),
  },
  {
    key: "arcade",
    href: "/arcade",
    icon: (
      <svg {...svgProps}>
        <rect x="3" y="7" width="18" height="11" rx="4" />
        <path d="M8 10.5v4M6 12.5h4" />
        <circle cx="15.5" cy="11.5" r="1" />
        <circle cx="17.5" cy="14" r="1" />
      </svg>
    ),
  },
  {
    key: "verbs",
    href: "/verbs",
    icon: (
      <svg {...svgProps}>
        <path d="M13 3 5 13.5h6L10 21l8-10.5h-6z" />
      </svg>
    ),
  },
  {
    key: "sentences",
    href: "/sentences",
    icon: (
      <svg {...svgProps}>
        <path d="M4 5.5h16a1 1 0 0 1 1 1V16a1 1 0 0 1-1 1h-8l-4.5 3.5V17H4a1 1 0 0 1-1-1V6.5a1 1 0 0 1 1-1z" />
        <path d="M7.5 10h9M7.5 13h5" />
      </svg>
    ),
  },
];

/** `pathname` comes from next-intl's usePathname(), i.e. without the locale prefix. */
export function isActivePath(pathname: string, href: NavItem["href"]): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}
