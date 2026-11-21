"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { DICTATION_LEVELS, DICTATION_ROUND, levelOf, pickRound } from "@/lib/dictation";
import type { DictationLevel, DictationSentence } from "@/lib/dictation";
import { checkSpeech } from "@/lib/speakCheck";
import type { SpeakMark, SpeakResult } from "@/lib/speakCheck";
import { stopSpeaking } from "@/lib/speech";
import { useSpeakStore } from "@/stores/speakStore";
import PageHeader from "../PageHeader";
import SpeakButton from "../SpeakButton";
import Mascot from "../illustrations/Mascot";
import ConfirmDialog from "../ui/ConfirmDialog";
import FeedbackRegion from "../ui/FeedbackRegion";
import StickyActionBar from "../ui/StickyActionBar";
import { useScrollIntoViewOnChange } from "../ui/useScrollIntoViewOnChange";
import SpeechGate from "../listen/SpeechGate";
import { useRecorder } from "./useRecorder";
import { useSpeechRecognition } from "./useSpeechRecognition";
import type { RecognitionProblem } from "./useSpeechRecognition";

export type RepeatItem = DictationSentence & { src: string | null };

/** check: speech recognition compares what was understood with the sentence. record: the learner hears themselves and judges. */
export type SpeakMode = "check" | "record";

type Locale = "en" | "fa" | "de";

/** One attempt at the current sentence. */
type Attempt =
  | { kind: "checked"; result: SpeakResult }
  | { kind: "nothing" }
  | { kind: "problem"; problem: RecognitionProblem | "micRefused" }
  | { kind: "recorded"; judged: boolean | null };

const MARK_CLASS: Record<SpeakMark, string> = {
  ok: "text-success",
  close: "bg-warning-soft text-warning",
  missing: "bg-danger-soft text-danger",
};

function SpeakDiff({ result }: { result: SpeakResult }) {
  const t = useTranslations("Speak.marks");
  return (
    <p dir="ltr" lang="de" className="flex flex-wrap gap-x-1.5 gap-y-2 text-lg font-bold leading-relaxed" data-speak-diff>
      {result.words.map((w, i) => (
        <span key={i} data-mark={w.mark} className={"rounded-lg px-1.5 " + MARK_CLASS[w.mark]}>
          {w.mark !== "ok" && <span className="sr-only">{t(w.mark)}: </span>}
          {w.expected}
          {w.heard !== null && (
            <span className="ms-1 text-sm font-normal opacity-80">
              (<s>{w.heard}</s>)
            </span>
          )}
        </span>
      ))}
    </p>
  );
}

/** Plays the learner's own recording. */
function MyVoiceButton({ url }: { url: string }) {
  const t = useTranslations("Speak");
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    const a = new Audio(url);
    a.onended = a.onpause = () => setPlaying(false);
    audio.current = a;
    return () => {
      a.onended = a.onpause = null;
      a.pause();
      audio.current = null;
    };
  }, [url]);
  return (
    <button
      type="button"
      data-my-voice
      aria-pressed={playing}
      onClick={() => {
        const a = audio.current;
        if (!a) return;
        if (playing) {
          a.pause();
          return;
        }
        stopSpeaking();
        a.currentTime = 0;
        a.play().then(
          () => setPlaying(true),
          () => setPlaying(false),
        );
      }}
      className="pill min-h-11"
    >
      <span aria-hidden="true">{playing ? "■" : "▶"}</span> {playing ? t("stopMyVoice") : t("myVoice")}
    </button>
  );
}

/**
 * Nachsprechen: hear a sentence, say it. With speech recognition the sentence is checked word by word; without it (or
 * when the learner prefers) they record themselves, compare with the original and judge it themselves. Rounds, levels
 * and sentences are the dictation's, so both drills grow with the same content.
 */
