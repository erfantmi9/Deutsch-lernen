/* Run with: npm run validate:data  (also runs automatically before `next build`). */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import type { ZodType } from "zod";
import { DialogueListSchema } from "../lib/schemas/dialogue";
import { GlossaryListSchema, GrammarExerciseListSchema, GrammarLessonListSchema } from "../lib/schemas/grammar";
import { ReadingListSchema } from "../lib/schemas/reading";
import { checkDialogues, checkReadingTexts } from "../lib/validation/contentRules";
import { cardinal, ordinal } from "../lib/numbers";
import { CalendarSchema, CardinalListSchema, OrdinalListSchema } from "../lib/schemas/numbers";
import { SentenceListSchema } from "../lib/schemas/sentence";
import { VerbListSchema } from "../lib/schemas/verb";
import { VocabListSchema } from "../lib/schemas/vocab";
import { AdjectiveListSchema, AdverbListSchema, PhraseListSchema, PrepositionListSchema } from "../lib/schemas/vocabExtended";
import { ExamSchema } from "../lib/schemas/exam";
import { ListeningMessageListSchema, MinimalPairListSchema } from "../lib/schemas/listening";
import { isDictatable } from "../lib/dictation";
import { checkExam } from "../lib/validation/examRules";
import { checkMessages } from "../lib/validation/messageRules";
import { checkGrammarData } from "../lib/validation/grammarRules";
import { checkAdjective, checkAdverb, checkNounExample, checkPhrase, checkPreposition, checkVerbExample } from "../lib/validation/vocabRules";
import { checkNoun, checkSentence, checkVerb, findDuplicateIds } from "../lib/validation/rules";
import type { Problem } from "../lib/validation/rules";
import type { GlossaryEntry, GrammarExercise, GrammarLesson } from "../types/grammar";
import type { Dialogue } from "../types/dialogue";
import type { ListeningMessage, MinimalPair } from "../types/listening";
import { MAX_MESSAGE_WORDS, MIN_MESSAGE_WORDS, SOUND_CONTRASTS } from "../types/listening";
import type { NumberWord } from "../types/numbers";
import type { ReadingText } from "../types/reading";
import type { SentenceExercise } from "../types/sentence";
import type { VerbEntry } from "../types/verb";
import type { VocabEntry } from "../types/vocab";
import type { AdjectiveEntry, AdverbEntry, PhraseEntry, PrepositionEntry } from "../types/vocab-extended";

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
  loadedFiles.add(rel);
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
/** Every JSON file under data/ must be read by a loader below, so a forgotten file cannot ship unchecked. */
const loadedFiles = new Set<string>();

// ---- nouns ----
const EXTENDED_VOCAB_FILES = new Set(["adjectives", "adverbs", "prepositions", "phrases"]);
const vocabFiles = jsonFiles("data/vocab").filter((f) => !EXTENDED_VOCAB_FILES.has(/([^/\\]+)\.json$/u.exec(f)?.[1] ?? ""));
for (const file of vocabFiles) {
  const rel = file.replaceAll("\\", "/");
  const items = loadFile<VocabEntry>(file, VocabListSchema as unknown as ZodType<VocabEntry[]>);
  // path convention: data/vocab/<level>/<category>.json
  const m = /data\/vocab\/([^/]+)\/([^/]+)\.json$/.exec(rel);
  for (const e of items) {
    seen.push({ file: rel, id: `noun:${e.id}` });
    for (const p of checkNoun(e)) report(rel, e.id, p);
    for (const p of checkNounExample(e)) report(rel, e.id, p);
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
    for (const p of checkVerbExample(e)) report(rel, e.id, p);
  }
}

// ---- adjectives, adverbs, prepositions, phrases ----
let extendedCount = 0;
function loadExtended<T extends { id: string }>(
  name: string,
  prefix: string,
  schema: ZodType<T[]>,
  check: (e: T) => Problem[],
): void {
  const file = `data/vocab/a1/${name}.json`;
  if (!existsSync(join(ROOT, file))) {
    report(file, "-", { severity: "error", message: "file is missing" });
    return;
  }
  for (const e of loadFile<T>(file, schema)) {
    extendedCount++;
    seen.push({ file, id: `${prefix}:${e.id}` });
    for (const p of check(e)) report(file, e.id, p);
  }
}
loadExtended<AdjectiveEntry>("adjectives", "adjective", AdjectiveListSchema as unknown as ZodType<AdjectiveEntry[]>, checkAdjective);
loadExtended<AdverbEntry>("adverbs", "adverb", AdverbListSchema as unknown as ZodType<AdverbEntry[]>, checkAdverb);
loadExtended<PrepositionEntry>("prepositions", "preposition", PrepositionListSchema as unknown as ZodType<PrepositionEntry[]>, checkPreposition);
loadExtended<PhraseEntry>("phrases", "phrase", PhraseListSchema as unknown as ZodType<PhraseEntry[]>, checkPhrase);

