import type { ReactNode, Ref } from "react";

/**
 * Quiz/drill feedback slot. Render it directly under the question card. The live region is ALWAYS mounted and its
 * height reserved (--feedback-min-h), so showing a result never shifts the layout or loses announcements.
 */
export default function FeedbackRegion({ children, className = "", ref }: { children?: ReactNode; className?: string; ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} role="status" aria-live="polite" className={"min-h-feedback " + className}>
      {children}
    </div>
  );
}
