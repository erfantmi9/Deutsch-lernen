import type { Problem } from "./rules";

/** Consistency checks between the message files. Pure: the parsed JSON is passed in. */

export function flattenMessages(obj: unknown, prefix = ""): Record<string, string> {
  if (typeof obj === "string") return { [prefix]: obj };
  if (typeof obj !== "object" || obj === null) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(obj)) Object.assign(out, flattenMessages(v, prefix ? `${prefix}.${k}` : k));
  return out;
}

/** Names of the arguments in an ICU message, e.g. "{count, plural, ...} of {total}" gives count and total. */
export function placeholders(message: string): string[] {
  const names = new Set<string>();
  for (const m of message.matchAll(/\{\s*([A-Za-z_]\w*)\s*(?:,|\})/g)) names.add(m[1]);
  return [...names].sort();
}

/** `base` is the reference language (en). Every other language must have the same keys and the same arguments. */
export function checkMessages(base: unknown, other: unknown, label: string): { key: string; problem: Problem }[] {
  const a = flattenMessages(base);
  const b = flattenMessages(other);
  const out: { key: string; problem: Problem }[] = [];
  const err = (key: string, message: string) => out.push({ key, problem: { severity: "error", message: `${label}: ${message}` } });

  for (const key of Object.keys(a)) {
    if (!(key in b)) err(key, "missing");
    else if (b[key].trim() === "") err(key, "empty");
    else if (placeholders(a[key]).join(",") !== placeholders(b[key]).join(",")) {
      err(key, `placeholders differ (${placeholders(a[key]).join(", ")} vs ${placeholders(b[key]).join(", ")})`);
    }
  }
  for (const key of Object.keys(b)) if (!(key in a)) err(key, "not in the reference language");
  return out;
}
