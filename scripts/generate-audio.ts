/*
 * Records the listening texts offline with Piper (open-source TTS), one voice per character. No account, no key, no
 * internet except to download the voices once.
 *
 *   npm run audio:generate              # record what is missing or changed
 *   npm run audio:generate -- --dry-run # only list what would be recorded
 *   npm run audio:generate -- --prune   # also delete recordings nothing uses any more
 *
 * One-time setup (see DEPLOY.md, step 3b):
 *   python -m venv .tts/venv
 *   .tts/venv/Scripts/pip install piper-tts lameenc      (macOS / Linux: .tts/venv/bin/pip)
 * The voices are downloaded to .tts/voices on first run. PIPER_PYTHON overrides the Python used.
 *
 * Writes MP3 files to public/audio/ and the key -> file list to data/audio/manifest.json. A file's name is a hash of
 * voice and text, so an unchanged line is never recorded twice and a changed line gets a new file.
 */
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { createWriteStream, existsSync, mkdirSync, readdirSync, renameSync, statSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { dialogues } from "../lib/dialogues";
import { dictationPool, listeningMessages, minimalPairs } from "../lib/listening";
import { clipJobs, missingVoices, voiceClashes } from "../lib/audio/clips";
import { PIPER_MODELS, voiceId } from "../lib/audio/voices";
import type { PiperModel } from "../lib/audio/voices";
import { AUDIO_DIR, MANIFEST_FILE, MANIFEST_VERSION } from "../lib/audio/manifest";
import type { AudioManifest } from "../lib/audio/manifest";

const ROOT = process.cwd();
const args = new Set(process.argv.slice(2));
const DRY = args.has("--dry-run");
const PRUNE = args.has("--prune");
const TTS_DIR = join(ROOT, ".tts");
const VOICES_DIR = join(TTS_DIR, "voices");
const HF = "https://huggingface.co/rhasspy/piper-voices/resolve/main";

const fileName = (voice: string, text: string) => `${createHash("sha1").update(`${voice}|${text}|v3`).digest("hex").slice(0, 16)}.mp3`;

function python(): string {
  if (process.env.PIPER_PYTHON) return process.env.PIPER_PYTHON;
  const win = join(TTS_DIR, "venv", "Scripts", "python.exe");
  const unix = join(TTS_DIR, "venv", "bin", "python");
  if (existsSync(win)) return win;
  if (existsSync(unix)) return unix;
  throw new Error("No Python with Piper found. Run: python -m venv .tts/venv, then install piper-tts and lameenc into it (DEPLOY.md, step 3b).");
}

async function download(url: string, to: string) {
  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`download failed (${res.status}): ${url}`);
  const part = `${to}.part`;
  await pipeline(Readable.fromWeb(res.body as never), createWriteStream(part));
  renameSync(part, to);
}

async function ensureModels(models: ReadonlySet<PiperModel>) {
  mkdirSync(VOICES_DIR, { recursive: true });
  for (const model of models) {
    for (const ext of [".onnx.json", ".onnx"]) {
      const file = join(VOICES_DIR, model + ext);
      if (existsSync(file) && statSync(file).size > 0) continue;
      console.log(`  downloading voice ${model}${ext} ...`);
      await download(`${HF}/${PIPER_MODELS[model]}/${model}${ext}`, file);
    }
  }
}

function synthesize(jobsFile: string, total: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(python(), [join(ROOT, "scripts", "tts", "synthesize.py"), jobsFile], { stdio: ["ignore", "pipe", "inherit"] });
    let done = 0;
    child.stdout.on("data", (chunk: Buffer) => {
      done += (chunk.toString().match(/^ok /gm) ?? []).length;
      if (done % 25 === 0 || done === total) process.stdout.write(`  recorded ${done}/${total}\r`);
    });
    child.on("error", reject);
    child.on("close", (code) => (code === 0 ? (console.log(), resolve()) : reject(new Error(`synthesis failed (exit ${code})`))));
  });
}

async function main() {
  const problems = [...missingVoices(dialogues, listeningMessages), ...voiceClashes(dialogues, listeningMessages)];
  if (problems.length > 0) {
    console.error(`Fix the voices in lib/audio/voices.ts:\n  ${problems.join("\n  ")}`);
    process.exit(1);
  }
  const jobs = clipJobs({ dialogues, messages: listeningMessages, dictation: dictationPool(), pairs: minimalPairs });
  const dir = join(ROOT, AUDIO_DIR);
  mkdirSync(dir, { recursive: true });

  const manifest: AudioManifest = { version: MANIFEST_VERSION, clips: {} };
  const todo = new Map<string, (typeof jobs)[number]>();
  for (const job of jobs) {
    const voice = voiceId(job.voice);
    const file = fileName(voice, job.text);
    manifest.clips[job.key] = { file, voice };
    if (!existsSync(join(dir, file))) todo.set(file, job);
  }
  const files = new Set(Object.values(manifest.clips).map((c) => c.file)).size;
  console.log(`${jobs.length} clips, ${files} files; to record: ${todo.size}.`);
  if (DRY) {
    for (const [file, j] of [...todo].slice(0, 20)) console.log(`  ${file}  ${voiceId(j.voice)}  ${j.text}`);
    if (todo.size > 20) console.log(`  ... and ${todo.size - 20} more`);
    return;
  }

  if (todo.size > 0) {
    await ensureModels(new Set([...todo.values()].map((j) => j.voice.model)));
    mkdirSync(TTS_DIR, { recursive: true });
    const jobsFile = join(TTS_DIR, "jobs.json");
    // Grouped by model, so each model is loaded once.
    const list = [...todo].sort(([, a], [, b]) => a.voice.model.localeCompare(b.voice.model));
    writeFileSync(
      jobsFile,
      JSON.stringify({
        voicesDir: VOICES_DIR,
        outDir: dir,
        jobs: list.map(([file, j]) => ({ file, text: j.text, model: j.voice.model, pitch: j.voice.pitch ?? null, lengthScale: j.voice.lengthScale ?? null })),
      }),
    );
    await synthesize(jobsFile, todo.size);
    unlinkSync(jobsFile);
  }

  const sorted: AudioManifest = { version: MANIFEST_VERSION, clips: Object.fromEntries(Object.entries(manifest.clips).sort(([a], [b]) => a.localeCompare(b))) };
  writeFileSync(join(ROOT, MANIFEST_FILE), JSON.stringify(sorted, null, 2) + "\n");

  const used = new Set(Object.values(sorted.clips).map((c) => c.file));
  const orphans = readdirSync(dir).filter((f) => f.endsWith(".mp3") && !used.has(f));
  if (PRUNE) for (const f of orphans) unlinkSync(join(dir, f));
  console.log(`Manifest written. ${orphans.length} unused file(s)${PRUNE ? " deleted" : " (run with --prune to delete)"}.`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
