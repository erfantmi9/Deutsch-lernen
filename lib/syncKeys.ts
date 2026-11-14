/** localStorage keys of the zustand stores that are synced to the account. */
export const SYNCED_KEYS = [
  "deutsch-learner:activity",
  "deutsch-learner:dialogues",
  "deutsch-learner:exam",
  "deutsch-learner:grammar",
  "deutsch-learner:learn",
  "deutsch-learner:listen",
  "deutsch-learner:numbers",
  "deutsch-learner:quiz",
  "deutsch-learner:reading",
  "deutsch-learner:sentences",
  "deutsch-learner:srs",
  "deutsch-learner:verbs",
] as const;

export type SyncedKey = (typeof SYNCED_KEYS)[number];

export function isSyncedKey(k: string): k is SyncedKey {
  return (SYNCED_KEYS as readonly string[]).includes(k);
}
