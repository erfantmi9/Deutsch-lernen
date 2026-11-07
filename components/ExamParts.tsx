"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatClock, scoreListening, scoreSpeaking, scoreWriting, toModulePoints, wordCount } from "@/lib/exam";
import { secondsLeft, warningFor } from "@/lib/examSession";
import { isAnswered, scoreTasks } from "@/lib/readingLogic";
import type { TaskResponse } from "@/lib/readingLogic";
import { seededShuffle } from "@/lib/shuffle";
import { RATE, speak, stopSpeaking } from "@/lib/speech";
import type { ExamData, ExamModule } from "@/types/exam";
import type { ReadingText } from "@/types/reading";
import { TaskCard } from "./ReadingView";
import SpeakButton from "./SpeakButton";
import SpecialCharBar from "./SpecialCharBar";
import ConfirmDialog from "./ui/ConfirmDialog";
import StickyActionBar from "./ui/StickyActionBar";
import { useKeyboardInset } from "./ui/useKeyboardInset";
import { useSpeechSupport } from "./useSpeech";

type Locale = "en" | "fa" | "de";

/** What a part reports when it is handed in. `got` of `total` items, scaled to `points` of 25. */
export interface PartResult {
  module: ExamModule;
  points: number;
  got: number;
  total: number;
  /** Handed in by the timer (including on return after the time ran out while the page was hidden or closed). */
  timeUp?: boolean;
}

/** Props every part shares: the deadline, its saved answers (from a resumed run) and a callback to persist them. */
export interface PartProps {
  endsAt: number;
  onDone: (r: PartResult) => void;
  /** The part's own answer state from a persisted run (validated by the part; ignored if malformed). */
  saved?: unknown;
  onSave?: (state: unknown) => void;
}

const asRecord = (v: unknown): Record<string, unknown> | null =>
  typeof v === "object" && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null;
const stringMap = (v: unknown): Record<string, string> => {
  const r = asRecord(v);
  return r ? (Object.fromEntries(Object.entries(r).filter(([, x]) => typeof x === "string")) as Record<string, string>) : {};
};
const stringSet = (v: unknown): Set<string> => new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);

/** Persists a part's answer state whenever it changes (not on mount: the restored state is already stored). */
function useSaveOnChange(state: unknown, onSave?: (s: unknown) => void) {
  const first = useRef(true);
  const save = useRef(onSave);
  useEffect(() => {
    save.current = onSave;
  });
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    save.current?.(state);
  }, [state]);
}

/** How much of a part is filled in: drives the bar's "n/m answered · Missing: …" and the hand-in confirmation. */
export interface PartProgress {
  answered: number;
  total: number;
  /** Short labels of what is still open (item numbers or field names). */
  missing: string[];
  /** Speaking is self-assessment: items are ticked, not answered. */
  ticks?: boolean;
}

/**
 * Counts down to `endsAt` (a timestamp, so a refresh or a locked phone loses nothing) and calls `onExpire` once at zero.
 * Re-checks immediately when the page becomes visible again (timers are throttled or frozen while hidden), so a part
 * whose time ran out in the background is handed in on return. Also hands in at once when the deadline had already
 * passed on mount (a resumed run).
 */
function useCountdown(endsAt: number, onExpire: () => void): number {
  const [remaining, setRemaining] = useState(() => secondsLeft(endsAt, Date.now()));
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });
  useEffect(() => {
    let fired = false;
    let id = 0;
    const tick = () => {
      const left = secondsLeft(endsAt, Date.now());
      setRemaining(left);
      if (left === 0 && !fired) {
        fired = true;
        window.clearInterval(id);
        expire.current();
      }
    };
    id = window.setInterval(tick, 1000);
    const onVisible = () => {
      if (document.visibilityState === "visible") tick();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("pageshow", onVisible);
    tick();
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("pageshow", onVisible);
    };
  }, [endsAt]);
  return remaining;
}

/**
 * The 5-minute, then the 1-minute warning, each set once. Kept as state that only moves forward, so the live region's
 * text changes exactly twice per part (a resumed part with < 1 minute left only gets the 1-minute one).
 */
