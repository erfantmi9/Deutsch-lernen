"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode, Ref } from "react";
import { useKeyboardInset } from "./useKeyboardInset";

/**
 * Persistent primary action for quizzes, drills and exams (Check, then Next, then Continue).
 *
 * - Mount it once per page and change `label` / `onAction` instead of unmounting the button, so focus never drops.
 * - While `disabled` the button stays focusable (aria-disabled) and `status` says why ("2/4 answered, missing: 3, 4").
 * - On mobile it is fixed to the bottom and REPLACES the bottom nav (html[data-action-bar] hides it); from lg up it
 *   is sticky inside the content column.
 * - `status` is an always-mounted live region; only its text changes.
 * - It rides above the on-screen keyboard (visualViewport, see useKeyboardInset). `toolbar` is an optional row above
 *   the action (e.g. the ä ö ü ß keys) so it stays reachable above the keyboard too.
 * - Its measured height is published as --action-bar-measured so scroll margins and page padding stay right.
 */
export default function StickyActionBar({
  label,
  onAction,
  disabled = false,
  status,
  secondary,
  toolbar,
  ref,
}: {
  label: ReactNode;
  onAction: () => void;
  disabled?: boolean;
  status?: ReactNode;
  /** Optional low-emphasis control shown before the status (e.g. a back / exit link). */
  secondary?: ReactNode;
  /** Optional row above the action row. */
  toolbar?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}) {
  const keyboard = useKeyboardInset();
  const body = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.actionBar = "";
    const el = body.current;
    const ro = el ? new ResizeObserver(() => root.style.setProperty("--action-bar-measured", `${el.offsetHeight}px`)) : null;
    if (el) {
      root.style.setProperty("--action-bar-measured", `${el.offsetHeight}px`);
      ro?.observe(el);
    }
    return () => {
      ro?.disconnect();
      delete root.dataset.actionBar;
      root.style.removeProperty("--action-bar-measured");
    };
  }, []);

  return (
    <div
      data-bottom-chrome
      className={
        "fixed inset-x-0 bottom-[var(--keyboard-inset,0px)] z-40 border-t border-border bg-surface/95 shadow-lift backdrop-blur lg:sticky lg:inset-x-auto lg:bottom-4 lg:mt-6 lg:rounded-3xl lg:border lg:pb-0 " +
        // The home-indicator inset only applies when nothing (the keyboard) sits between the bar and the screen edge.
        (keyboard > 0 ? "pb-0" : "pb-[var(--safe-bottom)]")
      }
    >
      <div ref={body}>
        {toolbar && <div className="mx-auto max-w-4xl border-b border-border/60 px-4 py-1.5">{toolbar}</div>}
        <div className="mx-auto flex min-h-action-bar max-w-4xl items-center gap-3 px-4 py-2">
          {secondary}
          <p role="status" aria-live="polite" className="min-w-0 flex-1 text-sm text-text-muted">
            {status}
          </p>
          <button
            ref={ref}
            data-action-button
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
    </div>
  );
}
