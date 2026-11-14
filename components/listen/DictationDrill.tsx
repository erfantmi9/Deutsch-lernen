"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import type { KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { checkDictation, DICTATION_LEVELS, DICTATION_ROUND, isMinor, levelOf, pickRound, sentenceParts } from "@/lib/dictation";
import type { DictationLevel, DictationOp, DictationResult, DictationSentence, WordMark } from "@/lib/dictation";
import { getSpeakingKey, RATE, speak, speechKey, stopSpeaking, subscribeSpeech } from "@/lib/speech";
import { useListenStore } from "@/stores/listenStore";
import PageHeader from "../PageHeader";
import SpeakButton from "../SpeakButton";
import SpecialCharBar from "../SpecialCharBar";
import Mascot from "../illustrations/Mascot";
import ConfirmDialog from "../ui/ConfirmDialog";
import FeedbackRegion from "../ui/FeedbackRegion";
import StickyActionBar from "../ui/StickyActionBar";
import { useScrollIntoViewOnChange } from "../ui/useScrollIntoViewOnChange";
import BackToListen from "./BackToListen";
import SpeechGate from "./SpeechGate";

type Locale = "en" | "fa" | "de";

/** A small numbered button that plays one part of the sentence slowly. */
function PartButton({ text, n, total }: { text: string; n: number; total: number }) {
  const t = useTranslations("Listen.dictation");
  const speaking = useSyncExternalStore(subscribeSpeech, getSpeakingKey, () => null) === speechKey(text, RATE.slow);
  return (
    <button
      type="button"
      data-part-button
      data-speaking={speaking ? "" : undefined}
      aria-label={t("partLabel", { n, total })}
      onClick={() => (speaking ? stopSpeaking() : speak(text, RATE.slow))}
      className="pill min-h-11 min-w-11 justify-center data-[speaking]:border-primary data-[speaking]:text-primary"
    >
      {n}
    </button>
  );
}

const MARK_CLASS: Record<WordMark, string> = {
  ok: "text-success",
  case: "bg-warning-soft text-warning",
  umlaut: "bg-warning-soft text-warning",
  typo: "bg-warning-soft text-warning",
  wrong: "bg-danger-soft text-danger",
  missing: "border border-dashed border-danger text-danger",
};

/** The checked sentence: every word of the sentence in order, with what was typed where it differs. */
function DiffView({ ops }: { ops: DictationOp[] }) {
  const t = useTranslations("Listen.dictation.marks");
  return (
    <p dir="ltr" lang="de" className="flex flex-wrap gap-x-1.5 gap-y-2 text-lg font-bold leading-relaxed" data-dictation-diff>
      {ops.map((op, i) =>
        op.type === "extra" ? (
          <span key={i} data-mark="extra" className="rounded-lg px-1.5 text-text-muted line-through">
            <span className="sr-only">{t("extra")}: </span>
            {op.typed}
          </span>
        ) : (
          <span key={i} data-mark={op.mark} className={"rounded-lg px-1.5 " + MARK_CLASS[op.mark]}>
            {op.mark !== "ok" && <span className="sr-only">{t(op.mark)}: </span>}
            {op.typed !== null && op.mark !== "ok" && (
              <>
                <s className="font-normal opacity-80">{op.typed}</s>
                <span aria-hidden="true"> → </span>
              </>
            )}
            {op.expected}
          </span>
        ),
      )}
    </p>
  );
}

/** Which kinds of mistakes occur, for the legend under the checked sentence. */
function marksIn(ops: DictationOp[]): (WordMark | "extra")[] {
  const order: (WordMark | "extra")[] = ["case", "umlaut", "typo", "wrong", "missing", "extra"];
  const present = new Set(ops.map((o) => (o.type === "extra" ? "extra" : o.mark)));
  return order.filter((m) => present.has(m));
}

/**
 * Dictation: hear a sentence, type it, see word by word what was right. The sentence can be played as often as wanted,
 * slowly, or in short parts. Small slips (capital letter, ä ö ü ß, one letter) are shown but do not fail the sentence.
 */
