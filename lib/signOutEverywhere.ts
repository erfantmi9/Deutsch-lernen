"use client";

import { signOut } from "next-auth/react";
import { clearLocalProgress } from "./localData";

/** Saves what is still unsent, signs out, then removes this browser's copy of the progress. */
export async function signOutAndClear(callbackUrl: string): Promise<void> {
  try {
    const { flushSync } = await import("./sync");
    await flushSync();
  } catch {
    /* offline: the account keeps what it had */
  }
  await signOut({ redirect: false });
  clearLocalProgress();
  window.location.assign(callbackUrl);
}
