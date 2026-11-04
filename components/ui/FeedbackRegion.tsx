import type { ReactNode, Ref } from "react";

/**
 * Quiz/drill feedback slot. Render it directly under the question card. The live region is ALWAYS mounted and its
 * height reserved (--feedback-min-h), so showing a result never shifts the layout or loses announcements.
 */
export default function FeedbackRegion({
  children,
  className = "",
  compact = false,
  ref,
}: {
  children?: ReactNode;
  className?: string;
  /** Smaller reserved height, for quizzes whose question + feedback must fit a phone screen. */
  compact?: boolean;
  ref?: Ref<HTMLDivElement>;
}) {
  return (
    <div ref={ref} role="status" aria-live="polite" className={(compact ? "min-h-feedback-sm " : "min-h-feedback ") + className}>
      {children}
    </div>
  );
}