export default function DictationDrill({ pool }: { pool: DictationSentence[] }) {
  const t = useTranslations("Listen.dictation");
  const tL = useTranslations("Listen");
  const tUi = useTranslations("Ui");
  const locale = useLocale() as Locale;
  const tr = locale === "de" ? "en" : locale;

  const passedIds = useListenStore((s) => s.dictationPassed);
  const recordDictation = useListenStore((s) => s.recordDictation);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(useListenStore.persist.rehydrate()).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [level, setLevel] = useState<DictationLevel>("short");
  const [round, setRound] = useState<DictationSentence[] | null>(null);
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<DictationResult | null>(null);
  const [scores, setScores] = useState<{ id: string; score: number; passed: boolean }[]>([]);
  const [finished, setFinished] = useState(false);
  const [pendingLevel, setPendingLevel] = useState<DictationLevel | null>(null);

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const checkedRef = useRef(false);
  const feedbackRef = useScrollIntoViewOnChange<HTMLDivElement>(result, { enabled: result !== null, focus: false, block: "nearest" });

  useEffect(() => () => stopSpeaking(), []);

  const sentence = round?.[index] ?? null;
  const parts = useMemo(() => (sentence ? sentenceParts(sentence.de) : []), [sentence]);
  const passedSet = useMemo(() => new Set(passedIds), [passedIds]);
  const counts = useMemo(() => {
    const c = { short: { total: 0, done: 0 }, medium: { total: 0, done: 0 }, long: { total: 0, done: 0 } };
    for (const s of pool) {
      const l = levelOf(s.de);
      if (!l) continue;
      c[l].total++;
      if (passedSet.has(s.id)) c[l].done++;
    }
    return c;
  }, [pool, passedSet]);

  useEffect(() => {
    if (!sentence || finished) return;
    if (result) actionRef.current?.focus({ preventScroll: true });
    else inputRef.current?.focus({ preventScroll: true });
  }, [sentence, result, finished]);

  const start = (l: DictationLevel) => {
    const previous = new Set(round?.map((s) => s.id) ?? []);
    setLevel(l);
    setRound(pickRound(pool, l, passedSet, Math.random, DICTATION_ROUND, previous));
    setIndex(0);
    setTyped("");
    setResult(null);
    setScores([]);
    setFinished(false);
    checkedRef.current = false;
    stopSpeaking();
  };

  const check = () => {
    if (!sentence || checkedRef.current || typed.trim() === "") return;
    checkedRef.current = true;
    const r = checkDictation(sentence.de, typed);
    setResult(r);
    setScores((s) => [...s, { id: sentence.id, score: r.score, passed: r.passed }]);
    recordDictation(sentence.id, r.passed);
  };

  const isLast = round !== null && index >= round.length - 1;
  const advance = () => {
    if (!round || !checkedRef.current) return;
    checkedRef.current = false;
    setResult(null);
    setTyped("");
    if (isLast) {
      stopSpeaking();
      setFinished(true);
    } else {
      const nextSentence = round[index + 1];
      setIndex(index + 1);
      // Part of the learner's own tap, so the next sentence may start playing right away.
      speak(nextSentence.de, RATE.normal);
    }
  };

  const pickLevel = (l: DictationLevel) => {
    if (round && !finished && (scores.length > 0 || typed !== "")) setPendingLevel(l);
    else if (round === null) setLevel(l);
    else start(l);
  };

  const insert = (ch: string) => {
    const el = inputRef.current;
    if (!el || result) return;
    const s = el.selectionStart ?? typed.length;
    const e = el.selectionEnd ?? typed.length;
    const next = typed.slice(0, s) + ch + typed.slice(e);
    setTyped(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(s + ch.length, s + ch.length);
    });
  };

  const onKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== "Enter" || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    if (result) advance();
    else check();
  };

  const empty = typed.trim() === "";
  const bar =
    round === null
      ? { label: tL("start"), action: () => start(level), disabled: false, status: null }
      : finished
        ? { label: tL("again"), action: () => start(level), disabled: false, status: null }
        : result
          ? {
              label: isLast ? (
                tL("result")
              ) : (
                <>
                  {tL("next")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
                </>
              ),
              action: advance,
              disabled: false,
              status: null,
            }
          : { label: tL("check"), action: check, disabled: empty, status: empty ? t("typeFirst") : null };

  const replay =
    sentence && !finished ? (
      <div className="flex shrink-0 gap-2">
        <SpeakButton text={sentence.de} compact hideText />
        <SpeakButton text={sentence.de} compact slow hideText />
      </div>
    ) : null;

  const average = scores.length === 0 ? 0 : scores.reduce((n, s) => n + s.score, 0) / scores.length;
  const percent = Math.round(average * 100);

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <BackToListen />
      <PageHeader title={t("title")} compact="always" />

      <SpeechGate>
        <div role="group" aria-label={t("levelLabel")} className="flex flex-wrap gap-2">
          {DICTATION_LEVELS.map((l) => (
            <button key={l} type="button" aria-pressed={level === l} onClick={() => pickLevel(l)} className="pill">
              {t(`levels.${l}`)}
              <span className="text-xs font-bold opacity-70" aria-hidden={!ready || undefined}>
                {ready ? ` · ${counts[l].done}/${counts[l].total}` : ""}
              </span>
            </button>
          ))}
        </div>

        {round === null ? (
          <section className="card space-y-3 p-5">
            <p>{t("intro")}</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-text-muted">
              <li>{t("tipParts")}</li>
              <li>{t("tipSlips")}</li>
              <li>{t("tipLevel", { count: DICTATION_ROUND })}</li>
            </ul>
          </section>
        ) : finished ? (
          <section className="card-hero space-y-4 p-6 text-center">
            <Mascot mood={percent >= 80 ? "celebrating" : "listening"} size={110} className="mx-auto" />
            <h2 className="text-2xl font-extrabold">{tL("done")}</h2>
            <ul className="space-y-2 text-start">
              {round.map((s, i) => {
                const r = scores[i];
                return (
                  <li key={s.id} className="flex items-start gap-2">
                    <span aria-hidden="true" className={r?.passed ? "text-success" : "text-danger"}>
                      {r?.passed ? "✓" : "✗"}
                    </span>
                    <span className="sr-only">{r?.passed ? tL("correct") : tL("wrong")}</span>
                    <bdi dir="ltr" lang="de" className="font-bold">
                      {s.de}
                    </bdi>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          sentence && (
            <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="dictation-q">
              <p id="dictation-q" className="eyebrow">
                {t("question", { current: index + 1, total: round.length })}
              </p>
              <p className="text-sm text-text-muted">{index === 0 && !result ? t("askFirst") : t("ask")}</p>

              {parts.length > 1 && (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-bold text-text-muted">{t("parts")}</span>
                  {parts.map((p, i) => (
                    <PartButton key={i} text={p} n={i + 1} total={parts.length} />
                  ))}
                </div>
              )}

              <label className="block">
                <span className="sr-only">{t("inputLabel")}</span>
                <textarea
                  ref={inputRef}
                  id="dictation-answer"
                  rows={2}
                  dir="ltr"
                  lang="de"
                  value={typed}
                  readOnly={result !== null}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="done"
                  onChange={(e) => setTyped(e.target.value)}
                  onKeyDown={onKeyDown}
                  placeholder={t("placeholder")}
                  className="w-full resize-none rounded-3xl border-2 border-border bg-surface px-5 py-3 text-lg font-bold outline-none read-only:opacity-60 focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30"
                />
              </label>
              <SpecialCharBar disabled={result !== null} onInsert={insert} />
            </section>
          )
        )}

        {round !== null && (
          <FeedbackRegion ref={feedbackRef} size="sm">
            {finished ? (
              <p className="text-center text-lg font-extrabold text-primary">{t("average", { percent })}</p>
            ) : (
              result && (
                <div className={result.passed ? "feedback-success" : "feedback-error"}>
                  <p className="font-extrabold">
                    {result.passed
                      ? result.minor === 0 && result.errors === 0
                        ? `✓ ${t("perfect")}`
                        : `✓ ${t("almost")}`
                      : `✗ ${t("notYet")}`}{" "}
                    <span className="font-bold">{t("wordsRight", { correct: result.correct, total: result.total })}</span>
                  </p>
                </div>
              )
            )}
          </FeedbackRegion>
        )}

        {result && sentence && !finished && (
          <section className="card space-y-3 p-5" aria-label={t("checked")}>
            <DiffView ops={result.ops} />
            {marksIn(result.ops).length > 0 && (
              <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                {marksIn(result.ops).map((m) => (
                  <li key={m} className="flex items-center gap-1.5">
                    <span
                      aria-hidden="true"
                      className={
                        "inline-block size-3 rounded " +
                        (m === "extra" ? "bg-surface-2 ring-1 ring-border" : isMinor(m) ? "bg-warning-soft ring-1 ring-warning" : "bg-danger-soft ring-1 ring-danger")
                      }
                    />
                    {t(`marks.${m}`)}
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-start gap-3 border-t border-border pt-3">
              <SpeakButton text={sentence.de} compact />
              <div className="min-w-0 space-y-1">
                <p dir="ltr" lang="de" className="font-extrabold">
                  {sentence.de}
                </p>
                <p lang={tr} className="text-sm text-text-muted">
                  {sentence.translation[tr]}
                </p>
              </div>
            </div>
          </section>
        )}

        <StickyActionBar
          ref={actionRef}
          label={bar.label}
          onAction={bar.action}
          disabled={bar.disabled}
          status={bar.status}
          statusLive={false}
          secondary={replay}
          toolbar={sentence && !finished && !result ? <SpecialCharBar compact onInsert={insert} /> : replay}
        />
      </SpeechGate>

      <ConfirmDialog
        open={pendingLevel !== null}
        title={tUi("restartTitle")}
        message={tUi("restartMessage", { done: scores.length })}
        confirmLabel={tUi("restartAction")}
        onCancel={() => setPendingLevel(null)}
        onConfirm={() => {
          if (pendingLevel) start(pendingLevel);
          setPendingLevel(null);
        }}
      />
    </div>
  );
}
