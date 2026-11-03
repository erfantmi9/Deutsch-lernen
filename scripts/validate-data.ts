/* Run with: npm run validate:data  (also runs automatically before `next build`). */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { ZodType } from "zod";
import { SentenceListSchema } from "../lib/schemas/sentence";
import { VerbListSchema } from "../lib/schemas/verb";
import { VocabListSchema } from "../lib/schemas/vocab";
import { checkNoun, checkSentence, checkVerb, findDuplicateIds } from "../lib/validation/rules";
import type { Problem } from "../lib/validation/rules";
import type { SentenceExercise } from "../types/sentence";
import type { VerbEntry } from "../types/verb";
import type { VocabEntry } from "../types/vocab";

const ROOT = process.cwd();
let errors = 0;
let warnings = 0;

function report(file: string, id: string, p: Problem): void {
  const line = `${p.severity === "error" ? "ERROR" : "WARN "} ${file} [${id}] ${p.message}`;
  if (p.severity === "error") {
    errors++;
    console.error(line);
  } else {
    warnings++;
    console.warn(line);
  }
}

function jsonFiles(dir: string): string[] {
  const abs = join(ROOT, dir);
  if (!existsSync(abs)) return [];
  return readdirSync(abs, { withFileTypes: true })
    .flatMap((d) => (d.isDirectory() ? jsonFiles(join(dir, d.name)) : d.name.endsWith(".json") ? [join(dir, d.name)] : []))
    .sort();
}

/** Validates one file with a zod list schema. Returns parsed items or [] on failure. */
function loadFile<T>(file: string, schema: ZodType<T[]>): T[] {
  const rel = relative(ROOT, join(ROOT, file)).replaceAll("\\", "/");
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(join(ROOT, file), "utf8"));
  } catch (e) {
    report(rel, "-", { severity: "error", message: `invalid JSON: ${(e as Error).message}` });
    return [];
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      const idx = typeof issue.path[0] === "number" ? issue.path[0] : -1;
      const id = idx >= 0 && Array.isArray(raw) ? String((raw[idx] as { id?: unknown })?.id ?? `#${idx}`) : "-";
      report(rel, id, { severity: "error", message: `${issue.path.join(".")}: ${issue.message}` });
    }
    return [];
  }
  return parsed.data;
}

const seen: { file: string; id: string }[] = [];

// ---- nouns ----
const vocabFiles = jsonFiles("data/vocab");
for (const file of vocabFiles) {
  const rel = file.replaceAll("\\", "/");
  const items = loadFile<VocabEntry>(file, VocabListSchema as unknown as ZodType<VocabEntry[]>);
  // path convention: data/vocab/<level>/<category>.json
  const m = /data\/vocab\/([^/]+)\/([^/]+)\.json$/.exec(rel);
  for (const e of items) {
    seen.push({ file: rel, id: `noun:${e.id}` });
    for (const p of checkNoun(e)) report(rel, e.id, p);
    if (m && e.category !== m[2]) {
      report(rel, e.id, { severity: "error", message: `category "${e.category}" does not match file name "${m[2]}"` });
    }
    if (m && e.level.toLowerCase() !== m[1]) {
      report(rel, e.id, { severity: "error", message: `level "${e.level}" does not match folder "${m[1]}"` });
    }
  }
}

// ---- verbs ----
for (const file of jsonFiles("data/verbs")) {
  const rel = file.replaceAll("\\", "/");
  for (const e of loadFile<VerbEntry>(file, VerbListSchema as unknown as ZodType<VerbEntry[]>)) {
    seen.push({ file: rel, id: `verb:${e.id}` });
    for (const p of checkVerb(e)) report(rel, e.id, p);
  }
}

// ---- sentences ----
for (const file of jsonFiles("data/sentences")) {
  const rel = file.replaceAll("\\", "/");
  for (const e of loadFile<SentenceExercise>(file, SentenceListSchema as unknown as ZodType<SentenceExercise[]>)) {
    seen.push({ file: rel, id: `sentence:${e.id}` });
    for (const p of checkSentence(e)) report(rel, e.id, p);
  }
}

// ---- duplicate ids (checked per content type, across all files) ----
for (const p of findDuplicateIds(seen)) report("(all files)", "-", p);

console.log(
  `\nValidated ${vocabFiles.length} vocab file(s), ${seen.length} entries: ${errors} error(s), ${warnings} warning(s).`,
);
process.exit(errors > 0 ? 1 : 0);
