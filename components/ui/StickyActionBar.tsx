"use client";

import { useLayoutEffect } from "react";
import type { ReactNode, Ref } from "react";

/**
 * Persistent primary action for quizzes, drills and exams (Check, then Next, then Continue).
 *
 * - Mount it once per page and change `label` / `onAction` instead of unmounting the button, so focus never drops.
 * - While `disabled` the button stays focusable (aria-disabled) and `status` says why ("2/4 answered, missing: 3, 4").
 * - On mobile it is fixed to the bottom and REPLACES the bottom nav (html[data-action-bar] hides it); from lg up it
 *   is sticky inside the content column.
 * - `status` is an always-mounted live region; only its text changes.
 */
export default function StickyActionBar({
  label,
  onAction,
  disabled = false,
  status,
  secondary,
  ref,
}: {
  label: ReactNode;
  onAction: () => void;
  disabled?: boolean;
  status?: ReactNode;
  /** Optional low-emphasis control shown before the status (e.g. a back / exit link). */
  secondary?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}) {
  useLayoutEffect(() => {
    document.documentElement.dataset.actionBar = "";
    return () => {
      delete document.documentElement.dataset.actionBar;
    };
  }, []);

  return (
    <div
      data-bottom-chrome
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 pb-[var(--safe-bottom)] shadow-lift backdrop-blur lg:sticky lg:inset-x-auto lg:bottom-4 lg:mt-6 lg:rounded-3xl lg:border lg:pb-0"
    >
      <div className="mx-auto flex min-h-action-bar max-w-4xl items-center gap-3 px-4 py-2">
        {secondary}
        <p role="status" aria-live="polite" className="min-w-0 flex-1 text-sm text-text-muted">
          {status}
        </p>
        <button
          ref={ref}
          type="button"
          aria-disabled={disabled}
          onClick={() => {
            if (!disabled) onAction();
          }}
          className="btn btn-primary shrink-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:translate-y-0"
        >
          {label}
        </button>
      </div>
    </div>
  );
}
