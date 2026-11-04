/**
 * One shared screen-reader announcer per page, so that many buttons (e.g. a list of AddToReviewButtons) can announce
 * without each owning a live region. The rule is one live region per screen:
 *
 * - If the page already has a live region, it hosts the announcer: FilterBar and FeedbackRegion render an
 *   <AnnounceHost /> (an sr-only span with [data-announce-host]) inside their role=status element.
 * - Otherwise a single sr-only role=status element is appended to <body> while at least one announcing component is
 *   mounted (reference counted), and removed with the last one, so it never lingers on the next route.
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

function hasHost() {
  return document.querySelector(HOST) !== null;
}

/** Call from an announcing component's mount effect; returns the cleanup. */
export function retainAnnouncer(): () => void {
  users++;
  if (!hasHost()) createFallback();
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

/** The host went away: bring the fallback back if anything still announces. */
export function hostUnmounted() {
  // The leaving host is still in the DOM during cleanup; check after it is gone.
  queueMicrotask(() => {
    if (users > 0 && !hasHost()) createFallback();
  });
}

let timer: ReturnType<typeof setTimeout> | undefined;

/** Speaks `message` politely. Clears first so that the same text twice in a row is announced again. */
export function announce(message: string) {
  if (typeof document === "undefined") return;
  const target = document.querySelector<HTMLElement>(HOST) ?? (createFallback(), fallback);
  if (!target) return;
  target.textContent = "";
  clearTimeout(timer);
  timer = setTimeout(() => {
    target.textContent = message;
  }, 60);
}
