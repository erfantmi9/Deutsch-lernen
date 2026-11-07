/** Mascot head ("Dackel") used as the logo mark. Flat vector, navy outline, no text. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <g stroke="#1f2937" strokeWidth="2.5">
        <circle cx="21" cy="24" r="15" fill="#b8682e" />
        <ellipse cx="33" cy="31" rx="10" ry="7" fill="#f1c48d" />
        <path d="M13 12c-7 2-10 11-8 21 2 5 7 6 9 1 3-7 3-15-1-22z" fill="#7a4321" />
      </g>
      <ellipse cx="42" cy="28" rx="3.2" ry="2.7" fill="#1f2937" />
      <circle cx="25" cy="20" r="4" fill="#fff" stroke="#1f2937" strokeWidth="2" />
      <circle cx="26.2" cy="20" r="2.1" fill="#1f2937" />
      <path d="M30 35q4 3 8 0" stroke="#1f2937" strokeWidth="2" />
      <circle cx="27" cy="31" r="2.4" fill="#ea4335" opacity="0.35" />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      {/* Wordmark collapses to the mark on very narrow phones so the header never clips; name stays for screen readers. */}
      <span className="text-xl font-extrabold tracking-tight text-text sr-only min-[420px]:not-sr-only">
        <bdi dir="ltr">
          Deutsch<span className="text-primary">Lernen</span>
        </bdi>
      </span>
    </span>
  );
}
