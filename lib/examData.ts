import raw from "../data/exam/a1.json";
import { ExamSchema } from "./schemas/exam";
import type { ExamData } from "../types/exam";

// Validated once at module load; throws a ZodError on malformed data.
export const exam: ExamData = ExamSchema.parse(raw);
