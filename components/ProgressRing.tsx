/** Circular progress indicator. `value` is 0-1. The percentage is shown as text in the centre. */
export default function ProgressRing({
  value,
  size = 64,
  label,
}: {
  value: number;
  size?: number;
  /** Accessible description, e.g. "Progress: 40%". */
  label: string;
}) {
  const clamped = Math.min(1, Math.max(0, value));
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <div role="img" aria-label={label} className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" className="-rotate-90">
        <circle cx={32} cy={32} r={r} fill="none" strokeWidth={7} className="stroke-surface-2" />
        <circle
          cx={32}
          cy={32}
          r={r}
          fill="none"
          strokeWidth={7}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - clamped)}
          className="stroke-primary transition-[stroke-dashoffset] duration-500"
        />
      </svg>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center text-xs font-extrabold tabular-nums"
      >
        {Math.round(clamped * 100)}%
      </span>
    </div>
  );
}
