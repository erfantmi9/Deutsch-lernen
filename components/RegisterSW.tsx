"use client";

import { useEffect } from "react";

/** Registers the offline service worker in production builds only. Renders nothing. */
export default function RegisterSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      /* Offline support is optional: the app works the same without it. */
    });
  }, []);
  return null;
}
