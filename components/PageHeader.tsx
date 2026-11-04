import type { ReactNode } from "react";

/**
 * Page title block with a header illustration; the illustration shrinks on small screens.
 *
 * `compact`: for quiz / drill pages whose question must fit above the fold. `true`: below `sm` and on short screens
 * (max-height 700px) only the title is shown, the illustrated card appears everywhere else. `"always"`: title only at
 * every size, for pages whose main task is a builder or drill (Sentences, Arcade, the drills). Use it on every module.
 */
export default function PageHeader({
  title,
  subtitle,
  illustration,
  actions,
  compact = false,
}: {
  title: string;
  subtitle?: string;
  illustration?: ReactNode;
  actions?: ReactNode;
  compact?: boolean | "always";
}) {
  const full = (
    <header className={"card-hero flex items-center justify-between gap-4 overflow-hidden p-5 sm:p-6" + (compact === true ? " ph-full" : "")}>
      <div className="min-w-0 space-y-2">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {subtitle && <p className="text-text-muted">{subtitle}</p>}
        {actions && <div className="pt-1">{actions}</div>}
      </div>
      {illustration && <div className="w-24 shrink-0 sm:w-56 [&>svg]:h-auto [&>svg]:w-full">{illustration}</div>}
    </header>
  );
  if (!compact) return full;
  // "always": builder / drill pages, whose task is the exercise itself. No illustrated card at any size.
  if (compact === "always") {
    return (
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {actions}
      </div>
    );
  }

  // CSS (not JS) picks one, so there is no flash; the hidden one is display:none and so absent from the a11y tree.
  return (
    <>
      {full}
      <div className="ph-compact flex items-center justify-between gap-3">
        <h1 className="text-2xl font-extrabold">{title}</h1>
        {actions}
      </div>
    </>
  );
}
