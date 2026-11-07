"use client";

/**
 * Removes every saved progress key from this browser. Used on sign-out and account deletion, so the next person on
 * a shared device doesn't see (or upload into their own account) the previous learner's progress.
 * Keeps settings that are not progress, such as the theme.
 */
export function clearLocalProgress(): void {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith("deutsch-learner:")) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    /* storage blocked: nothing saved to clear */
  }
}
