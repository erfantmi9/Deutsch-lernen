import { reportPlayback } from "./speech";
import type { Difficulty, Scene } from "../types/listening";

/**
 * Plays recorded listening texts the way they sound in real life, with the Web Audio API:
 * - the voice through a telephone (narrow band, a little distortion) or a station loudspeaker (echo, chime first);
 * - a background for the place: a real recording of it (public/audio/ambience, made by scripts/tts/ambience.py: a café,
 *   a supermarket, a station, a street, a house, an office), plus murmur of several German speakers (recordings from
 *   other dialogues, muffled and spread around) so the people around speak German too;
 * - silence at the start and end of each recording is skipped, so the pauses between speakers are the planned ones;
 * - the difficulty sets how loud and busy the background is.
 * Everything is scheduled on the AudioContext clock, so nothing drifts. Browser only; every entry point is guarded.
 */

export type VoiceFx = "dry" | "phone" | "pa";

export interface ScenePart {
  src: string;
  speaker: 0 | 1;
  fx: VoiceFx;
}

export interface SceneOptions {
  /** Key reported to lib/speech (speechKey(id, rate)), so Play / Stop buttons follow it. */
  key: string;
  parts: readonly ScenePart[];
  scene: Scene;
  difficulty: Difficulty;
  slow: boolean;
  /** Recordings for the background murmur. */
  babble?: readonly string[];
  /** Called when a recording cannot be loaded, e.g. to fall back to the browser's voice. */
  onFail?: () => void;
}

interface SceneMix {
  /** Real recording of the place (file in public/audio/ambience) and its level. */
  ambience: string | null;
  bed: number;
  /** Level of the German murmur and how many people talk in it. */
  babble: number;
  voices: number;
  /** Line hiss of a phone. */
  hiss: number;
  /** Reverb send of the voice in this room. */
  reverb: number;
}

const AMBIENCE_DIR = "/audio/ambience";

export const SCENE_MIX: Readonly<Record<Scene, SceneMix>> = {
  quiet: { ambience: null, bed: 0, babble: 0, voices: 0, hiss: 0, reverb: 0.04 },
  home: { ambience: "home", bed: 0.2, babble: 0, voices: 0, hiss: 0, reverb: 0.08 },
  classroom: { ambience: "home", bed: 0.25, babble: 0.3, voices: 2, hiss: 0, reverb: 0.16 },
  office: { ambience: "office", bed: 0.3, babble: 0.2, voices: 2, hiss: 0, reverb: 0.1 },
  cafe: { ambience: "cafe", bed: 0.5, babble: 0.3, voices: 3, hiss: 0, reverb: 0.12 },
  shop: { ambience: "shop", bed: 0.45, babble: 0.25, voices: 3, hiss: 0, reverb: 0.12 },
  street: { ambience: "street", bed: 0.5, babble: 0, voices: 0, hiss: 0, reverb: 0.03 },
  station: { ambience: "station", bed: 0.5, babble: 0.25, voices: 3, hiss: 0, reverb: 0.25 },
  phone: { ambience: null, bed: 0, babble: 0, voices: 0, hiss: 0.7, reverb: 0.05 },
};

/** URL of the scene's background recording, if it has one. */
export const ambienceSrc = (scene: Scene): string | null => {
  const name = SCENE_MIX[scene].ambience;
  return name ? `${AMBIENCE_DIR}/${name}.mp3` : null;
};

/** Background level, number of extra voices and pause length per difficulty. */
export const DIFFICULTY_MIX: Readonly<Record<Difficulty, { level: number; extraVoices: number; gapScale: number }>> = {
  easy: { level: 0.3, extraVoices: -2, gapScale: 1.3 },
  real: { level: 0.75, extraVoices: 0, gapScale: 1 },
  hard: { level: 1.35, extraVoices: 2, gapScale: 0.6 },
};

export const SLOW_RATE = 0.88;

/* ---------- timeline (pure) ---------- */

export interface Timeline {
  /** Start of each part in seconds from the start of the scene. */
  starts: number[];
  /** When the background fades out. */
  end: number;
}

/** Parts one after another: a short pause within a speaker, a longer one when the other person answers. */
export function planTimeline(
  durations: readonly number[],
  speakers: readonly (0 | 1)[],
  opts: { rate: number; gapScale: number; leadIn: number; tail: number },
): Timeline {
  const starts: number[] = [];
  let t = opts.leadIn;
  durations.forEach((d, i) => {
    starts.push(t);
    t += d / opts.rate;
    if (i < durations.length - 1) t += (speakers[i + 1] !== speakers[i] ? 0.55 : 0.3) * opts.gapScale;
  });
  return { starts, end: t + opts.tail };
}

