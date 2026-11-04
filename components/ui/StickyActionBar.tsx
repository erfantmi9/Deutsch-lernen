"use client";

import { useLayoutEffect, useRef } from "react";
import type { ReactNode, Ref } from "react";
import { useKeyboardInset } from "./useKeyboardInset";

/**
 * Persistent primary action for quizzes, drills and exams (Check, then Next, then Continue).
 *
 * - Mount it once per page and change `label` / `onAction` instead of unmounting the button, so focus never drops.
 * - While `disabled` the button stays focusable (aria-disabled) and `status` says why ("2/4 answered, missing: 3, 4").
 *   Below sm the status sits on its own line above the controls (one line reserved, clamped to two) so long German
 *   or Persian strings never squeeze the buttons. It is a hint, never a copy of the result: results are announced by
 *   FeedbackRegion only, so there is exactly one live region speaking per answer.
 * - On mobile it is fixed to the bottom and REPLACES the bottom nav (html[data-action-bar] hides it); from lg up it
 *   is sticky inside the content column.
 * - It rides above the on-screen keyboard (see useKeyboardInset). While the keyboard is open and a `toolbar` is given
 *   (e.g. the ä ö ü ß keys) the toolbar shares the single row with the button, so the bar stays one row tall.
 * - Its measured height is published as --action-bar-measured so scroll margins and page padding stay right.
 */
export default function StickyActionBar({
  label,
  onAction,
  disabled = false,
  status,
  statusTone = "hint",
  secondary,
  toolbar,
  ref,
}: {
  label: ReactNode;
  onAction: () => void;
  disabled?: boolean;
  status?: ReactNode;
  /**
   * "hint" (default): small muted text explaining why the button is disabled. "success" / "danger": the status IS the
   * verdict of the last answer, shown larger. Use that only where the bar status is the page's single live region.
   */
  statusTone?: "hint" | "success" | "danger";
  /** Optional low-emphasis controls shown before the button (back link, Reset, Skip, Details...). Never swap them in and out; disable them instead. */
  secondary?: ReactNode;
  /** Optional compact controls shown in the row while the on-screen keyboard is open. */
  toolbar?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}) {
  const keyboard = useKeyboardInset();
  const body = useRef<HTMLDivElement>(null);
  const withToolbar = keyboard > 0 && !!toolbar;

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.dataset.actionBar = "";
    const el = body.current;
    const publish = () => el && root.style.setProperty("--action-bar-measured", `${el.offsetHeight}px`);
    const ro = el ? new ResizeObserver(publish) : null;
    if (el) {
      publish();
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
      <div ref={body} className="mx-auto flex max-w-4xl flex-wrap items-center gap-x-3 gap-y-0.5 px-4 py-2">
        {withToolbar && <div className="min-w-0 flex-1">{toolbar}</div>}
        <p
          role="status"
          aria-live="polite"
          className={
            withToolbar
              ? "sr-only"
              : "order-first min-h-5 basis-full line-clamp-2 leading-5 sm:order-none sm:min-h-0 sm:min-w-0 sm:flex-1 sm:basis-0 " +
                (statusTone === "success"
                  ? "text-sm font-bold text-success"
                  : statusTone === "danger"
                    ? "text-sm font-bold text-danger"
                    : "text-xs text-text-muted sm:text-sm")
          }
        >
          {status}
        </p>
        {!withToolbar && secondary}
        <button
          ref={ref}
          data-action-button
          type="button"
          aria-disabled={disabled}
          onClick={() => {
            if (!disabled) onAction();
          }}
          className="btn btn-primary ms-auto shrink-0 aria-disabled:cursor-not-allowed aria-disabled:opacity-60 aria-disabled:hover:translate-y-0"
        >
          {label}
        </button>
      </div>
    </div>
  );
}
