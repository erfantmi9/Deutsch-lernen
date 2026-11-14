import { reportPlayback } from "./speech";
import type { Difficulty, Scene } from "../types/listening";

/**
 * Plays recorded listening texts the way they sound in real life, with the Web Audio API:
 * - the voice through a telephone (narrow band, a little distortion) or a station loudspeaker (echo, chime first);
 * - a background for the place: murmur of several German speakers (real recordings from other dialogues, filtered and
 *   spread around), cups in a café, scanner beeps in a shop, passing cars, station rumble, typing in an office;
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
  /** Room tone (soft brown noise). */
  room: number;
  /** Level of the murmur and how many people talk in it. */
  babble: number;
  voices: number;
  events: "clinks" | "beeps" | "traffic" | "typing" | null;
  /** Low rumble (traffic, trains). */
  rumble: number;
  /** Line hiss of a phone. */
  hiss: number;
  /** Reverb send of the voice in this room. */
  reverb: number;
}

export const SCENE_MIX: Readonly<Record<Scene, SceneMix>> = {
  quiet: { room: 0, babble: 0, voices: 0, events: null, rumble: 0, hiss: 0, reverb: 0.04 },
  home: { room: 0.5, babble: 0, voices: 0, events: null, rumble: 0, hiss: 0, reverb: 0.08 },
  classroom: { room: 0.6, babble: 0.3, voices: 2, events: null, rumble: 0, hiss: 0, reverb: 0.16 },
  office: { room: 0.6, babble: 0.25, voices: 2, events: "typing", rumble: 0, hiss: 0, reverb: 0.1 },
  cafe: { room: 0.8, babble: 0.6, voices: 5, events: "clinks", rumble: 0, hiss: 0, reverb: 0.12 },
  shop: { room: 0.7, babble: 0.45, voices: 4, events: "beeps", rumble: 0, hiss: 0, reverb: 0.12 },
  street: { room: 0.3, babble: 0.25, voices: 2, events: "traffic", rumble: 0.6, hiss: 0, reverb: 0.03 },
  station: { room: 0.4, babble: 0.5, voices: 5, events: null, rumble: 0.9, hiss: 0, reverb: 0.25 },
  phone: { room: 0.4, babble: 0, voices: 0, events: null, rumble: 0, hiss: 0.7, reverb: 0.05 },
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
function buildBackground(c: AudioContext, r: Running, out: AudioNode, reverb: AudioNode, scene: Scene, difficulty: Difficulty, babble: readonly AudioBuffer[], start: number, end: number) {
  const mix = SCENE_MIX[scene];
  const level = DIFFICULTY_MIX[difficulty].level;
  const bed = gainNode(c, 0);
  bed.connect(out);
  bed.gain.setValueAtTime(0, start);
  bed.gain.linearRampToValueAtTime(1, start + 0.8);
  bed.gain.setValueAtTime(1, Math.max(start + 0.8, end - 0.9));
  bed.gain.linearRampToValueAtTime(0, end);

  if (mix.room > 0) looped(c, r, noise(c, "brown"), start).connect(filter(c, "lowpass", 420)).connect(gainNode(c, 0.05 * mix.room * level)).connect(bed);
  if (mix.rumble > 0) looped(c, r, noise(c, "brown"), start, 1.3).connect(filter(c, "lowpass", 140)).connect(gainNode(c, 0.35 * mix.rumble * level)).connect(bed);
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
  if (mix.events === "clinks") {
    for (let t = start + rand(0.3, 1.2); t < end - 0.4; t += rand(0.9, 2.6)) {
      const base = rand(2300, 3900);
      ping(c, r, bed, t, [base, base * 2.76, base * 5.4], 0.05 * level, rand(0.25, 0.6), rand(-0.8, 0.8));
    }
  } else if (mix.events === "beeps") {
    for (let t = start + rand(0.8, 2); t < end - 0.4; t += rand(2.5, 5.5)) {
      ping(c, r, bed, t, [1850], 0.035 * level, 0.12, rand(-0.6, 0.6));
      if (Math.random() < 0.4) ping(c, r, bed, t + 0.6, [1850], 0.035 * level, 0.12, rand(-0.6, 0.6));
    }
  } else if (mix.events === "typing") {
    for (let t = start + rand(0.5, 1.5); t < end - 0.5; t += rand(2, 5)) {
      const clicks = Math.floor(rand(5, 14));
      for (let k = 0, tt = t; k < clicks; k++, tt += rand(0.07, 0.17)) {
        const s = c.createBufferSource();
        s.buffer = noise(c, "white");
        const g = gainNode(c, 0);
        g.gain.setValueAtTime(0.05 * level, tt);
        g.gain.exponentialRampToValueAtTime(0.0001, tt + 0.025);
        s.connect(filter(c, "bandpass", 3200, 1.2)).connect(g).connect(bed);
        s.start(tt, rand(0, 2));
        s.stop(tt + 0.04);
        r.sources.push(s);
      }
    }
  } else if (mix.events === "traffic") {
    for (let t = start + rand(0, 1.5); t < end - 1; t += rand(3.5, 8)) {
      const dur = rand(2.5, 4.5);
      const s = c.createBufferSource();
      s.buffer = noise(c, "brown");
      s.loop = true;
      const bp = filter(c, "bandpass", 300, 0.8);
      bp.frequency.setValueAtTime(260, t);
      bp.frequency.linearRampToValueAtTime(900, t + dur / 2);
      bp.frequency.linearRampToValueAtTime(320, t + dur);
      const g = gainNode(c, 0);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(0.45 * level, t + dur / 2);
      g.gain.linearRampToValueAtTime(0, t + dur);
      const p = panner(c, 0);
      if ("pan" in p) {
        const dir = Math.random() < 0.5 ? -1 : 1;
        (p as StereoPannerNode).pan.setValueAtTime(-dir, t);
        (p as StereoPannerNode).pan.linearRampToValueAtTime(dir, t + dur);
      }
      s.connect(bp).connect(g).connect(p).connect(bed);
      s.start(t, rand(0, 2));
      s.stop(t + dur + 0.1);
      r.sources.push(s);
    }
  }
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

  Promise.all([parts, babble])
    .then(([voiceBufs, babbleBufs]) => {
      if (my !== token || r.stopped) return;
      const diff = DIFFICULTY_MIX[o.difficulty];
      const rate = o.slow ? SLOW_RATE : 1;
      const hasPa = o.parts.some((p) => p.fx === "pa");
      const quietScene = o.scene === "quiet";
      const plan = planTimeline(
        voiceBufs.map((b) => b.duration),
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

      if (!quietScene) buildBackground(c, r, master, room, o.scene, o.difficulty, babbleBufs, t0, t0 + plan.end);
      if (hasPa) chime(c, r, master, t0 + 0.4);

      o.parts.forEach((p, i) => {
        const s = c.createBufferSource();
        s.buffer = voiceBufs[i];
        s.playbackRate.value = rate;
        s.connect(voiceChain(c, p.fx, master, room, hall, mix.reverb));
        s.start(t0 + plan.starts[i]);
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
  const t0 = c.currentTime + 0.02;
  const reverb = c.createConvolver();
  reverb.buffer = impulse(c, 0.7, 3);
  reverb.connect(master);
  buildBackground(c, r, master, reverb, scene, difficulty, [], t0, t0 + maxSeconds);
  r.timers.push(window.setTimeout(() => teardown(r, 0.6), maxSeconds * 1000));
  return () => teardown(r, 0.6);
}
