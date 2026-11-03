# Vocabulary data

All A1 word lists live in `data/vocab/a1/`. One file per topic (nouns) or word class. Every file is a JSON
array, checked by `npm run validate:data` (also run before every build) and again when the app starts.

| File | Content | Schema |
| --- | --- | --- |
| `food`, `family`, `home`, `travel`, `time`, `school`, `body`, `shopping`, `jobs`, `weather`, `colors`, `clothes`, `city`, `hobbies`, `numbers-time` | nouns | `lib/schemas/vocab.ts` |
| `adjectives.json` | adjectives | `lib/schemas/vocabExtended.ts` |
| `adverbs.json` | adverbs | same |
| `prepositions.json` | prepositions | same |
| `phrases.json` | everyday phrases | same |

Verbs are in `data/verbs/a1.json` (40 verbs, every form written out).

## Rules for every entry

- **Correct German or nothing.** If you are not sure of an article, a plural or a form, leave the word out.
- **Original wording.** Write your own example sentences. Do not copy from textbooks or exam material.
- **All three languages.** `translations` has `en` and `fa`; `example` has `de`, `en` and `fa`.
- **Ids** are lower-case ASCII and unique inside their word class: `ä` becomes `ae`, `ö` `oe`, `ü` `ue`, `ß` `ss`
  (`maedchen`, `fuer`, `gross`). Phrase ids may contain hyphens.
- The **file name decides the category** of a noun: `data/vocab/a1/city.json` may only contain `"category": "city"`.
- The example sentence must contain the word (or its plural). The validator warns otherwise.
- Nouns without a plural (`Wetter`, `Regen`, `Musik`) use `"plural": "–"`.

## Noun (`data/vocab/a1/<category>.json`)

```json
{
  "id": "jacke",
  "word": "Jacke",
  "article": "die",
  "plural": "Jacken",
  "translations": { "en": "jacket", "fa": "کت، ژاکت" },
  "grammarRule": {
    "en": "...", "fa": "...", "de": "...",
    "simple": { "en": "...", "fa": "...", "de": "..." }
  },
  "ruleCategory": "learn",
  "example": { "de": "Die Jacke ist warm.", "en": "The jacket is warm.", "fa": "کت گرم است." },
  "category": "clothes",
  "level": "A1"
}
```

`ruleCategory` is `suffix`, `semantic`, `exception` or `learn`. Use `learn` unless the rule really holds
(`-ung`, `-heit`, `-keit`, `-schaft`, `-chen`, `-lein`, days, months, seasons). `grammarRule` explains it in
three languages plus a one-line `simple` version.

New noun category: add it to `VOCAB_CATEGORIES` (`types/vocab.ts`), `VocabCategorySchema`
(`lib/schemas/vocab.ts`), `data/vocab/index.ts`, the icon maps (`lib/icons.ts`,
`components/illustrations/noun/categories.tsx`, `NounIcon.tsx`) and the messages
(`Vocabulary.groups.noun.<category>` in `messages/*.json`).

## Adjective

```json
{
  "id": "gut", "word": "gut",
  "comparative": "besser", "superlative": "am besten", "opposite": "schlecht",
  "translations": { "en": "good", "fa": "خوب" },
  "example": { "de": "Das Essen ist gut.", "en": "The food is good.", "fa": "غذا خوب است." },
  "level": "A1"
}
```

`comparative` and `superlative` come as a pair, or both are left out (colours, `müde`). The superlative starts with `am `.

## Adverb

`"kind"` is `time`, `place`, `manner`, `degree` or `frequency`. Same fields as above without the comparison.

## Preposition

```json
{
  "id": "mit", "word": "mit",
  "cases": ["dat"], "wechsel": false,
  "translations": { "en": "with", "fa": "با" },
  "example": { "de": "Ich fahre mit dem Bus.", "en": "I go by bus.", "fa": "من با اتوبوس می‌روم." },
  "level": "A1"
}
```

Two-way prepositions (`in`, `an`, `auf`, ...) use `"cases": ["akk", "dat"]` and `"wechsel": true`.

## Phrase

```json
{
  "id": "wie-heissen-sie", "text": "Wie heißen Sie?", "situation": "greeting",
  "reply": "Ich heiße Anna.",
  "translations": { "en": "What is your name? (formal)", "fa": "اسم شما چیست؟" },
  "level": "A1"
}
```

`situation`: `greeting`, `polite`, `classroom`, `shopping`, `travel`, `restaurant`, `help`, `phone`.
`reply` is optional. Phrases end with `.`, `!` or `?`.

## Review cards

Every noun, verb, adjective, adverb, preposition and phrase becomes one review card automatically
(`lib/reviewCards.ts`), with the id `<kind>:<id>`, for example `noun:kopf` or `verb:essen`. Nothing else is needed
to make new words reviewable.

## Batch-generation prompt

Use this in a separate chat to draft the next batch, then **check every line yourself** (or let a German speaker
check it) before it goes into the repository.

```text
You are helping to write original CEFR A1 German vocabulary data for a learning app.

Write exactly 25 entries for the topic "<TOPIC>" as a JSON array in the schema below.

Hard rules:
1. Only include words you are 100 % sure about: article, plural form, comparison forms, case.
   If unsure about any detail of a word, skip the word and write another one.
2. Stay at CEFR A1 (Goethe "Start Deutsch 1" level words, everyday meaning).
3. Example sentences: original, short (3 to 8 words), simple present tense, they must contain the word.
4. Persian ("fa") must be natural Persian, not a word-by-word copy of English.
5. ids: lower-case ASCII, ä=ae ö=oe ü=ue ß=ss, unique, no duplicates of: <LIST OF EXISTING IDS>.
6. Nouns with no plural use "–" as plural. Do not invent plurals.
7. Output JSON only, no comments, no trailing commas, 2-space indentation.

Schema: <PASTE ONE ENTRY OF THE TARGET FILE TYPE FROM THIS README>
```

After pasting the result into the file run `npm run validate:data` and `npm test`.
