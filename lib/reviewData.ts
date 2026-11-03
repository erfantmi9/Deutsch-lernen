import { buildReviewCards } from "./reviewCards";
import { verbs } from "./verbs";
import { vocab } from "./vocab";
import { adjectives, adverbs, phrases, prepositions } from "./vocabExtended";

/** Every reviewable card in the app. Server-side: pages pass slices of it to client components. */
export const reviewCards = buildReviewCards({ nouns: vocab, verbs, adjectives, adverbs, prepositions, phrases });

export const reviewCardIds: ReadonlySet<string> = new Set(reviewCards.map((c) => c.id));
