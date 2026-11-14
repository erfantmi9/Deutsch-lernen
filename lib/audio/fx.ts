import type { VoiceFx } from "../audioScene";
import type { ListeningMessage } from "../../types/listening";

/** Announcements in a station, shop or bus come through a loudspeaker; phone messages and the far end of a call through a phone. */
export function messageFx(m: ListeningMessage, speaker: 0 | 1): VoiceFx {
  if (m.kind === "announcement") return m.scene === "station" || m.scene === "shop" || m.scene === "street" ? "pa" : "dry";
  if (m.kind === "phone") return "phone";
  return m.phoneSpeaker === speaker ? "phone" : "dry";
}
