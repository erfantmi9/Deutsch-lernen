/*
 * Records the listening texts with edge-tts (Microsoft Edge's neural "Read aloud" voices), one voice per character.
 * No account, no key; needs internet while recording.
 *
 *   npm run audio:generate                        # record what is missing or changed
 *   npm run audio:generate -- --dry-run           # only list what would be recorded
 *   npm run audio:generate -- --prune             # also delete recordings nothing uses any more
 *   npm run audio:generate -- --only=dialogue:im-cafe   # only clips whose key starts with this; the rest stay as they are
 *
 * One-time setup (see DEPLOY.md, step 3b):
 *   python -m venv .tts/venv
 *   .tts/venv/Scripts/pip install edge-tts      (macOS / Linux: .tts/venv/bin/pip)
 * TTS_PYTHON overrides the Python used.
 *
 * Writes MP3 files to public/audio/ and the key -> file list to data/audio/manifest.json. A file's name is a hash of
 * voice and text, so an unchanged line is never recorded twice and a changed line gets a new file.
 */
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { dialogues } from "../lib/dialogues";
import { dictationPool, listeningMessages, minimalPairs } from "../lib/listening";
import { clipJobs, missingVoices, voiceClashes } from "../lib/audio/clips";
import { voiceId } from "../lib/audio/voices";
import { AUDIO_DIR, MANIFEST_FILE, MANIFEST_VERSION } from "../lib/audio/manifest";
import type { AudioManifest } from "../lib/audio/manifest";

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const args = new Set(argv);
const DRY = args.has("--dry-run");
const PRUNE = args.has("--prune");
const ONLY = argv.find((a) => a.startsWith("--only="))?.slice("--only=".length) ?? null;
const TTS_DIR = join(ROOT, ".tts");

const fileName = (voice: string, text: string) => `${createHash("sha1").update(`${voice}|${text}|edge1`).digest("hex").slice(0, 16)}.mp3`;

function python(): string {
  if (process.env.TTS_PYTHON) return process.env.TTS_PYTHON;
  const win = join(TTS_DIR, "venv", "Scripts", "python.exe");
  const unix = join(TTS_DIR, "venv", "bin", "python");
  if (existsSync(win)) return win;
  if (existsSync(unix)) return unix;
  throw new Error("No Python with edge-tts found. Run: python -m venv .tts/venv, then install edge-tts into it (DEPLOY.md, step 3b).");
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
  const previous: AudioManifest | null = existsSync(join(ROOT, MANIFEST_FILE)) ? JSON.parse(readFileSync(join(ROOT, MANIFEST_FILE), "utf-8")) : null;
  const todo = new Map<string, (typeof jobs)[number]>();
  for (const job of jobs) {
    if (ONLY && !job.key.startsWith(ONLY)) {
      // Not part of this run: keep whatever was recorded before.
      const old = previous?.clips[job.key];
      if (old) manifest.clips[job.key] = old;
      continue;
    }
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
    mkdirSync(TTS_DIR, { recursive: true });
    const jobsFile = join(TTS_DIR, "jobs.json");
    writeFileSync(
      jobsFile,
      JSON.stringify({
        outDir: dir,
        jobs: [...todo].map(([file, j]) => ({ file, text: j.text, voice: j.voice.name, pitch: j.voice.pitch ?? 0, rate: j.voice.rate ?? 0 })),
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
