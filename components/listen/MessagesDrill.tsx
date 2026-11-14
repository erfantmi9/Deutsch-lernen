"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { seededShuffle, shuffled } from "@/lib/shuffle";
import { stopSpeaking } from "@/lib/speech";
import { MESSAGE_KINDS } from "@/types/listening";
import type { ListeningMessage, MessageKind } from "@/types/listening";
import { useListenStore } from "@/stores/listenStore";
import PageHeader from "../PageHeader";
import SpeakButton from "../SpeakButton";
import SpeakerAvatar from "../SpeakerAvatar";
import Mascot from "../illustrations/Mascot";
import ConfirmDialog from "../ui/ConfirmDialog";
import FeedbackRegion from "../ui/FeedbackRegion";
import StickyActionBar from "../ui/StickyActionBar";
import { useScrollIntoViewOnChange } from "../ui/useScrollIntoViewOnChange";
import BackToListen from "./BackToListen";
import SequenceButton from "./SequenceButton";
import SpeechGate from "./SpeechGate";

type Locale = "en" | "fa" | "de";
type KindFilter = MessageKind | "all";

export const MESSAGE_ROUND = 5;

/** Not yet solved messages first (random order), then the rest; the round just played goes last. */
function pickMessages(all: readonly ListeningMessage[], kind: KindFilter, solved: ReadonlySet<string>, previous: ReadonlySet<string>): ListeningMessage[] {
  const pool = all.filter((m) => kind === "all" || m.kind === kind);
  const rank = (m: ListeningMessage) => (solved.has(m.id) ? 2 : 0) + (previous.has(m.id) ? 1 : 0);
  return shuffled(pool, Math.random).sort((a, b) => rank(a) - rank(b)).slice(0, MESSAGE_ROUND);
}

/** The German line with the words that give the answer highlighted. */
function withEvidence(text: string, evidence: string): ReactNode {
  const at = text.indexOf(evidence);
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <mark className="rounded bg-warning-soft px-0.5 text-text">{evidence}</mark>
      {text.slice(at + evidence.length)}
    </>
  );
}

/**
 * Short everyday listening texts as in the A1 exam: read the situation and the question, listen (as often as needed,
 * also slowly), pick the answer. Afterwards the transcript shows where the answer was.
 */