// ---- sentences ----
for (const file of jsonFiles("data/sentences")) {
  const rel = file.replaceAll("\\", "/");
  for (const e of loadFile<SentenceExercise>(file, SentenceListSchema as unknown as ZodType<SentenceExercise[]>)) {
    seen.push({ file: rel, id: `sentence:${e.id}` });
    for (const p of checkSentence(e)) report(rel, e.id, p);
  }
}

// ---- grammar (glossary, lessons, exercises) ----
const glossaryEntries: GlossaryEntry[] = [];
for (const file of jsonFiles("data").filter((f) => f.replaceAll("\\", "/") === "data/glossary.json")) {
  const rel = file.replaceAll("\\", "/");
  for (const e of loadFile<GlossaryEntry>(file, GlossaryListSchema as unknown as ZodType<GlossaryEntry[]>)) {
    seen.push({ file: rel, id: `glossary:${e.term}` });
    glossaryEntries.push(e);
  }
}

const grammarLessons: GrammarLesson[] = [];
for (const file of jsonFiles("data/grammar").filter((f) => /^data\/grammar\/lessons[^/]*\.json$/u.test(f.replaceAll("\\", "/")))) {
  const rel = file.replaceAll("\\", "/");
  for (const e of loadFile<GrammarLesson>(file, GrammarLessonListSchema as unknown as ZodType<GrammarLesson[]>)) {
    seen.push({ file: rel, id: `grammar-lesson:${e.id}` });
    grammarLessons.push(e);
  }
}

const grammarExercises: GrammarExercise[] = [];
for (const file of jsonFiles("data/grammar/exercises")) {
  const rel = file.replaceAll("\\", "/");
  for (const e of loadFile<GrammarExercise>(file, GrammarExerciseListSchema as unknown as ZodType<GrammarExercise[]>)) {
    seen.push({ file: rel, id: `grammar-exercise:${e.id}` });
    grammarExercises.push(e);
  }
}

for (const { id, problem } of checkGrammarData(grammarLessons, grammarExercises, glossaryEntries)) {
  report("data/grammar", id, problem);
}

// ---- numbers: the hand-written word lists must agree with the generator in lib/numbers.ts ----
const cardinalEntries = loadFile<NumberWord>("data/numbers/cardinals.json", CardinalListSchema as unknown as ZodType<NumberWord[]>);
for (const e of cardinalEntries) {
  seen.push({ file: "data/numbers/cardinals.json", id: `cardinal:${e.value}` });
  if (cardinal(e.value) !== e.word) {
    report("data/numbers/cardinals.json", String(e.value), {
      severity: "error",
      message: `word "${e.word}" differs from the generated "${cardinal(e.value)}"`,
    });
  }
}

const ordinalEntries = loadFile<NumberWord>("data/numbers/ordinals.json", OrdinalListSchema as unknown as ZodType<NumberWord[]>);
for (const e of ordinalEntries) {
  seen.push({ file: "data/numbers/ordinals.json", id: `ordinal:${e.value}` });
  if (ordinal(e.value) !== e.word) {
    report("data/numbers/ordinals.json", String(e.value), {
      severity: "error",
      message: `word "${e.word}" differs from the generated "${ordinal(e.value)}"`,
    });
  }
}

loadedFiles.add("data/numbers/calendar.json");
let calendarItems = 0;
try {
  const parsed = CalendarSchema.safeParse(JSON.parse(readFileSync(join(ROOT, "data/numbers/calendar.json"), "utf8")));
  if (parsed.success) {
    for (const [group, items] of Object.entries(parsed.data)) {
      for (const item of items) {
        calendarItems++;
        seen.push({ file: "data/numbers/calendar.json", id: `calendar-${group}:${item.id}` });
      }
    }
  } else {
    for (const issue of parsed.error.issues) {
      report("data/numbers/calendar.json", "-", { severity: "error", message: `${issue.path.join(".")}: ${issue.message}` });
    }
  }
} catch (e) {
  report("data/numbers/calendar.json", "-", { severity: "error", message: `invalid JSON: ${(e as Error).message}` });
}

// ---- dialogues and reading texts ----
const dialogueEntries: Dialogue[] = [];
for (const file of jsonFiles("data/dialogues")) {
  const rel = file.replaceAll("\\", "/");
  for (const e of loadFile<Dialogue>(file, DialogueListSchema as unknown as ZodType<Dialogue[]>)) {
    seen.push({ file: rel, id: `dialogue:${e.id}` });
    dialogueEntries.push(e);
  }
}

const readingEntries: ReadingText[] = [];
for (const file of jsonFiles("data/reading")) {
  const rel = file.replaceAll("\\", "/");
  for (const e of loadFile<ReadingText>(file, ReadingListSchema as unknown as ZodType<ReadingText[]>)) {
    seen.push({ file: rel, id: `reading:${e.id}` });
    readingEntries.push(e);
  }
}

