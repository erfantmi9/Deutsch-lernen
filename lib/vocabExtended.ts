import adjectivesRaw from "../data/vocab/a1/adjectives.json";
import adverbsRaw from "../data/vocab/a1/adverbs.json";
import prepositionsRaw from "../data/vocab/a1/prepositions.json";
import phrasesRaw from "../data/vocab/a1/phrases.json";
import { AdjectiveListSchema, AdverbListSchema, PhraseListSchema, PrepositionListSchema } from "./schemas/vocabExtended";
import type { AdjectiveEntry, AdverbEntry, PhraseEntry, PrepositionEntry } from "../types/vocab-extended";

// Validated once at module load; throws a ZodError on malformed data.
export const adjectives: readonly AdjectiveEntry[] = AdjectiveListSchema.parse(adjectivesRaw);
export const adverbs: readonly AdverbEntry[] = AdverbListSchema.parse(adverbsRaw);
export const prepositions: readonly PrepositionEntry[] = PrepositionListSchema.parse(prepositionsRaw);
export const phrases: readonly PhraseEntry[] = PhraseListSchema.parse(phrasesRaw);
