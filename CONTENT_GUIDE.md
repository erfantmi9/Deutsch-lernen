# Content guide

How to add or change learning content. All content is JSON in `data/`. No code changes are needed for new items of an
existing kind. After every change run:

```bash
npm run validate:data   # schema + content rules for ALL data, and message-file consistency
npm test
npm run build
```

`validate-data` fails when a JSON file under `data/` is not checked by any loader, so a forgotten file cannot ship.

## Rules for all content

1. **Correct German or nothing.** If you are not sure of an article, plural, case ending or verb form, leave it out.
2. **Original wording.** Write your own sentences and texts. Never copy from the Goethe-Institut, textbooks or exams.
3. **Three languages.** Everything the learner reads exists in `en`, `fa` and `de`. For the `de` interface, English
   translations are shown where a translation is needed.
4. **German is always left-to-right**, also inside Persian text. The components wrap it in `<bdi dir="ltr" lang="de">`;
   keep German sentences whole in the data so that works.
5. **Persian grammar terms** come from `data/glossary.json` (`{ term, en, fa, de }`). Use the same Persian word everywhere.
6. **Level A1.** Short sentences, everyday words, present tense (and Perfekt only where a lesson teaches it).
7. **Ids** are lower-case ASCII (`ä`=`ae`, `ö`=`oe`, `ü`=`ue`, `ß`=`ss`) and unique within their kind.

## Where things live

| Content | Files | Schema | Notes |
| --- | --- | --- | --- |
| Nouns | `data/vocab/a1/<category>.json` | `lib/schemas/vocab.ts` | see `data/vocab/README.md` |
| Adjectives, adverbs, prepositions, phrases | `data/vocab/a1/{adjectives,adverbs,prepositions,phrases}.json` | `lib/schemas/vocabExtended.ts` | see `data/vocab/README.md` |
| Verbs | `data/verbs/a1.json` | `lib/schemas/verb.ts` | every form written out, never computed |
| Sentences (word order) | `data/sentences/*.json` | `lib/schemas/sentence.ts` | the validator checks the word list is a permutation of the answer |
| Grammar lessons | `data/grammar/lessons*.json` | `lib/schemas/grammar.ts` | sections, tables, examples |
| Grammar exercises | `data/grammar/exercises/*.json` | same | every lesson lists its `exerciseIds` |
| Glossary | `data/glossary.json` | same | grammar terms in 3 languages |
| Numbers, ordinals, calendar | `data/numbers/*.json` | `lib/schemas/numbers.ts` | cross-checked against `lib/numbers.ts` |
| Dialogues | `data/dialogues/*.json` | `lib/schemas/dialogue.ts` | 2 speakers, 6 to 10 lines, 4 quiz questions |
| Reading texts | `data/reading/*.json` | `lib/schemas/reading.ts` | 40 to 80 words, 4 tasks, evidence must occur in the text |
| Listening messages | `data/listening/messages.json` | `lib/schemas/listening.ts` | 1 speaker (announcement, phone) or 2 (conversation), 3 German options, `evidence` must occur in a line |
| Minimal pairs | `data/listening/sounds.json` | `lib/schemas/listening.ts` | two words that differ in one sound; at least 3 pairs per contrast |
| Practice exam | `data/exam/a1.json` | `lib/schemas/exam.ts` | listening scripts, writing tasks, speaking parts |
| UI text | `messages/{en,fa,de}.json` | checked by the validator | same keys and same `{arguments}` in all three |

A new file in an existing folder is picked up automatically only where the loader reads the whole folder (sentences,
dialogues, reading). For nouns add the file to `data/vocab/index.ts`; for a new noun category follow the checklist in
`data/vocab/README.md`. For a new grammar lesson or exercise file add its import to `lib/grammar.ts`.

The grammar page groups lessons by topic (`GRAMMAR_GROUP_OF_TOPIC` in `types/grammar.ts`). A lesson with a new
`topic` needs an entry there, in `GRAMMAR_TOPICS`, a drawing in `components/illustrations/GrammarTopicIcon.tsx` and a
label in `Grammar.topics` (all three message files).

