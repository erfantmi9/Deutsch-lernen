import { VocabListSchema } from "../../lib/schemas/vocab";
import type { VocabEntry } from "../../types/vocab";

import food from "./a1/food.json";
import family from "./a1/family.json";
import home from "./a1/home.json";
import travel from "./a1/travel.json";
import time from "./a1/time.json";
import school from "./a1/school.json";
import body from "./a1/body.json";
import shopping from "./a1/shopping.json";
import jobs from "./a1/jobs.json";
import weather from "./a1/weather.json";
import colors from "./a1/colors.json";
import clothes from "./a1/clothes.json";
import city from "./a1/city.json";
import hobbies from "./a1/hobbies.json";
import numbersTime from "./a1/numbers-time.json";
import health from "./a1/health.json";
import animals from "./a1/animals.json";
import services from "./a1/services.json";
import celebrations from "./a1/celebrations.json";

// Add new category files to this list. Validated once at module load; throws a ZodError on bad data.
const all: unknown[] = [
  ...food,
  ...family,
  ...home,
  ...travel,
  ...time,
  ...school,
  ...body,
  ...shopping,
  ...jobs,
  ...weather,
  ...colors,
  ...clothes,
  ...city,
  ...hobbies,
  ...numbersTime,
  ...health,
  ...animals,
  ...services,
  ...celebrations,
];

export const vocab: readonly VocabEntry[] = VocabListSchema.parse(all);