function useTimerWarning(remaining: number): "minute" | "five" | null {
  const [warning, setWarning] = useState<"minute" | "five" | null>(null);
  const w = warningFor(remaining);
  if (w !== null && w !== warning && warning !== "minute") setWarning(w);
  return warning;
}

const MAX_LISTED = 4;

function PartShell({
  title,
  endsAt,
  progress,
  toolbar,
  onFinish,
  children,
}: {
  title: string;
  endsAt: number;
  progress: PartProgress;
  /** Rendered in the bar's single row while the on-screen keyboard is open (e.g. the ä ö ü ß keys). */
  toolbar?: React.ReactNode;
  /** Scores and hands in the part. Called once by the confirmed hand-in and once by the timer, never both. */
  onFinish: (timeUp?: boolean) => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("Exam");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const remaining = useCountdown(endsAt, () => {
    setConfirmOpen(false);
    onFinish(true);
  });
  // The timer warnings are the ONE live region of an exam part (the bar status below is deliberately not live).
  const warning = useTimerWarning(remaining);
  const announcement = warning === "minute" ? t("warnMinute") : warning === "five" ? t("warnFive") : "";

  const open = progress.total - progress.answered;
  const listed = progress.missing.slice(0, MAX_LISTED).join(", ") + (progress.missing.length > MAX_LISTED ? " …" : "");
  const status =
    (progress.ticks ? t("progressTicked", { answered: progress.answered, total: progress.total }) : t("progress", { answered: progress.answered, total: progress.total })) +
    (progress.missing.length > 0 ? ` · ${t("missing", { items: listed })}` : "");

  return (
    <div className="space-y-5">
      <div className="sticky top-header z-20 flex items-center justify-between gap-3 rounded-full border border-border bg-surface/95 px-5 py-2 shadow-soft backdrop-blur">
        {/* Focused when the part starts, so a screen reader announces which part this is. */}
        <h1 id="exam-focus" tabIndex={-1} className="text-lg font-extrabold outline-none">
          {title}
        </h1>
        <p role="timer" className={"text-lg font-extrabold tabular-nums " + (remaining <= 60 ? "text-danger" : "")} dir="ltr">
          <span className="sr-only">{t("timeLeft")}: </span>
          {formatClock(remaining)}
        </p>
      </div>
      <p className="sr-only" aria-live="polite" data-timer-warning>
        {announcement}
      </p>
      {children}

      <StickyActionBar
        label={t("handIn")}
        onAction={() => setConfirmOpen(true)}
        status={status}
        statusLive={false}
        toolbar={toolbar}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={t("handInConfirmTitle")}
        message={open > 0 ? t("handInUnanswered", { count: open, total: progress.total }) : t("handInAll", { total: progress.total })}
        confirmLabel={t("handInConfirm")}
        tone={open > 0 ? "danger" : "primary"}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => {
          setConfirmOpen(false);
          onFinish();
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- Lesen

export function LesenPart({ texts, endsAt, onDone, saved, onSave }: PartProps & { texts: ReadingText[] }) {
  const t = useTranslations("Exam");
  const locale = useLocale() as Locale;
  const [responses, setResponses] = useState<TaskResponse[][]>(() => {
    const prev = Array.isArray(saved) ? (saved as unknown[]) : [];
    return texts.map((x, i) =>
      x.tasks.map((_, j) => {
        const v = Array.isArray(prev[i]) ? (prev[i] as unknown[])[j] : null;
        return typeof v === "boolean" || typeof v === "string" || asRecord(v) ? (v as TaskResponse) : null;
      }),
    );
  });
  useSaveOnChange(responses, onSave);
  const latest = useRef(responses);
  useEffect(() => {
    latest.current = responses;
  });

  const finish = useCallback((timeUp?: boolean) => {
    let got = 0;
    let total = 0;
    texts.forEach((x, i) => {
      const s = scoreTasks(x.tasks, latest.current[i]);
      got += s.correct;
      total += s.total;
    });
    onDone({ module: "lesen", points: toModulePoints(got, total), got, total, timeUp });
  }, [texts, onDone]);

  const missing: string[] = [];
  let total = 0;
  texts.forEach((x, ti) =>
    x.tasks.forEach((task, i) => {
      total++;
      if (!isAnswered(task, responses[ti][i])) missing.push(`${ti + 1}.${i + 1}`);
    }),
  );

  return (
    <PartShell title={t("modules.lesen")} endsAt={endsAt} onFinish={finish} progress={{ answered: total - missing.length, total, missing }}>
      {texts.map((text, ti) => (
        <section key={text.id} className="space-y-3">
          <h3 className="text-lg font-extrabold">{text.title.de}</h3>
          <p dir="ltr" lang="de" className="whitespace-pre-line rounded-2xl bg-surface-2 p-4 text-lg leading-relaxed">
            {text.text}
          </p>
          {text.tasks.map((task, i) => (
            <TaskCard
              key={task.id}
              task={task}
              index={i}
              response={responses[ti][i]}
              checked={false}
              locale={locale}
              onChange={(value) => setResponses((r) => r.map((row, a) => (a === ti ? row.map((v, b) => (b === i ? value : v)) : row)))}
            />
          ))}
        </section>
      ))}
    </PartShell>
  );
}

// ---------------------------------------------------------------- Hören

const MAX_PLAYS = 2;

export function HoerenPart({ items, endsAt, onDone, saved, onSave }: PartProps & { items: ExamData["hoeren"] }) {
  const t = useTranslations("Exam");
  const locale = useLocale() as Locale;
  const tr = locale === "de" ? "en" : locale;
  const { supported } = useSpeechSupport();
  const [answers, setAnswers] = useState<Record<string, string>>(() => stringMap(asRecord(saved)?.answers));
  const [plays, setPlays] = useState<Record<string, number>>(() => {
    const r = asRecord(asRecord(saved)?.plays) ?? {};
    return Object.fromEntries(Object.entries(r).filter(([, v]) => typeof v === "number")) as Record<string, number>;
  });
  const snapshot = useMemo(() => ({ answers, plays }), [answers, plays]);
  useSaveOnChange(snapshot, onSave);
  const latest = useRef(answers);
  useEffect(() => {
    latest.current = answers;
  });
  useEffect(() => () => stopSpeaking(), []);

  const finish = useCallback((timeUp?: boolean) => {
    const s = scoreListening(items, latest.current);
    onDone({ module: "hoeren", points: s.points, got: s.correct, total: s.total, timeUp });
  }, [items, onDone]);

  const missing = items.flatMap((item, i) => (answers[item.id] ? [] : [String(i + 1)]));

  return (
    <PartShell
      title={t("modules.hoeren")}
      endsAt={endsAt}
      onFinish={finish}
      progress={{ answered: items.length - missing.length, total: items.length, missing }}
    >
      {!supported && <p className="feedback-hint">{t("noSpeech")}</p>}
      {items.map((item, i) => {
        const used = plays[item.id] ?? 0;
        const options = seededShuffle(item.options, item.id);
        return (
          <fieldset key={item.id} className="card space-y-3 p-5">
            <legend className="sr-only">{t("listeningItem", { n: i + 1 })}</legend>
            <p className="eyebrow">{t("listeningItem", { n: i + 1 })}</p>
            {supported ? (
              <button
                type="button"
                disabled={used >= MAX_PLAYS}
                onClick={() => {
                  setPlays((p) => ({ ...p, [item.id]: (p[item.id] ?? 0) + 1 }));
                  speak(item.script, RATE.normal);
                }}
                className="btn btn-secondary"
              >
                <span aria-hidden="true">🔊</span> {t("play", { left: MAX_PLAYS - used })}
              </button>
            ) : (
              <div className="space-y-1">
                <p dir="ltr" lang="de" className="rounded-2xl bg-surface-2 p-3">
                  {item.script}
                </p>
                <p lang={tr} className="text-sm text-text-muted">
                  {item.translation[tr]}
                </p>
              </div>
            )}
            <p dir="ltr" lang="de" className="text-lg font-extrabold">
              {item.question}
            </p>
            <div role="group" aria-label={item.question} className="grid gap-2 sm:grid-cols-3">
              {options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  aria-pressed={answers[item.id] === opt}
                  onClick={() => setAnswers((a) => ({ ...a, [item.id]: opt }))}
                  className="pill min-h-12 justify-center whitespace-normal py-2 text-center"
                >
                  <bdi dir="ltr" lang="de">
                    {opt}
                  </bdi>
                </button>
              ))}
            </div>
          </fieldset>
        );
      })}
    </PartShell>
  );
}

// ---------------------------------------------------------------- Schreiben

type TextField = HTMLInputElement | HTMLTextAreaElement;

export function SchreibenPart({ data, endsAt, onDone, saved, onSave }: PartProps & { data: ExamData["schreiben"] }) {
  const t = useTranslations("Exam");
  const locale = useLocale() as Locale;
  const keyboard = useKeyboardInset();
  const [values, setValues] = useState<Record<string, string>>(() => stringMap(asRecord(saved)?.values));
  const [message, setMessage] = useState(() => {
    const m = asRecord(saved)?.message;
    return typeof m === "string" ? m : "";
  });
  const snapshot = useMemo(() => ({ values, message }), [values, message]);
  useSaveOnChange(snapshot, onSave);
  const latest = useRef({ values, message });
  useEffect(() => {
    latest.current = { values, message };
  });

  // The ä ö ü ß keys insert into whichever field was focused last (the message by default).
  const messageRef = useRef<HTMLTextAreaElement>(null);
  const active = useRef<{ el: TextField; key: string } | null>(null);
  const remember = (key: string) => (e: React.FocusEvent<TextField>) => {
    active.current = { el: e.currentTarget, key };
  };
  const insertChar = (ch: string) => {
    const target = active.current ?? (messageRef.current ? { el: messageRef.current as TextField, key: "message" } : null);
    if (!target) return;
    const { el, key } = target;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const next = el.value.slice(0, start) + ch + el.value.slice(end);
    if (key === "message") setMessage(next);
    else setValues((v) => ({ ...v, [key]: next }));
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(start + 1, start + 1);
    });
  };

  // Keyboard open: keep the field you are typing in between the header and the bar (scroll-padding covers both).
  useEffect(() => {
    if (keyboard > 0) active.current?.el.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [keyboard]);

  const finish = useCallback((timeUp?: boolean) => {
    const s = scoreWriting(data, latest.current.values, latest.current.message);
    onDone({ module: "schreiben", points: s.points, got: s.formCorrect + s.found.length, total: s.formTotal + data.message.points.length, timeUp });
  }, [data, onDone]);

  const words = wordCount(message);
  const missing = [
    ...data.form.fields.filter((f) => !(values[f.id] ?? "").trim()).map((f) => f.label[locale]),
    ...(words === 0 ? [t("writing.messageTitle")] : []),
  ];
  const total = data.form.fields.length + 1;

  return (
    <PartShell
      title={t("modules.schreiben")}
      endsAt={endsAt}
      onFinish={finish}
      progress={{ answered: total - missing.length, total, missing }}
      toolbar={keyboard > 0 ? <SpecialCharBar compact onInsert={insertChar} /> : null}
    >
      <section className="card space-y-4 p-5">
        <p className="eyebrow">{t("writing.formTitle")}</p>
        <p lang={locale}>{data.form.situation[locale]}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          {data.form.fields.map((f) => (
            <label key={f.id} className="space-y-1">
              <span className="text-sm font-bold">{f.label[locale]}</span>
              <input
                type="text"
                dir="ltr"
                lang="de"
                autoComplete="off"
                autoCapitalize="none"
                spellCheck={false}
                value={values[f.id] ?? ""}
                onFocus={remember(f.id)}
                onChange={(e) => setValues((v) => ({ ...v, [f.id]: e.target.value }))}
                className="min-h-11 w-full rounded-full border-2 border-border bg-surface px-4 py-2 outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30"
              />
            </label>
          ))}
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <p className="eyebrow">{t("writing.messageTitle")}</p>
        <p lang={locale}>{data.message.prompt[locale]}</p>
        <label className="block space-y-1">
          <span className="sr-only">{t("writing.messageTitle")}</span>
          <textarea
            ref={messageRef}
            dir="ltr"
            lang="de"
            rows={6}
            value={message}
            onFocus={remember("message")}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-3xl border-2 border-border bg-surface p-4 text-lg outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30"
          />
        </label>
        {/* Not a live region: the word count would be announced on every keystroke. */}
        <p className="text-sm text-text-muted">{t("writing.words", { count: words })}</p>
        {/* ä ö ü ß: here normally; while the keyboard is open they move into the bar, above the keyboard. */}
        {keyboard === 0 && <SpecialCharBar onInsert={insertChar} />}
      </section>
    </PartShell>
  );
}

// ---------------------------------------------------------------- Sprechen

export function SprechenPart({ parts, endsAt, onDone, saved, onSave }: PartProps & { parts: ExamData["sprechen"] }) {
  const t = useTranslations("Exam");
  const locale = useLocale() as Locale;
  const [ticked, setTicked] = useState<Set<string>>(() => stringSet(asRecord(saved)?.ticked));
  const [showModel, setShowModel] = useState<Set<string>>(() => stringSet(asRecord(saved)?.showModel));
  const snapshot = useMemo(() => ({ ticked: [...ticked], showModel: [...showModel] }), [ticked, showModel]);
  useSaveOnChange(snapshot, onSave);
  const latest = useRef(ticked);
  useEffect(() => {
    latest.current = ticked;
  });

  const finish = useCallback((timeUp?: boolean) => {
    const s = scoreSpeaking(parts, latest.current);
    onDone({ module: "sprechen", points: s.points, got: s.ticked, total: s.total, timeUp });
  }, [parts, onDone]);

  const toggle = (set: Set<string>, key: string): Set<string> => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  const total = parts.reduce((n, p) => n + p.checklist.length, 0);
  // "Missing" lists the tasks where nothing is ticked yet.
  const missing = parts.filter((p) => !p.checklist.some((c) => ticked.has(`${p.id}:${c.id}`))).map((p) => p.title[locale]);

  return (
    <PartShell
      title={t("modules.sprechen")}
      endsAt={endsAt}
      onFinish={finish}
      progress={{ answered: ticked.size, total, missing, ticks: true }}
    >
      <p className="feedback-hint">{t("speaking.honest")}</p>
      {parts.map((p) => (
        <section key={p.id} className="card space-y-3 p-5">
          <h3 className="text-lg font-extrabold">{p.title[locale]}</h3>
          <p lang={locale}>{p.instruction[locale]}</p>
          <ul className="flex flex-wrap gap-2" aria-label={t("speaking.cues")}>
            {p.cues.map((c) => (
              <li key={c} className="rounded-full border border-border bg-surface-2 px-3 py-1 font-bold">
                <bdi dir="ltr" lang="de">
                  {c}
                </bdi>
              </li>
            ))}
          </ul>
          <fieldset className="space-y-1">
            <legend className="text-sm font-bold">{t("speaking.checklist")}</legend>
            {p.checklist.map((c) => {
              const key = `${p.id}:${c.id}`;
              return (
                <label key={c.id} className="flex min-h-11 items-center gap-3">
                  <input type="checkbox" checked={ticked.has(key)} onChange={() => setTicked((s) => toggle(s, key))} className="size-5" />
                  <span lang={locale}>{c.label[locale]}</span>
                </label>
              );
            })}
          </fieldset>
          <button type="button" aria-pressed={showModel.has(p.id)} onClick={() => setShowModel((s) => toggle(s, p.id))} className="pill">
            {t("speaking.model")}
          </button>
          {showModel.has(p.id) && (
            <ul className="space-y-2">
              {p.model.map((line) => (
                <li key={line} className="flex items-center gap-2">
                  <SpeakButton text={line} compact />
                  <bdi dir="ltr" lang="de" className="font-semibold">
                    {line}
                  </bdi>
                </li>
              ))}
            </ul>
          )}
        </section>
      ))}
    </PartShell>
  );
}
