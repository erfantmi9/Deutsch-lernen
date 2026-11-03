import type { ReactNode } from "react";

/** Page title block with a header illustration; the illustration shrinks on small screens. */
export default function PageHeader({
  title,
  subtitle,
  illustration,
  actions,
}: {
  title: string;
  subtitle?: string;
  illustration?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="card-hero flex items-center justify-between gap-4 overflow-hidden p-5 sm:p-6">
      <div className="min-w-0 space-y-2">
        <h1 className="text-3xl font-extrabold sm:text-4xl">{title}</h1>
        {subtitle && <p className="text-text-muted">{subtitle}</p>}
        {actions && <div className="pt-1">{actions}</div>}
      </div>
      {illustration && <div className="w-24 shrink-0 sm:w-56 [&>svg]:h-auto [&>svg]:w-full">{illustration}</div>}
    </header>
  );
}
