/**
 * One shared screen-reader announcer per page, so that many buttons (e.g. a list of AddToReviewButtons) can announce
 * without each owning a live region. The rule is one live region per screen:
 *
 * - If the page already has a live region, it hosts the announcer: FilterBar and FeedbackRegion render an
 *   <AnnounceHost /> (an sr-only span with [data-announce-host]) inside their role=status element.
 * - Otherwise a single sr-only role=status element is appended to <body> on the first announcement (so a page where
 *   nothing was announced has no extra live region) and removed with the last announcing component (reference
 *   counted), so it never lingers on the next route. A host mounting later (e.g. a quiz opening) takes over and the
 *   fallback is removed, so there is still only one region.
 */
const HOST = "[data-announce-host]";
let users = 0;
let fallback: HTMLElement | null = null;

function createFallback() {
  if (fallback || typeof document === "undefined") return;
  fallback = document.createElement("div");
  fallback.setAttribute("role", "status");
  fallback.setAttribute("aria-live", "polite");
  fallback.className = "sr-only";
  fallback.setAttribute("data-announcer", "");
  document.body.appendChild(fallback);
}

function removeFallback() {
  fallback?.remove();
  fallback = null;
}

/** Call from an announcing component's mount effect; returns the cleanup. */
export function retainAnnouncer(): () => void {
  users++;
  return () => {
    users--;
    if (users <= 0) {
      users = 0;
      removeFallback();
    }
  };
}

/** A page live region that can host announcements mounted: the body fallback would be a second region. */
export function hostMounted() {
  removeFallback();
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Speaks `message` politely. Clears first so that the same text twice in a row is announced again. */
export function announce(message: string) {
  if (typeof document === "undefined") return;
  const host = document.querySelector<HTMLElement>(HOST);
  const fresh = !host && !fallback;
  if (!host) createFallback();
  const target = host ?? fallback;
  if (!target) return;
  target.textContent = "";
  clearTimeout(timer);
  // A region that was just inserted needs a moment to be registered by screen readers before its text changes.
  timer = setTimeout(() => {
    target.textContent = message;
  }, fresh ? 150 : 60);
}