export default function RepeatDrill({ pool }: { pool: RepeatItem[] }) {
  const t = useTranslations("Speak");
  const tLevels = useTranslations("Listen.dictation.levels");
  const tL = useTranslations("Listen");
  const tUi = useTranslations("Ui");
  const locale = useLocale() as Locale;
  const tr = locale === "de" ? "en" : locale;

  const recognition = useSpeechRecognition();
  const recorder = useRecorder();
  const known = recognition.supported !== null && recorder.supported !== null;
  const canCheck = recognition.supported === true;
  const canRecord = recorder.supported === true;
  const [chosenMode, setChosenMode] = useState<SpeakMode | null>(null);
  const mode: SpeakMode | null = chosenMode ?? (canCheck ? "check" : canRecord ? "record" : null);

  const passedIds = useSpeakStore((s) => s.speakPassed);
  const recordSpeak = useSpeakStore((s) => s.recordSpeak);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(useSpeakStore.persist.rehydrate()).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const [level, setLevel] = useState<DictationLevel>("short");
  const [round, setRound] = useState<RepeatItem[] | null>(null);
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  /** Best score per sentence of the round (0 to 1), and whether it was said well enough. */
  const [scores, setScores] = useState<{ score: number; passed: boolean }[]>([]);
  const [finished, setFinished] = useState(false);
  const [pendingLevel, setPendingLevel] = useState<DictationLevel | null>(null);

  const actionRef = useRef<HTMLButtonElement>(null);
  const feedbackRef = useScrollIntoViewOnChange<HTMLDivElement>(attempt, { enabled: attempt !== null, focus: false, block: "nearest" });

  useEffect(() => () => stopSpeaking(), []);

  const sentence = round?.[index] ?? null;
  const recorded = pool.length > 0 && pool.every((s) => s.src !== null);
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

  const busy = recognition.listening || recorder.recording;

  const start = (l: DictationLevel) => {
    const previous = new Set(round?.map((s) => s.id) ?? []);
    recognition.stop();
    recorder.stop();
    recorder.clear();
    setLevel(l);
    setRound(pickRound(pool, l, passedSet, Math.random, DICTATION_ROUND, previous));
    setIndex(0);
    setAttempt(null);
    setScores([]);
    setFinished(false);
    stopSpeaking();
  };

  /** Keeps the best attempt of the current sentence. */
  const score = (value: number, passed: boolean) => {
    if (!sentence) return;
    setScores((s) => {
      const next = [...s];
      const prev = next[index];
      if (!prev || value > prev.score) next[index] = { score: value, passed: passed || !!prev?.passed };
      return next;
    });
    recordSpeak(sentence.id, passed);
  };

  const listen = () => {
    if (!sentence || busy) return;
    stopSpeaking();
    const de = sentence.de;
    recognition.start(
      (alternatives) => {
        const result = checkSpeech(de, alternatives);
        if (!result) {
          setAttempt({ kind: "nothing" });
          return;
        }
        setAttempt({ kind: "checked", result });
        score(result.score, result.passed);
      },
      (problem) => setAttempt({ kind: "problem", problem }),
    );
  };

  const record = async () => {
    if (!sentence || busy) return;
    stopSpeaking();
    setAttempt(null);
    if (!(await recorder.start())) setAttempt({ kind: "problem", problem: "micRefused" });
  };

  // A finished recording waits for the learner's verdict.
  useEffect(() => {
    if (recorder.url) setAttempt({ kind: "recorded", judged: null });
  }, [recorder.url]);

  const judge = (passed: boolean) => {
    setAttempt({ kind: "recorded", judged: passed });
    score(passed ? 1 : 0, passed);
    actionRef.current?.focus({ preventScroll: true });
  };

  const attempted = scores[index] !== undefined;
  const isLast = round !== null && index >= round.length - 1;
  const advance = () => {
    if (!round || !attempted || busy) return;
    recorder.clear();
    setAttempt(null);
    if (isLast) {
      stopSpeaking();
      setFinished(true);
    } else {
      setIndex(index + 1);
    }
  };

  const pickLevel = (l: DictationLevel) => {
    if (round && !finished && scores.length > 0) setPendingLevel(l);
    else if (round === null) setLevel(l);
    else start(l);
  };

  const pickMode = (m: SpeakMode) => {
    if (busy) return;
    setChosenMode(m);
    setAttempt(null);
    recorder.clear();
  };

  const micLabel = (
    <>
      <span aria-hidden="true">🎤</span> {mode === "record" ? t("record") : t("speak")}
    </>
  );

  const bar =
    round === null
      ? { label: tL("start"), action: () => start(level), disabled: mode === null, status: null }
      : finished
        ? { label: tL("again"), action: () => start(level), disabled: false, status: null }
        : busy
          ? {
              label: (
                <>
                  <span aria-hidden="true">■</span> {t("stop")}
                </>
              ),
              action: () => (recognition.listening ? recognition.stop() : recorder.stop()),
              disabled: false,
              status: null,
            }
          : attempted
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
            : attempt?.kind === "recorded"
              ? { label: tL("next"), action: advance, disabled: true, status: t("judgeFirst") }
              : { label: micLabel, action: mode === "record" ? record : listen, disabled: mode === null, status: null };

  /** Speak / record again after an attempt (the bar has moved on to Next). Always there during a round, disabled until then. */
  const again =
    round !== null && !finished ? (
      <button
        type="button"
        onClick={mode === "record" ? record : listen}
        disabled={!attempted || busy}
        className="pill min-h-11 disabled:opacity-50"
        data-speak-again
      >
        <span aria-hidden="true">🎤</span> {t("tryAgain")}
      </button>
    ) : null;

  const average = scores.length === 0 ? 0 : scores.reduce((n, s) => n + s.score, 0) / (round?.length ?? 1);
  const percent = Math.round(average * 100);

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <PageHeader title={t("title")} subtitle={t("subtitle")} compact="always" />

      <SpeechGate recorded={recorded}>
        {known && mode === null && <p className="feedback-hint">{t("unsupported")}</p>}

        {known && mode !== null && (
          <>
            {canCheck && canRecord && (
              <div role="group" aria-label={t("modeLabel")} className="flex flex-wrap gap-2">
                {(["check", "record"] as const).map((m) => (
                  <button key={m} type="button" aria-pressed={mode === m} disabled={busy} onClick={() => pickMode(m)} className="pill">
                    {t(`modes.${m}`)}
                  </button>
                ))}
              </div>
            )}
            {!canCheck && <p className="text-sm text-text-muted">{t("recordOnly")}</p>}

            <div role="group" aria-label={tL("dictation.levelLabel")} className="flex flex-wrap gap-2">
              {DICTATION_LEVELS.map((l) => (
                <button key={l} type="button" aria-pressed={level === l} disabled={busy} onClick={() => pickLevel(l)} className="pill">
                  {tLevels(l)}
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
                  <li>{t("tipListen")}</li>
                  <li>{mode === "check" ? t("tipCheck") : t("tipRecord")}</li>
                  <li>{t("tipLevel", { count: DICTATION_ROUND })}</li>
                </ul>
              </section>
            ) : finished ? (
              <section className="card-hero space-y-4 p-6 text-center">
                <Mascot mood={percent >= 80 ? "celebrating" : "listening"} size={110} className="mx-auto" />
                <h2 className="text-2xl font-extrabold">{tL("done")}</h2>
                <ul className="space-y-2 text-start">
                  {round.map((s, i) => {
                    const ok = !!scores[i]?.passed;
                    return (
                      <li key={s.id} className="flex items-start gap-2">
                        <span aria-hidden="true" className={ok ? "text-success" : "text-danger"}>
                          {ok ? "✓" : "✗"}
                        </span>
                        <span className="sr-only">{ok ? tL("correct") : tL("wrong")}</span>
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
                <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="speak-q">
                  <p id="speak-q" className="eyebrow">
                    {t("question", { current: index + 1, total: round.length })}
                  </p>
                  <div className="flex items-start gap-3">
                    <div className="flex shrink-0 flex-col gap-2">
                      <SpeakButton text={sentence.de} compact clip={{ src: sentence.src }} />
                      <SpeakButton text={sentence.de} compact slow clip={{ src: sentence.src }} />
                    </div>
                    <div className="min-w-0 space-y-1">
                      <p dir="ltr" lang="de" className="text-xl font-extrabold" data-speak-sentence>
                        {sentence.de}
                      </p>
                      <p lang={tr} className="text-sm text-text-muted">
                        {sentence.translation[tr]}
                      </p>
                    </div>
                  </div>
                  <p className="text-sm text-text-muted" data-speak-state>
                    {recognition.listening ? t("listening") : recorder.recording ? t("recording") : mode === "record" ? t("askRecord") : t("ask")}
                  </p>
                  {recognition.listening && recognition.interim && (
                    <p dir="ltr" lang="de" className="font-bold text-text-muted">
                      {recognition.interim}…
                    </p>
                  )}
                </section>
              )
            )}

            {round !== null && (
              <FeedbackRegion ref={feedbackRef} size="sm">
                {finished ? (
                  <p className="text-center text-lg font-extrabold text-primary">{t("average", { percent })}</p>
                ) : attempt?.kind === "checked" ? (
                  <div className={attempt.result.passed ? "feedback-success" : "feedback-error"}>
                    <p className="font-extrabold">
                      {attempt.result.passed
                        ? attempt.result.ok === attempt.result.total
                          ? `✓ ${t("perfect")}`
                          : `✓ ${t("passed")}`
                        : `✗ ${t("notYet")}`}{" "}
                      <span className="font-bold">{t("wordsUnderstood", { ok: attempt.result.ok, total: attempt.result.total })}</span>
                    </p>
                  </div>
                ) : attempt?.kind === "nothing" ? (
                  <p className="feedback-hint">{t("heardNothing")}</p>
                ) : attempt?.kind === "problem" ? (
                  <p className="feedback-error">{t(`problems.${attempt.problem}`)}</p>
                ) : attempt?.kind === "recorded" && attempt.judged !== null ? (
                  <p className={attempt.judged ? "feedback-success" : "feedback-hint"}>{attempt.judged ? `✓ ${t("judgedYes")}` : t("judgedNo")}</p>
                ) : null}
              </FeedbackRegion>
            )}

            {sentence && !finished && attempt?.kind === "checked" && (
              <section className="card space-y-3 p-5" aria-label={t("checked")}>
                <SpeakDiff result={attempt.result} />
                <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                  {(["close", "missing"] as const)
                    .filter((m) => attempt.result.words.some((w) => w.mark === m))
                    .map((m) => (
                      <li key={m} className="flex items-center gap-1.5">
                        <span aria-hidden="true" className={"inline-block size-3 rounded ring-1 " + (m === "close" ? "bg-warning-soft ring-warning" : "bg-danger-soft ring-danger")} />
                        {t(`marks.${m}`)}
                      </li>
                    ))}
                </ul>
                <p className="border-t border-border pt-3 text-sm text-text-muted">
                  {t("heard")}{" "}
                  <bdi dir="ltr" lang="de" className="font-bold text-text">
                    {attempt.result.heard}
                  </bdi>
                </p>
                <p className="text-xs text-text-muted">{t("recognitionNote")}</p>
              </section>
            )}

            {sentence && !finished && attempt?.kind === "recorded" && recorder.url && (
              <section className="card space-y-3 p-5" aria-label={t("compareTitle")}>
                <p className="text-sm text-text-muted">{t("judgeAsk")}</p>
                <div className="flex flex-wrap gap-2">
                  <SpeakButton text={sentence.de} compact clip={{ src: sentence.src }} />
                  <MyVoiceButton url={recorder.url} />
                </div>
                {attempt.judged === null && (
                  <div className="flex flex-wrap gap-2 border-t border-border pt-3">
                    <button type="button" onClick={() => judge(true)} className="pill min-h-11" data-judge="yes">
                      <span aria-hidden="true">✓</span> {t("judgeYes")}
                    </button>
                    <button type="button" onClick={() => judge(false)} className="pill min-h-11" data-judge="no">
                      {t("judgeNo")}
                    </button>
                  </div>
                )}
              </section>
            )}

            <StickyActionBar ref={actionRef} label={bar.label} onAction={bar.action} disabled={bar.disabled} status={bar.status} statusLive={false} secondary={again} />
          </>
        )}
      </SpeechGate>

      <ConfirmDialog
        open={pendingLevel !== null}
        title={tUi("restartTitle")}
        message={tUi("restartMessage", { done: scores.filter(Boolean).length })}
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
