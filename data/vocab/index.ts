import { VocabListSchema } from "../../lib/schemas/vocab";
import type { VocabEntry } from "../../types/vocab";

import food from "./a1/food.json";
import family from "./a1/family.json";
import home from "./a1/home.json";
import travel from "./a1/travel.json";
import time from "./a1/time.json";
import school from "./a1/school.json";
import body from "./a1/body.json";

// Add new category files to this list. Validated once at module load; throws a ZodError on bad data.
const all: unknown[] = [...food, ...family, ...home, ...travel, ...time, ...school, ...body];

export const vocab: readonly VocabEntry[] = VocabListSchema.parse(all);
