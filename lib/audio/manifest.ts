import raw from "../../data/audio/manifest.json";

/** Recordings made by scripts/generate-audio.ts: clip key -> file in public/audio. */

export const MANIFEST_VERSION = 1;
export const MANIFEST_FILE = "data/audio/manifest.json";
export const AUDIO_DIR = "public/audio";

export interface AudioManifest {
  version: number;
  clips: Record<string, { file: string; voice: string }>;
}

const manifest = raw as AudioManifest;

/** URL of a recording, or null when it has not been recorded (the exercise then uses the browser's voice). */
export function clipSrc(key: string): string | null {
  const c = manifest.clips[key];
  return c ? `/audio/${c.file}` : null;
}

export const recordedClipCount = (): number => Object.keys(manifest.clips).length;
