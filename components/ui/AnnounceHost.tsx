"use client";

import { useEffect } from "react";
import { hostMounted, hostUnmounted } from "@/lib/announce";

/**
 * Put inside a page's existing live region (role=status): shared announcements (lib/announce) are written here, so the
 * page keeps exactly one live region.
 */
export default function AnnounceHost() {
  useEffect(() => {
    hostMounted();
    return hostUnmounted;
  }, []);
  return <span data-announce-host="" className="sr-only" />;
}
