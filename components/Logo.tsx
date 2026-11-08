import { WORDMARK_BODY, WORDMARK_RATIO, WORDMARK_VIEWBOX } from "@/lib/brandWordmark";

/** Doch! mark: Deutschi's face (the app icon artwork without the tile). */
export function LogoMark({ size = 36 }: { size?: number }) {
  return (
    <svg viewBox="0 0 280 280" width={size} height={size} aria-hidden="true">
      <g transform="translate(140 140) scale(1.42) translate(-140 -140)">
        <ellipse cx="78" cy="150" rx="30" ry="62" fill="#6B3E1C" transform="rotate(14 78 150)" />
        <ellipse cx="202" cy="150" rx="30" ry="62" fill="#6B3E1C" transform="rotate(-14 202 150)" />
        <circle cx="140" cy="145" r="78" fill="#A0612B" />
        <ellipse cx="140" cy="182" rx="46" ry="33" fill="#D9A066" />
        <ellipse cx="140" cy="164" rx="16" ry="11" fill="#2B2118" />
        <path d="M126 192 Q140 203 154 192" fill="none" stroke="#2B2118" strokeWidth="5" strokeLinecap="round" />
        <circle cx="110" cy="128" r="9.5" fill="#2B2118" />
        <circle cx="170" cy="128" r="9.5" fill="#2B2118" />
        <circle cx="113" cy="125" r="3" fill="#fff" />
        <circle cx="173" cy="125" r="3" fill="#fff" />
      </g>
    </svg>
  );
}

/** The Doch! wordmark (the "o" holds Deutschi's face, the "!" is Deutschi standing). Static, trusted markup. */
export function Wordmark({ height = 30 }: { height?: number }) {
  return (
    <svg
      viewBox={WORDMARK_VIEWBOX}
      height={height}
      width={Math.round(height * WORDMARK_RATIO)}
      className="text-text"
      aria-hidden="true"
      dangerouslySetInnerHTML={{ __html: WORDMARK_BODY }}
    />
  );
}

export default function Logo() {
  return (
    <span className="flex items-center">
      {/* Very narrow phones show only the mark so the header never clips; the name stays for screen readers. */}
      <span className="min-[420px]:hidden">
        <LogoMark />
      </span>
      <span className="hidden min-[420px]:inline-flex">
        <Wordmark />
      </span>
      <span className="sr-only">Doch!</span>
    </span>
  );
}
