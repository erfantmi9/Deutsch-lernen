import type { ReactNode } from "react";

/**
 * Quiz/drill feedback slot. Render it directly under the question card. The live region is ALWAYS mounted and its
 * height reserved (--feedback-min-h), so showing a result never shifts the layout or loses announcements.
 */
export default function FeedbackRegion({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={"min-h-feedback " + className}>
      {children}
    </div>
  );
}
