/** One-row scoreboard (label + value pairs). Compact so a quiz question and its feedback fit a phone screen. */
export default function ScoreStrip({ items }: { items: readonly (readonly [string, number])[] }) {
  return (
    <dl className="flex items-center justify-between gap-2 rounded-full border border-border bg-surface px-4 py-1.5 text-sm shadow-soft">
      {items.map(([label, value]) => (
        <div key={label} className="flex items-baseline gap-1.5">
          <dt className="eyebrow">{label}</dt>
          <dd className="font-extrabold tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