const idsOf = (prefix: string): Set<string> =>
  new Set(seen.filter((s) => s.id.startsWith(`${prefix}:`)).map((s) => s.id.slice(prefix.length + 1)));

for (const { id, problem } of checkDialogues(dialogueEntries, {
  nounIds: idsOf("noun"),
  verbIds: idsOf("verb"),
  lessonIds: new Set(grammarLessons.map((l) => l.id)),
})) {
  report("data/dialogues", id, problem);
}
for (const { id, problem } of checkReadingTexts(readingEntries)) report("data/reading", id, problem);

// ---- listening: messages and minimal pairs ----
const listeningMessageFile = "data/listening/messages.json";
const listeningMessages = loadFile<ListeningMessage>(listeningMessageFile, ListeningMessageListSchema as unknown as ZodType<ListeningMessage[]>);
for (const m of listeningMessages) {
  seen.push({ file: listeningMessageFile, id: `listening-message:${m.id}` });
  const words = m.lines.reduce((n, l) => n + l.de.split(/\s+/u).length, 0);
  if (words < MIN_MESSAGE_WORDS || words > MAX_MESSAGE_WORDS) {
    report(listeningMessageFile, m.id, { severity: "error", message: `has ${words} words (${MIN_MESSAGE_WORDS} to ${MAX_MESSAGE_WORDS})` });
  }
  // The browser reads the script aloud: digits and abbreviations are read unpredictably, so write numbers as words.
  for (const l of m.lines) {
    if (/[0-9]/u.test(l.de)) report(listeningMessageFile, m.id, { severity: "error", message: `write numbers as words in the script: "${l.de}"` });
  }
}
const soundFile = "data/listening/sounds.json";
const pairs = loadFile<MinimalPair>(soundFile, MinimalPairListSchema as unknown as ZodType<MinimalPair[]>);
for (const p of pairs) seen.push({ file: soundFile, id: `minimal-pair:${p.id}` });
for (const c of SOUND_CONTRASTS) {
  const n = pairs.filter((p) => p.contrast === c).length;
  if (n < 3) report(soundFile, c, { severity: "error", message: `contrast "${c}" needs at least 3 pairs (has ${n})` });
}
const dictatable = dialogueEntries.flatMap((d) => d.lines).filter((l) => isDictatable(l.de)).length;
if (dictatable < 30) report("data/dialogues", "-", { severity: "warning", message: `only ${dictatable} dialogue lines can be used for dictation` });

// ---- practice exam ----
let examItems = 0;
loadedFiles.add("data/exam/a1.json");
try {
  const parsed = ExamSchema.safeParse(JSON.parse(readFileSync(join(ROOT, "data/exam/a1.json"), "utf8")));
  if (parsed.success) {
    examItems = parsed.data.hoeren.length + parsed.data.sprechen.length + 2;
    for (const p of checkExam(parsed.data, idsOf("reading"))) report("data/exam/a1.json", "-", p);
  } else {
    for (const issue of parsed.error.issues) {
      report("data/exam/a1.json", "-", { severity: "error", message: `${issue.path.join(".")}: ${issue.message}` });
    }
  }
} catch (e) {
  report("data/exam/a1.json", "-", { severity: "error", message: `cannot read: ${(e as Error).message}` });
}

// ---- every JSON file in data/ is covered ----
for (const file of jsonFiles("data")) {
  const rel = file.replaceAll("\\", "/");
  if (!loadedFiles.has(rel)) report(rel, "-", { severity: "error", message: "is not checked by any loader in scripts/validate-data.ts" });
}

// ---- messages: same keys and arguments in every language ----
const readMessages = (loc: string): unknown => JSON.parse(readFileSync(join(ROOT, "messages", `${loc}.json`), "utf8"));
const baseMessages = readMessages("en");
for (const loc of ["fa", "de"]) {
  for (const { key, problem } of checkMessages(baseMessages, readMessages(loc), loc)) report(`messages/${loc}.json`, key, problem);
}

// ---- duplicate ids (checked per content type, across all files) ----
for (const p of findDuplicateIds(seen)) report("(all files)", "-", p);

console.log(
  `\nValidated ${vocabFiles.length} noun file(s), ${extendedCount} adjective/adverb/preposition/phrase item(s), ${grammarLessons.length} grammar lesson(s), ${grammarExercises.length} grammar exercise(s), ${glossaryEntries.length} glossary term(s), ${cardinalEntries.length} cardinal(s), ${ordinalEntries.length} ordinal(s), ${calendarItems} calendar item(s), ${dialogueEntries.length} dialogue(s), ${readingEntries.length} reading text(s), ${listeningMessages.length} listening message(s), ${pairs.length} minimal pair(s), ${examItems} exam item(s), 3 message file(s); ${seen.length} entries in total: ${errors} error(s), ${warnings} warning(s).`,
);
process.exit(errors > 0 ? 1 : 0);
