import { z } from "zod";

export const TextSchema = z.string().trim().min(1);
export const LevelSchema = z.enum(["A1", "A2"]);
export const I18n2Schema = z.object({ en: TextSchema, fa: TextSchema });
export const I18n3Schema = z.object({ en: TextSchema, fa: TextSchema, de: TextSchema });