/* ---------- audio graph ---------- */

type AudioCtor = typeof AudioContext;
let ctx: AudioContext | null = null;

export function isAudioSupported(): boolean {
  if (typeof window === "undefined") return false;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return !!(w.AudioContext ?? w.webkitAudioContext);
}

/** The shared AudioContext, resumed. Call from a user gesture the first time (browsers start it suspended). */
function audioContext(): AudioContext | null {
  if (!isAudioSupported()) return null;
  if (!ctx) {
    const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
    ctx = new (w.AudioContext ?? w.webkitAudioContext)!();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const buffers = new Map<string, Promise<AudioBuffer>>();
function load(c: AudioContext, src: string): Promise<AudioBuffer> {
  let p = buffers.get(src);
  if (!p) {
    p = fetch(src)
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status} ${src}`);
        return r.arrayBuffer();
      })
      .then((data) => new Promise<AudioBuffer>((resolve, reject) => c.decodeAudioData(data, resolve, reject)));
    p.catch(() => buffers.delete(src));
    buffers.set(src, p);
  }
  return p;
}

/** Below this the recording counts as silence (about -45 dB). */
const SILENCE = 0.006;
const boundsCache = new WeakMap<AudioBuffer, { offset: number; duration: number }>();
/** Where the speech in a recording starts and how long it lasts, without the silence the voice service adds around it. */
export function speechBounds(samples: Float32Array, sampleRate: number): { offset: number; duration: number } {
  let first = 0;
  while (first < samples.length && Math.abs(samples[first]) < SILENCE) first++;
  let last = samples.length - 1;
  while (last > first && Math.abs(samples[last]) < SILENCE) last--;
  if (first >= last) return { offset: 0, duration: samples.length / sampleRate };
  const offset = Math.max(0, first / sampleRate - 0.04);
  const end = Math.min(samples.length / sampleRate, last / sampleRate + 0.1);
  return { offset, duration: end - offset };
}
function bounds(buf: AudioBuffer) {
  let b = boundsCache.get(buf);
  if (!b) {
    b = speechBounds(buf.getChannelData(0), buf.sampleRate);
    boundsCache.set(buf, b);
  }
  return b;
}

const noiseCache = new Map<string, AudioBuffer>();
/** Three seconds of white or brown noise, looped by the callers. */
function noise(c: AudioContext, kind: "white" | "brown"): AudioBuffer {
  const id = `${kind}:${c.sampleRate}`;
  const cached = noiseCache.get(id);
  if (cached) return cached;
  const buf = c.createBuffer(2, c.sampleRate * 3, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < d.length; i++) {
      const w = Math.random() * 2 - 1;
      if (kind === "white") d[i] = w;
      else {
        last = (last + 0.02 * w) / 1.02;
        d[i] = last * 3.5;
      }
    }
  }
  noiseCache.set(id, buf);
  return buf;
}

/** A synthetic room / hall reverb: decaying noise. */
function impulse(c: AudioContext, seconds: number, decay: number): AudioBuffer {
  const id = `ir:${seconds}:${decay}:${c.sampleRate}`;
  const cached = noiseCache.get(id);
  if (cached) return cached;
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  noiseCache.set(id, buf);
  return buf;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

interface Running {
  key: string;
  master: GainNode;
  sources: AudioScheduledSourceNode[];
  timers: number[];
  stopped: boolean;
}

let running: Running | null = null;
let token = 0;

function teardown(r: Running, fade = 0.15) {
  if (r.stopped || !ctx) return;
  r.stopped = true;
  r.timers.forEach((t) => window.clearTimeout(t));
  const now = ctx.currentTime;
  r.master.gain.cancelScheduledValues(now);
  r.master.gain.setValueAtTime(r.master.gain.value, now);
  r.master.gain.linearRampToValueAtTime(0, now + fade);
  for (const s of r.sources) {
    try {
      s.stop(now + fade + 0.02);
    } catch {
      /* already stopped */
    }
  }
  window.setTimeout(() => r.master.disconnect(), (fade + 0.1) * 1000);
  if (running === r) running = null;
}

/** Stops whatever the engine plays. */
export function stopScene(): void {
  token++;
  if (running) teardown(running);
}

function looped(c: AudioContext, r: Running, buf: AudioBuffer, when: number, offset = 0, rate = 1): AudioBufferSourceNode {
  const s = c.createBufferSource();
  s.buffer = buf;
  s.loop = true;
  s.playbackRate.value = rate;
  s.start(when, offset % buf.duration);
  r.sources.push(s);
  return s;
}

function filter(c: AudioContext, type: BiquadFilterType, freq: number, q = 0.7, gain = 0): BiquadFilterNode {
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  f.gain.value = gain;
  return f;
}

function gainNode(c: AudioContext, value: number): GainNode {
  const g = c.createGain();
  g.gain.value = value;
  return g;
}

function panner(c: AudioContext, pan: number): AudioNode {
  if (typeof c.createStereoPanner !== "function") return gainNode(c, 1);
  const p = c.createStereoPanner();
  p.pan.value = pan;
  return p;
}

/** Short decaying tone (cups, chime). */
function ping(c: AudioContext, r: Running, out: AudioNode, when: number, freqs: readonly number[], level: number, decay: number, pan = 0) {
  const p = panner(c, pan);
  p.connect(out);
  freqs.forEach((f, i) => {
    const o = c.createOscillator();
    o.frequency.value = f;
    const g = gainNode(c, 0);
    g.gain.setValueAtTime(0, when);
    g.gain.linearRampToValueAtTime(level / (i + 1), when + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
    o.connect(g).connect(p);
    o.start(when);
    o.stop(when + decay + 0.05);
    r.sources.push(o);
  });
}

/** Background for the scene from `start` to `end` (seconds on the context clock). */
function buildBackground(
  c: AudioContext,
  r: Running,
  out: AudioNode,
  reverb: AudioNode,
  scene: Scene,
  difficulty: Difficulty,
  ambience: AudioBuffer | null,
  babble: readonly AudioBuffer[],
  start: number,
  end: number,
) {
  const mix = SCENE_MIX[scene];
  const level = DIFFICULTY_MIX[difficulty].level;
  const bed = gainNode(c, 0);
  bed.connect(out);
  bed.gain.setValueAtTime(0, start);
  bed.gain.linearRampToValueAtTime(1, start + 0.8);
  bed.gain.setValueAtTime(1, Math.max(start + 0.8, end - 0.9));
  bed.gain.linearRampToValueAtTime(0, end);

  if (ambience && mix.bed > 0) looped(c, r, ambience, start, rand(0, ambience.duration)).connect(gainNode(c, mix.bed * level)).connect(bed);
  if (mix.hiss > 0) looped(c, r, noise(c, "white"), start).connect(filter(c, "highpass", 2500)).connect(gainNode(c, 0.012 * mix.hiss * Math.max(level, 0.6))).connect(bed);

  // Murmur: several real voices at once, muffled and spread around the room.
  const voices = mix.voices === 0 ? 0 : Math.max(1, mix.voices + DIFFICULTY_MIX[difficulty].extraVoices);
  if (voices > 0 && babble.length > 0) {
    const bus = gainNode(c, 1);
    bus.connect(filter(c, "lowpass", 2600)).connect(bed);
    bus.connect(gainNode(c, 0.5)).connect(reverb);
    const each = (0.45 * mix.babble * level) / Math.sqrt(voices);
    for (let i = 0; i < voices; i++) {
      const buf = babble[i % babble.length];
      looped(c, r, buf, start, rand(0, buf.duration), rand(0.96, 1.04))
        .connect(gainNode(c, each * rand(0.7, 1.15)))
        .connect(panner(c, rand(-0.9, 0.9)))
        .connect(bus);
    }
  }

  const span = end - start;
  return span;
}

/** The voice of one part through its effect chain. */
function voiceChain(c: AudioContext, fx: VoiceFx, out: AudioNode, room: AudioNode, hall: AudioNode, roomSend: number): AudioNode {
  if (fx === "phone") {
    const shaper = c.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < curve.length; i++) {
      const x = (i / (curve.length - 1)) * 2 - 1;
      curve[i] = Math.tanh(2.2 * x) / Math.tanh(2.2);
    }
    shaper.curve = curve;
    const input = filter(c, "highpass", 380);
    input.connect(filter(c, "lowpass", 3100)).connect(filter(c, "peaking", 1600, 1, 4)).connect(shaper).connect(gainNode(c, 0.85)).connect(out);
    return input;
  }
  if (fx === "pa") {
    const input = filter(c, "highpass", 320);
    const shaped = input.connect(filter(c, "lowpass", 5200)).connect(filter(c, "peaking", 2400, 1, 5));
    shaped.connect(gainNode(c, 0.7)).connect(out);
    shaped.connect(gainNode(c, 0.75)).connect(hall);
    return input;
  }
  const input = gainNode(c, 1);
  input.connect(out);
  input.connect(gainNode(c, roomSend)).connect(room);
  return input;
}

/** Station / department-store chime before an announcement. */
function chime(c: AudioContext, r: Running, out: AudioNode, when: number) {
  [784, 659, 523].forEach((f, i) => ping(c, r, out, when + i * 0.42, [f, f * 2, f * 3], 0.12, 1.3));
}

/**
 * Plays the parts in their scene. Returns false when Web Audio is missing (use the browser voice instead).
 * Call from a user gesture. Reports start, current part and end through lib/speech.
 */
export function playScene(o: SceneOptions): boolean {
  const c = audioContext();
  if (!c || o.parts.length === 0) return false;
  stopScene();
  const my = ++token;

  const master = gainNode(c, 1);
  const comp = c.createDynamicsCompressor();
  comp.threshold.value = -14;
  comp.ratio.value = 3;
  master.connect(comp).connect(c.destination);
  const r: Running = { key: o.key, master, sources: [], timers: [], stopped: false };
  running = r;
  reportPlayback(o.key, 0, () => {
    if (running === r) stopScene();
  });

  const parts = Promise.all(o.parts.map((p) => load(c, p.src)));
  const mix = SCENE_MIX[o.scene];
  const wantBabble = mix.voices > 0 ? (o.babble ?? []).slice(0, 8) : [];
  const babble = Promise.all(wantBabble.map((s) => load(c, s).catch(() => null))).then((l) => l.filter((b): b is AudioBuffer => b !== null));
  const amb = ambienceSrc(o.scene);
  const ambience = amb ? load(c, amb).catch(() => null) : Promise.resolve(null);

  Promise.all([parts, babble, ambience])
    .then(([voiceBufs, babbleBufs, ambienceBuf]) => {
      if (my !== token || r.stopped) return;
      const diff = DIFFICULTY_MIX[o.difficulty];
      const rate = o.slow ? SLOW_RATE : 1;
      const hasPa = o.parts.some((p) => p.fx === "pa");
      const quietScene = o.scene === "quiet";
      const plan = planTimeline(
        voiceBufs.map((b) => bounds(b).duration),
        o.parts.map((p) => p.speaker),
        { rate, gapScale: diff.gapScale * (o.slow ? 1.8 : 1), leadIn: quietScene ? 0.05 : hasPa ? 2.2 : 1.1, tail: quietScene ? 0.1 : 1 },
      );
      const t0 = c.currentTime + 0.08;

      const room = c.createConvolver();
      room.buffer = impulse(c, 0.7, 3);
      room.connect(master);
      const hall = c.createConvolver();
      hall.buffer = impulse(c, 2.4, 2.2);
      hall.connect(master);

      if (!quietScene) buildBackground(c, r, master, room, o.scene, o.difficulty, ambienceBuf, babbleBufs, t0, t0 + plan.end);
      if (hasPa) chime(c, r, master, t0 + 0.4);

      o.parts.forEach((p, i) => {
        const s = c.createBufferSource();
        s.buffer = voiceBufs[i];
        s.playbackRate.value = rate;
        s.connect(voiceChain(c, p.fx, master, room, hall, mix.reverb));
        const { offset, duration } = bounds(voiceBufs[i]);
        s.start(t0 + plan.starts[i], offset, duration);
        r.sources.push(s);
        if (i > 0) r.timers.push(window.setTimeout(() => !r.stopped && reportPlayback(o.key, i), (plan.starts[i] + 0.08) * 1000));
      });
      r.timers.push(
        window.setTimeout(() => {
          if (r.stopped) return;
          teardown(r, 0.05);
          reportPlayback(null);
        }, (plan.end + 0.15) * 1000),
      );
    })
    .catch(() => {
      if (my !== token) return;
      teardown(r, 0);
      reportPlayback(null);
      o.onFail?.();
    });
  return true;
}

/**
 * Only the background, for texts without a recording (spoken by the browser voice, which Web Audio cannot reach).
 * Returns a function that fades it out.
 */
export function startBackground(scene: Scene, difficulty: Difficulty, maxSeconds = 90): (() => void) | null {
  if (scene === "quiet") return null;
  const c = audioContext();
  if (!c) return null;
  const master = gainNode(c, 1);
  master.connect(c.destination);
  const r: Running = { key: "", master, sources: [], timers: [], stopped: false };
  const reverb = c.createConvolver();
  reverb.buffer = impulse(c, 0.7, 3);
  reverb.connect(master);
  const src = ambienceSrc(scene);
  // Starts as soon as the recording is loaded (cached after the first time); the phone hiss needs none.
  void (src ? load(c, src).catch(() => null) : Promise.resolve(null)).then((ambience) => {
    if (r.stopped) return;
    const t0 = c.currentTime + 0.02;
    buildBackground(c, r, master, reverb, scene, difficulty, ambience, [], t0, t0 + maxSeconds);
  });
  r.timers.push(window.setTimeout(() => teardown(r, 0.6), maxSeconds * 1000));
  return () => teardown(r, 0.6);
}
