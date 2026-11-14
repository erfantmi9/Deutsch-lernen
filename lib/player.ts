import { playScene, startBackground } from "./audioScene";
import type { VoiceFx } from "./audioScene";
import { getSpeakingKey, RATE, speak, speakSequence, speechKey, subscribeSpeech } from "./speech";
import type { Difficulty, Scene } from "../types/listening";

/**
 * One way to play listening texts. With a recording for every part, the recordings play in their scene (two real
 * voices, telephone or loudspeaker sound, background). Otherwise the browser's voice reads the text and, where Web Audio
 * exists, the background plays alongside. Either way the playback is reported under speechKey(id, rate), so the Play /
 * Stop buttons need not know which one runs. Call from a user gesture.
 */

export interface PlayItem {
  text: string;
  speaker?: 0 | 1;
  /** Recording of this part, if one was made. */
  src?: string | null;
  fx?: VoiceFx;
}

export interface PlaySetting {
  scene?: Scene;
  difficulty?: Difficulty;
  /** Recordings for the background murmur. */
  babble?: readonly string[];
}

/** Key the Play buttons compare with getSpeakingKey(). */
export const playKey = (id: string, slow: boolean): string => speechKey(id, slow ? RATE.slow : RATE.normal);

function withBackground(key: string, setting: PlaySetting) {
  if (!setting.scene || setting.scene === "quiet") return;
  const stop = startBackground(setting.scene, setting.difficulty ?? "real");
  if (!stop) return;
  // The browser voice gives no audio we can mix; fade the background out when it stops speaking.
  const unsubscribe = subscribeSpeech(() => {
    if (getSpeakingKey() !== key) {
      unsubscribe();
      stop();
    }
  });
}

function browserVoice(id: string, items: readonly PlayItem[], slow: boolean, setting: PlaySetting) {
  const rate = slow ? RATE.slow : RATE.normal;
  // A single text keeps the key SpeakButton already uses for it.
  const started =
    items.length === 1 && items[0].text === id
      ? speak(items[0].text, rate)
      : speakSequence(
          id,
          items.map((i) => ({ text: i.text, speaker: i.speaker })),
          rate,
        );
  if (started) withBackground(playKey(id, slow), setting);
}

export function play(id: string, items: readonly PlayItem[], slow: boolean, setting: PlaySetting = {}): void {
  const recorded = items.length > 0 && items.every((i) => !!i.src);
  if (recorded) {
    const ok = playScene({
      key: playKey(id, slow),
      parts: items.map((i) => ({ src: i.src!, speaker: i.speaker ?? 0, fx: i.fx ?? "dry" })),
      scene: setting.scene ?? "quiet",
      difficulty: setting.difficulty ?? "real",
      slow,
      babble: setting.babble,
      onFail: () => browserVoice(id, items, slow, setting),
    });
    if (ok) return;
  }
  browserVoice(id, items, slow, setting);
}