## Typical tasks

### Add a word

1. Find the right file in `data/vocab/a1/`.
2. Copy an entry of the same kind and change every field. Keep `id` unique.
3. Run `npm run validate:data`. The word is now in the vocabulary page, the article arcade (nouns), search, listening
   drills and the review cards. Nothing else to do.

### Add a verb

Add an entry to `data/verbs/a1.json` with **all** present forms, `perfekt.auxiliary` and `perfekt.partizip2`.
Separable verbs: set `type` to `separable`, give `separable.prefix` and `separable.stem`, and write the present forms
**without** the prefix (`stehe`, `stehst`, ...). Add a `praeteritum` only for modal verbs and `sein`/`haben`.
Reflexive verbs: set `type` to `reflexive`, write the id without `sich` (`freuen`), the infinitive with it
(`sich freuen`) and the present forms with the pronoun (`freue mich`, `freust dich`, ...). `category` is the topic shown
in the verb page's topic filter (`basic`, `daily`, `movement`, `communication`, `modal`).

### Add a dialogue

Add it to a file in `data/dialogues/`. Use exactly two speakers. Quiz answers must be German. `vocabIds` use the prefixes
`noun:` and `verb:` (for example `noun:essen`). `grammarLessonIds` must exist. Words that are in the vocabulary become
tappable automatically. Each speaker needs a portrait in `LOOKS` (`components/illustrations/people/looks.ts`): pick skin,
hair, hairstyle, shirt colour and extras so the two speakers look clearly different (a test checks this).

### Add a reading text

Add it to a file in `data/reading/`. Give the German text, translations, and four tasks (true/false, choice, matching).
Each non-matching task needs an `evidence` passage that occurs word for word in the text.

### Add a listening message

Add it to `data/listening/messages.json`. The browser reads `lines[].de` aloud, so **write numbers, times and prices as
words** in the script ("um halb acht", "vier Euro zwanzig"); the validator rejects digits there. The `options` use digits
("7:30 Uhr", "4,20 €"). Make the two wrong options plausible traps (fünfzehn / fünfzig, halb acht / acht). `evidence` is
the part of a line that gives the answer; it is highlighted in the transcript.

Dictation needs no content of its own: it uses dialogue lines, listening-message lines and word-order sentences without
digits (see `isDictatable` in `lib/dictation.ts`).

### Add a minimal pair

Add it to `data/listening/sounds.json` with one of the contrasts in `SOUND_CONTRASTS` (`types/listening.ts`). Both words
must be real and differ in that one sound only. A new contrast also needs a `label` and `tip` in `Listen.sounds.contrasts`
in all three message files.

### Change the practice exam

Edit `data/exam/a1.json`. Listening: `script` is read aloud by the browser, `translation` is shown to people whose browser
cannot speak; `answer` must be one of the three `options`. Writing: `expected` answers and `patterns` are lower-case;
a point is earned when the text contains any pattern. Speaking has no automatic scoring: the learner ticks the checklist.
The reading part reuses texts from `data/reading/` (`lesen.textIds`).

### Add a UI text

Add the key to **all three** files in `messages/`. Use the same `{arguments}`. Use plural syntax for counts:
`{count, plural, one {# word} other {# words}}` (Persian needs only `other`). Never write UI text in a component.

## Adding a new batch with an AI assistant

The app itself uses no AI, but you can draft content with one. The ready-made prompt is in `data/vocab/README.md`.
Always check the output yourself: German forms and Persian wording must be reviewed by a person before they ship.

## Review checklist before publishing content

- [ ] A German speaker read every new German sentence.
- [ ] A Persian speaker read every new Persian line.
- [ ] No sentence was copied from a book, exam or website.
- [ ] `npm run validate:data` shows 0 errors and 0 warnings.
- [ ] `npm test` and `npm run build` pass.
- [ ] You opened the new page in all three languages, including `/fa` (right-to-left).
