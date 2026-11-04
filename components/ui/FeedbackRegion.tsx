import type { ReactNode, Ref } from "react";

const RESERVE = { sm: "min-h-feedback-sm", md: "min-h-feedback", lg: "min-h-feedback-lg" } as const;

/**
 * Quiz/drill feedback slot. Render it directly under the question card. The live region is ALWAYS mounted and its
 * height reserved (--feedback-min-h), so showing a result never shifts the layout or loses announcements.
 */
export default function FeedbackRegion({
  children,
  className = "",
  size = "md",
  ref,
}: {
  children?: ReactNode;
  className?: string;
  /** Reserved height: sm = one-line verdict, md = verdict + hint, lg = verdict + filled sentence + explanation. */
  size?: "sm" | "md" | "lg";
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={ref} role="status" aria-live="polite" className={RESERVE[size] + " " + className}>
      {children}
    </div>
  );
}
