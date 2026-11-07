"use client";

import { useEffect, useId, useRef, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import type { ReactNode } from "react";
import { useTranslations } from "next-intl";

let scrollLocks = 0;
const lockScroll = () => {
  if (scrollLocks++ === 0) document.documentElement.classList.add("scroll-locked");
};
const unlockScroll = () => {
  if (--scrollLocks === 0) document.documentElement.classList.remove("scroll-locked");
};

export interface ResponsiveSheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Pinned under the scrolling body (e.g. action buttons). */
  footer?: ReactNode;
  /** "panel": bottom sheet below md, side panel from md up. "dialog": centred (used for confirmations). */
  variant?: "panel" | "dialog";
  /** Which edge the desktop side panel docks to. Logical, so it flips in RTL. */
  side?: "end" | "start";
}

export const OVERLAY_ROOT_ID = "overlay-root";
const noopSubscribe = () => () => {};
/** false during SSR and hydration, true afterwards: the portal target only exists on the client. */
const useMounted = () => useSyncExternalStore(noopSubscribe, () => true, () => false);

/**
 * Rendered through a portal into #overlay-root (an empty element the layout renders at the end of <body>), so no ancestor's layout rules (space-y-* margins, transforms,
 * overflow) can reach the dialog.
 *
 * Modal surface on the native <dialog>: showModal() gives focus trapping, Esc, an inert page and
 * aria-modal. On top of that: body scroll lock, focus return to the trigger, backdrop tap to close.
 * Slide animation lives in globals.css (.sheet) and is disabled by the global reduced-motion rule.
 */
export default function ResponsiveSheet({
  open,
  onClose,
  title,
  children,
  footer,
  variant = "panel",
  side = "end",
}: ResponsiveSheetProps) {
  const t = useTranslations("Ui");
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const mounted = useMounted();

  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    const trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog.showModal();
    // showModal() focuses the first focusable element (the close button). React's autoFocus prop calls focus() while the
    // dialog is still closed and so does nothing, hence an explicit opt-in marker for the safest control.
    dialog.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    lockScroll();
    return () => {
      if (dialog.open) dialog.close();
      unlockScroll();
      if (trigger?.isConnected) trigger.focus({ preventScroll: true });
    };
  }, [open, mounted]);

  if (!mounted) return null;
  return createPortal(
    <dialog
      ref={ref}
      aria-modal="true"
      aria-labelledby={titleId}
      data-variant={variant}
      data-side={side}
      className="sheet"
      // Esc and dialog.close() both end here; the parent owns `open`.
      onClose={() => {
        if (open) onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // backdrop tap
      }}
    >
      {open && (
        <div className="flex max-h-[85dvh] flex-col md:h-full md:max-h-none">
          <div className="flex items-start justify-between gap-3 px-5 pt-4">
            <h2 id={titleId} className="text-xl font-extrabold">
              {title}
            </h2>
            <button type="button" onClick={onClose} aria-label={t("close")} className="btn-ghost -me-2 shrink-0 text-lg">
              <span aria-hidden="true">✕</span>
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3">{children}</div>
          {footer && <div className="border-t border-border px-5 py-3 pb-[max(0.75rem,var(--safe-bottom))]">{footer}</div>}
        </div>
      )}
    </dialog>,
    // Never document.body itself: Next hydrates the whole document, and a node portalled into <body> while other parts of
    // the page are still hydrating (slow chunks on a cold start) makes React meet an unexpected node -> hydration error #418.
    document.getElementById(OVERLAY_ROOT_ID) ?? document.body,
  );
}