export default function MessagesDrill({ messages }: { messages: ListeningMessage[] }) {
  const t = useTranslations("Listen.messages");
  const tL = useTranslations("Listen");
  const tUi = useTranslations("Ui");
  const locale = useLocale() as Locale;
  const tr = locale === "de" ? "en" : locale;

  const solvedIds = useListenStore((s) => s.messagesSolved);
  const recordMessage = useListenStore((s) => s.recordMessage);
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

  const [kind, setKind] = useState<KindFilter>("all");
  const [round, setRound] = useState<ListeningMessage[] | null>(null);
  const [index, setIndex] = useState(0);
  const [given, setGiven] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showText, setShowText] = useState(false);
  const [pendingKind, setPendingKind] = useState<KindFilter | null>(null);

  const actionRef = useRef<HTMLButtonElement>(null);
  const answeredRef = useRef(false);
  const feedbackRef = useScrollIntoViewOnChange<HTMLDivElement>(given, { enabled: given !== null, focus: false, block: "nearest" });

  useEffect(() => () => stopSpeaking(), []);

  const message = round?.[index] ?? null;
  const answered = given !== null;
  const correct = message !== null && given === message.answer;
  const options = useMemo(() => (message ? seededShuffle(message.options, message.id) : []), [message]);
  const parts = useMemo(() => message?.lines.map((l) => ({ text: l.de, speaker: l.speaker })) ?? [], [message]);
  const solvedSet = useMemo(() => new Set(solvedIds), [solvedIds]);
  const total = (k: KindFilter) => messages.filter((m) => k === "all" || m.kind === k);

  useEffect(() => {
    if (answered) actionRef.current?.focus({ preventScroll: true });
  }, [answered]);

  const start = (k: KindFilter) => {
    setKind(k);
    setRound(pickMessages(messages, k, solvedSet, new Set(round?.map((m) => m.id) ?? [])));
    setIndex(0);
    setGiven(null);
    setRight(0);
    setFinished(false);
    setShowText(false);
    answeredRef.current = false;
    stopSpeaking();
  };

  const answer = (option: string) => {
    if (!message || answeredRef.current) return;
    answeredRef.current = true;
    const ok = option === message.answer;
    setGiven(option);
    if (ok) setRight((r) => r + 1);
    recordMessage(message.id, ok);
  };

  const isLast = round !== null && index >= round.length - 1;
  const advance = () => {
    if (!answeredRef.current) return;
    answeredRef.current = false;
    stopSpeaking();
    setGiven(null);
    setShowText(false);
    if (isLast) setFinished(true);
    else setIndex((i) => i + 1);
  };

  const pickKind = (k: KindFilter) => {
    const asked = index + (answered ? 1 : 0);
    if (round && !finished && asked > 0) setPendingKind(k);
    else if (round === null) setKind(k);
    else start(k);
  };

  const bar =
    round === null
      ? { label: tL("start"), action: () => start(kind), disabled: false, status: null }
      : finished
        ? { label: tL("again"), action: () => start(kind), disabled: false, status: null }
        : answered
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
          : { label: tL("check"), action: () => {}, disabled: true, status: tL("chooseAnswer") };

  const replay =
    message && !finished ? (
      <div className="flex shrink-0 gap-2">
        <SequenceButton id={`msg:${message.id}`} parts={parts} compact />
        <SequenceButton id={`msg:${message.id}`} parts={parts} compact slow />
      </div>
    ) : null;

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      <BackToListen />
      <PageHeader title={t("title")} compact="always" />

      <SpeechGate>
        <div role="group" aria-label={t("kindLabel")} className="flex flex-wrap gap-2">
          {(["all", ...MESSAGE_KINDS] as const).map((k) => (
            <button key={k} type="button" aria-pressed={kind === k} onClick={() => pickKind(k)} className="pill">
              {t(`kinds.${k}`)}
              <span className="text-xs font-bold opacity-70" aria-hidden={!ready || undefined}>
                {ready ? ` · ${total(k).filter((m) => solvedSet.has(m.id)).length}/${total(k).length}` : ""}
              </span>
            </button>
          ))}
        </div>

        {round === null ? (
          <section className="card space-y-3 p-5">
            <p>{t("intro")}</p>
            <ul className="list-inside list-disc space-y-1 text-sm text-text-muted">
              <li>{t("tipQuestionFirst")}</li>
              <li>{t("tipKeyWords")}</li>
              <li>{t("tipExam")}</li>
            </ul>
          </section>
        ) : finished ? (
          <section className="card-hero space-y-4 p-6 text-center">
            <Mascot mood={right >= round.length - 1 ? "celebrating" : "listening"} size={110} className="mx-auto" />
            <h2 className="text-2xl font-extrabold">{tL("done")}</h2>
          </section>
        ) : (
          message && (
            <section className="card space-y-4 p-5 sm:p-6" aria-labelledby="message-q">
              <p className="eyebrow">
                {t("progress", { current: index + 1, total: round.length })} · {t(`kinds.${message.kind}`)}
              </p>
              <p className="text-sm text-text-muted">{message.situation[locale]}</p>
              <h2 id="message-q" className="text-xl font-extrabold">
                {message.question[locale]}
              </h2>
              {!answered && <p className="text-sm text-text-muted">{t("tapPlay")}</p>}
              <div role="group" aria-labelledby="message-q" className="grid gap-2">
                {options.map((opt) => {
                  const isAnswer = answered && opt === message.answer;
                  const isWrong = answered && opt === given && !correct;
                  return (
                    <button
                      key={opt}
                      type="button"
                      lang="de"
                      dir="ltr"
                      aria-disabled={answered}
                      onClick={() => answer(opt)}
                      className={
                        "pill min-h-12 justify-center whitespace-normal py-2 text-center text-lg aria-disabled:cursor-default " +
                        (isAnswer
                          ? "border-success bg-success-soft text-success"
                          : isWrong
                            ? "border-danger bg-danger-soft text-danger"
                            : answered
                              ? "opacity-60"
                              : "")
                      }
                    >
                      {opt}
                      {isAnswer && <span aria-hidden="true"> ✓</span>}
                      {isWrong && <span aria-hidden="true"> ✗</span>}
                    </button>
                  );
                })}
              </div>
            </section>
          )
        )}

        {round !== null && (
          <FeedbackRegion ref={feedbackRef} size="sm">
            {finished ? (
              <p className="text-center text-lg font-extrabold text-primary">{tL("score", { correct: right, total: round.length })}</p>
            ) : (
              answered &&
              message && (
                <div className={correct ? "feedback-success" : "feedback-error"}>
                  <p className="font-extrabold">
                    {correct ? `✓ ${tL("correct")}` : `✗ ${t("rightAnswer")}`}{" "}
                    {!correct && (
                      <bdi dir="ltr" lang="de">
                        {message.answer}
                      </bdi>
                    )}
                  </p>
                </div>
              )
            )}
          </FeedbackRegion>
        )}

        {answered && message && !finished && (
          <section className="card space-y-3 p-5">
            <button type="button" aria-expanded={showText} aria-controls="message-transcript" onClick={() => setShowText((v) => !v)} className="btn-ghost">
              {showText ? t("hideText") : t("showText")}
            </button>
            {showText && (
              <ol id="message-transcript" className="space-y-3">
                {message.lines.map((l, i) => (
                  <li key={i} className="flex items-start gap-3">
                    {message.kind === "conversation" && <SpeakerAvatar index={l.speaker} />}
                    <div className="min-w-0 flex-1 space-y-1">
                      <p dir="ltr" lang="de" className="font-bold leading-relaxed">
                        {withEvidence(l.de, message.evidence)}
                      </p>
                      <p lang={tr} className="text-sm text-text-muted">
                        {l[tr]}
                      </p>
                    </div>
                    <SpeakButton text={l.de} compact />
                  </li>
                ))}
              </ol>
            )}
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
          toolbar={replay}
        />
      </SpeechGate>

      <ConfirmDialog
        open={pendingKind !== null}
        title={tUi("restartTitle")}
        message={tUi("restartMessage", { done: index + (answered ? 1 : 0) })}
        confirmLabel={tUi("restartAction")}
        onCancel={() => setPendingKind(null)}
        onConfirm={() => {
          if (pendingKind) start(pendingKind);
          setPendingKind(null);
        }}
      />
    </div>
  );
}
