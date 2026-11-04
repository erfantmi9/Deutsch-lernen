/** Mascot head ("Vogel") used as the logo mark. Flat vector, navy outline, no text. */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M24 5c1 3 0 5-1 6M28 6c1 2 1 4 0 5" stroke="#1f2937" strokeWidth="2.5" />
      <circle cx="24" cy="26" r="17" fill="#fbbc04" stroke="#1f2937" strokeWidth="2.5" />
      <ellipse cx="24" cy="31" rx="10" ry="8" fill="#fff4cc" />
      <circle cx="17.5" cy="23" r="3.2" fill="#fff" stroke="#1f2937" strokeWidth="2" />
      <circle cx="30.5" cy="23" r="3.2" fill="#fff" stroke="#1f2937" strokeWidth="2" />
      <circle cx="18" cy="23.4" r="1.4" fill="#1f2937" />
      <circle cx="30" cy="23.4" r="1.4" fill="#1f2937" />
      <path d="M20.5 29h7l-3.5 5z" fill="#ea4335" stroke="#1f2937" strokeWidth="2" />
      <circle cx="12" cy="30" r="2.4" fill="#ea4335" opacity="0.35" />
      <circle cx="36" cy="30" r="2.4" fill="#ea4335" opacity="0.35" />
    </svg>
  );
}

export default function Logo() {
  return (
    <span className="flex items-center gap-2">
      <LogoMark />
      {/* Wordmark collapses to the mark on very narrow phones so the header never clips; name stays for screen readers. */}
      <span className="text-xl font-extrabold tracking-tight text-text max-[419px]:sr-only">
        <bdi dir="ltr">
          Deutsch<span className="text-primary">Lernen</span>
        </bdi>
      </span>
    </span>
  );
}
