import { EXAM_MODULES } from "@/types/exam";
import type { ExamModule } from "@/types/exam";

/**
 * The exam run in progress, persisted so a refresh or a locked phone resumes it.
 *
 * The timer is stored as its END TIMESTAMP (ms since epoch), never as "seconds left": whatever happens while the page is
 * hidden or closed, the remaining time is simply `endsAt - now`.
 */
export const EXAM_SESSION_KEY = "deutsch-learner:exam-session";
export const EXAM_SESSION_VERSION = 2;

export interface SessionResult {
  module: ExamModule;
  points: number;
  got: number;
  total: number;
}

export interface ExamSession {
  version: typeof EXAM_SESSION_VERSION;
  /** The part on screen, or null between parts of a full run. */
  current: ExamModule | null;
  /** Parts still to do after `current`. */
  plan: ExamModule[];
  results: Partial<Record<ExamModule, SessionResult>>;
  fullRun: boolean;
  /** When the running part's time is up; null between parts. */
  endsAt: number | null;
  /** Each part's own answer state (JSON). Shape is owned by that part, which validates it on restore. */
  answers: Partial<Record<ExamModule, unknown>>;
}

const isModule = (v: unknown): v is ExamModule => typeof v === "string" && (EXAM_MODULES as readonly string[]).includes(v);
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/**
 * Turns whatever is stored into a valid session, or null. Never throws.
 * Version 1 (stage 3, never shipped with answers: `{ module, secondsLeft }`) cannot be resumed honestly because it has no
 * timestamp, so it is dropped rather than guessed.
 */
export function migrateSession(raw: unknown): ExamSession | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (r.version !== EXAM_SESSION_VERSION) return null;
  const current = r.current === null ? null : isModule(r.current) ? r.current : undefined;
  if (current === undefined) return null;
  const plan = Array.isArray(r.plan) ? r.plan.filter(isModule) : [];
  const results: ExamSession["results"] = {};
  if (typeof r.results === "object" && r.results !== null) {
    for (const [k, v] of Object.entries(r.results as Record<string, unknown>)) {
      const x = v as Partial<SessionResult> | null;
      if (isModule(k) && x && x.module === k && isNum(x.points) && isNum(x.got) && isNum(x.total)) {
        results[k] = { module: k, points: x.points, got: x.got, total: x.total };
      }
    }
  }
  const endsAt = isNum(r.endsAt) ? r.endsAt : null;
  if (current && endsAt === null) return null; // a running part without a deadline cannot be resumed
  const answers: ExamSession["answers"] = {};
  if (typeof r.answers === "object" && r.answers !== null) {
    for (const [k, v] of Object.entries(r.answers as Record<string, unknown>)) if (isModule(k)) answers[k] = v;
  }
  if (!current && plan.length === 0) return null; // nothing left to resume
  return { version: EXAM_SESSION_VERSION, current, plan, results, fullRun: r.fullRun === true, endsAt, answers };
}

const storage = (): Storage | null => {
  try {
    return typeof window === "undefined" ? null : window.localStorage;
  } catch {
    return null;
  }
};

export function loadSession(): ExamSession | null {
  try {
    const s = storage()?.getItem(EXAM_SESSION_KEY);
    return s ? migrateSession(JSON.parse(s)) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: ExamSession): void {
  try {
    storage()?.setItem(EXAM_SESSION_KEY, JSON.stringify(session));
  } catch {
    /* quota or private mode: the run simply is not resumable */
  }
}

export function clearSession(): void {
  try {
    storage()?.removeItem(EXAM_SESSION_KEY);
  } catch {
    /* ignore */
  }
}

/** Seconds left, rounded up, never negative. */
export const secondsLeft = (endsAt: number, now: number) => Math.max(0, Math.ceil((endsAt - now) / 1000));

/** Which timer warning applies (5-minute, then 1-minute). Each is announced once per part. */
export function warningFor(left: number): "minute" | "five" | null {
  if (left <= 60) return "minute";
  if (left <= 300) return "five";
  return null;
}
