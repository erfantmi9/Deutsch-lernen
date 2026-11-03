"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { formatClock, scoreListening, scoreSpeaking, scoreWriting, toModulePoints, wordCount } from "@/lib/exam";
import { scoreTasks } from "@/lib/readingLogic";
import type { TaskResponse } from "@/lib/readingLogic";
import { seededShuffle } from "@/lib/shuffle";
import { RATE, speak, stopSpeaking } from "@/lib/speech";
import type { ExamData, ExamModule } from "@/types/exam";
import type { ReadingText } from "@/types/reading";
import { TaskCard } from "./ReadingView";
import SpeakButton from "./SpeakButton";
import { useSpeechSupport } from "./useSpeech";

type Locale = "en" | "fa" | "de";

/** What a part reports when it is handed in. `got` of `total` items, scaled to `points` of 25. */
export interface PartResult {
  module: ExamModule;
  points: number;
  got: number;
  total: number;
}

/** Counts down from `seconds` and calls `onExpire` once at zero. */
function useCountdown(seconds: number, onExpire: () => void): number {
  const [remaining, setRemaining] = useState(seconds);
  const expire = useRef(onExpire);
  useEffect(() => {
    expire.current = onExpire;
  });
  useEffect(() => {
    const end = Date.now() + seconds * 1000;
    let fired = false;
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0 && !fired) {
        fired = true;
        window.clearInterval(id);
        expire.current();
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [seconds]);
  return remaining;
}

function PartShell({
  title,
  seconds,
  onExpire,
  onHandIn,
  children,
}: {
  title: string;
  seconds: number;
  onExpire: () => void;
  onHandIn: () => void;
  children: React.ReactNode;
}) {
  const t = useTranslations("Exam");
  const remaining = useCountdown(seconds, onExpire);
  const announcement = remaining <= 60 ? t("warnMinute") : remaining <= 300 ? t("warnFive") : "";
  return (
    <div className="space-y-5">
      <div className="sticky top-16 z-20 flex items-center justify-between gap-3 rounded-full border border-border bg-surface/95 px-5 py-2 shadow-soft backdrop-blur">
        <h1 className="text-lg font-extrabold">{title}</h1>
        <p role="timer" className={"text-lg font-extrabold tabular-nums " + (remaining <= 60 ? "text-danger" : "")} dir="ltr">
          <span className="sr-only">{t("timeLeft")}: </span>
          {formatClock(remaining)}
        </p>
      </div>
      <p className="sr-only" aria-live="polite">
        {announcement}
      </p>
      {children}
      <button type="button" onClick={onHandIn} className="btn btn-primary w-full py-3 text-lg">
        {t("handIn")}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------- Lesen

export function LesenPart({ texts, seconds, onDone }: { texts: ReadingText[]; seconds: number; onDone: (r: PartResult) => void }) {
  const t = useTranslations("Exam");
  const locale = useLocale() as Locale;
  const [responses, setResponses] = useState<TaskResponse[][]>(() => texts.map((x) => x.tasks.map(() => null)));
  const latest = useRef(responses);
  useEffect(() => {
    latest.current = responses;
  });

  const finish = useCallback(() => {
    let got = 0;
    let total = 0;
    texts.forEach((x, i) => {
      const s = scoreTasks(x.tasks, latest.current[i]);
      got += s.correct;
      total += s.total;
    });
    onDone({ module: "lesen", points: toModulePoints(got, total), got, total });
  }, [texts, onDone]);

  return (
    <PartShell title={t("modules.lesen")} seconds={seconds} onExpire={finish} onHandIn={finish}>
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

export function HoerenPart({ items, seconds, onDone }: { items: ExamData["hoeren"]; seconds: number; onDone: (r: PartResult) => void }) {
  const t = useTranslations("Exam");
  const locale = useLocale() as Locale;
  const tr = locale === "de" ? "en" : locale;
  const { supported } = useSpeechSupport();
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [plays, setPlays] = useState<Record<string, number>>({});
  const latest = useRef(answers);
  useEffect(() => {
    latest.current = answers;
  });
  useEffect(() => () => stopSpeaking(), []);

  const finish = useCallback(() => {
    const s = scoreListening(items, latest.current);
    onDone({ module: "hoeren", points: s.points, got: s.correct, total: s.total });
  }, [items, onDone]);

  return (
    <PartShell title={t("modules.hoeren")} seconds={seconds} onExpire={finish} onHandIn={finish}>
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

export function SchreibenPart({ data, seconds, onDone }: { data: ExamData["schreiben"]; seconds: number; onDone: (r: PartResult) => void }) {
  const t = useTranslations("Exam");
  const locale = useLocale() as Locale;
  const [values, setValues] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const latest = useRef({ values, message });
  useEffect(() => {
    latest.current = { values, message };
  });

  const finish = useCallback(() => {
    const s = scoreWriting(data, latest.current.values, latest.current.message);
    onDone({ module: "schreiben", points: s.points, got: s.formCorrect + s.found.length, total: s.formTotal + data.message.points.length });
  }, [data, onDone]);

  const words = wordCount(message);
  return (
    <PartShell title={t("modules.schreiben")} seconds={seconds} onExpire={finish} onHandIn={finish}>
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
                value={values[f.id] ?? ""}
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
            dir="ltr"
            lang="de"
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full rounded-3xl border-2 border-border bg-surface p-4 text-lg outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30"
          />
        </label>
        <p className="text-sm text-text-muted" aria-live="polite">
          {t("writing.words", { count: words })}
        </p>
      </section>
    </PartShell>
  );
}

// ---------------------------------------------------------------- Sprechen

export function SprechenPart({ parts, seconds, onDone }: { parts: ExamData["sprechen"]; seconds: number; onDone: (r: PartResult) => void }) {
  const t = useTranslations("Exam");
  const locale = useLocale() as Locale;
  const [ticked, setTicked] = useState<Set<string>>(new Set());
  const [showModel, setShowModel] = useState<Set<string>>(new Set());
  const latest = useRef(ticked);
  useEffect(() => {
    latest.current = ticked;
  });

  const finish = useCallback(() => {
    const s = scoreSpeaking(parts, latest.current);
    onDone({ module: "sprechen", points: s.points, got: s.ticked, total: s.total });
  }, [parts, onDone]);

  const toggle = (set: Set<string>, key: string): Set<string> => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    return next;
  };

  return (
    <PartShell title={t("modules.sprechen")} seconds={seconds} onExpire={finish} onHandIn={finish}>
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
