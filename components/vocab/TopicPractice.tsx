"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { ReviewCard } from "@/lib/reviewCards";
import { buildRound } from "@/lib/topicPractice";
import type { PracticeQuestion } from "@/lib/topicPractice";
import { cardSubgroup, getTopic, topicLabelKey } from "@/lib/vocabTopics";
import type { TopicId } from "@/lib/vocabTopics";
import { recordActivity } from "@/stores/activityStore";
import { ensureSrsHydrated, useSrsStore } from "@/stores/srsStore";
import Mascot from "../illustrations/Mascot";
import SpeakButton from "../SpeakButton";
import FeedbackRegion from "../ui/FeedbackRegion";
import ScoreStrip from "../ui/ScoreStrip";
import StickyActionBar from "../ui/StickyActionBar";
import { BackIcon } from "./icons";
import { GermanWord } from "./WordRow";

interface Answer {
  cardId: string;
  chosen: string;
  correct: boolean;
}

function isTypingTarget(el: EventTarget | null): boolean {
  return el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

/**
 * A short round on one topic (or one of its sub-topics, ?sub=): the German word is shown, the learner picks its
 * meaning from four. The round is drawn on the client after mount (random), so the server renders a loading state.
 * At the end the missed words can go straight into the review deck.
 */
export default function TopicPractice({ topicId, cards }: { topicId: TopicId; cards: readonly ReviewCard[] }) {
  const t = useTranslations("TopicPractice");
  const tv = useTranslations("Vocabulary");
  const locale = useLocale();
  const tr = locale === "fa" ? "fa" : "en";
  const topic = useMemo(() => getTopic(topicId)!, [topicId]);
  const name = tv(topicLabelKey(topic));

  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const meaning = useCallback((c: ReviewCard) => c.translations[tr], [tr]);

  const [sub, setSub] = useState<string | null>(null);
  const [questions, setQuestions] = useState<PracticeQuestion[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [done, setDone] = useState(false);
  const [added, setAdded] = useState<number | null>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const addCards = useSrsStore((s) => s.addCards);

  const newRound = useCallback(
    (subgroup: string | null) => {
      const words = subgroup ? cards.filter((c) => cardSubgroup(c) === subgroup) : cards;
      setQuestions(buildRound(words.length > 0 ? words : cards, cards, meaning, Math.random));
      setIndex(0);
      setAnswers([]);
      setDone(false);
      setAdded(null);
    },
    [cards, meaning],
  );

  useEffect(() => {
    const s = new URLSearchParams(window.location.search).get("sub");
    const valid = s && topic.subgroups.includes(s) ? s : null;
    setSub(valid);
    newRound(valid);
    void ensureSrsHydrated();
  }, [newRound, topic]);

  const question = questions?.[index];
  const current = question ? byId.get(question.cardId) : undefined;
  const answer = answers[index];
  const correctCount = answers.filter((a) => a.correct).length;
  const last = questions !== null && index === questions.length - 1;

  const choose = useCallback(
    (optionId: string) => {
      if (!question || answers[index]) return;
      setAnswers((prev) => [...prev, { cardId: question.cardId, chosen: optionId, correct: optionId === question.cardId }]);
      recordActivity();
      window.setTimeout(() => actionRef.current?.focus({ preventScroll: true }), 0);
    },
    [question, answers, index],
  );

  const advance = useCallback(() => {
    if (!questions || !answers[index]) return;
    if (index === questions.length - 1) {
      setDone(true);
      window.scrollTo({ top: 0 });
    } else setIndex(index + 1);
  }, [questions, answers, index]);

  // 1-4 pick a meaning; Enter moves on once answered (a focused button handles its own Enter).
  useEffect(() => {
    if (done) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat || isTypingTarget(e.target)) return;
      const n = ["1", "2", "3", "4"].indexOf(e.key);
      if (n !== -1 && question && n < question.options.length) choose(question.options[n]);
      else if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, question, choose, advance]);

  const backHref = `/vocabulary/${topic.id}${sub ? `?sub=${encodeURIComponent(sub)}` : ""}`;
  const header = (
    <div className="flex items-center gap-3">
      <Link
        href={backHref}
        aria-label={t("backToTopic")}
        title={t("backToTopic")}
        className="flex size-11 shrink-0 items-center justify-center rounded-2xl text-text transition hover:bg-surface-2 sm:border sm:border-border sm:bg-surface sm:shadow-soft"
      >
        <BackIcon />
      </Link>
      <h1 className="min-w-0 flex-1 truncate text-2xl font-extrabold">{t("title", { topic: name })}</h1>
    </div>
  );

  if (!questions || (!done && !current)) {
    return (
      <div className="mx-auto w-full max-w-xl space-y-6">
        {header}
        <p role="status" className="py-24 text-center text-text-muted">
          {t("loading")}
        </p>
      </div>
    );
  }

  if (done) {
    const missed = answers.filter((a) => !a.correct).map((a) => byId.get(a.cardId)!);
    const perfect = missed.length === 0;
    return (
      <div className="mx-auto w-full max-w-xl space-y-6">
        {header}
        <section className="card-hero flex flex-col items-center gap-2 p-6 text-center" aria-labelledby="practice-summary">
          <Mascot mood={perfect ? "trophy" : correctCount * 2 >= answers.length ? "cheering" : "proud"} size={140} />
          <h2 id="practice-summary" className="text-2xl font-extrabold">
            {t("summaryTitle")}
          </h2>
          <p className="text-lg font-bold">{t("summaryScore", { correct: correctCount, total: answers.length })}</p>
          {perfect && <p className="text-text-muted">{t("perfect")}</p>}
        </section>

        {!perfect && (
          <section aria-labelledby="practice-missed" className="space-y-3">
            <h2 id="practice-missed" className="text-lg font-extrabold">
              {t("missedTitle")}
            </h2>
            <ul className="space-y-2">
              {missed.map((c) => (
                <li key={c.id} className="card flex items-center gap-3 py-2 pe-2 ps-4">
                  <span className="grid min-w-0 flex-1 grid-cols-2 items-center gap-3">
                    <span className="flex min-w-0 flex-col items-start">
                      <GermanWord card={c} />
                    </span>
                    <span lang={tr}>{meaning(c)}</span>
                  </span>
                  <SpeakButton text={c.front} plain />
                </li>
              ))}
            </ul>
            <div className="space-y-2">
              <button
                type="button"
                className="btn btn-secondary w-full"
                disabled={added !== null}
                onClick={() => setAdded(addCards(missed.map((c) => c.id)))}
              >
                {t("addMissed", { count: missed.length })}
              </button>
              <p role="status" className="feedback-hint empty:hidden">
                {added !== null && t("addedMissed", { count: added })}
              </p>
            </div>
          </section>
        )}

        <div className="flex flex-col gap-2 sm:flex-row">
          <button type="button" onClick={() => newRound(sub)} className="btn btn-primary flex-1">
            {t("again")}
          </button>
          <Link href={backHref} className="btn btn-secondary flex-1">
            {t("backToTopic")}
          </Link>
        </div>
      </div>
    );
  }

  const card = current!;
  const result = (optionId: string): "correct" | "wrong" | "dim" | undefined => {
    if (!answer) return undefined;
    if (optionId === answer.cardId) return "correct";
    if (optionId === answer.chosen) return "wrong";
    return "dim";
  };
  const OPTION_TONE = {
    correct: "border-success bg-success-soft text-success",
    wrong: "border-danger bg-danger-soft text-danger",
    dim: "opacity-50",
  } as const;

  return (
    <div className="mx-auto w-full max-w-xl space-y-4">
      {header}
      <ScoreStrip
        items={[
          [t("question"), `${index + 1}/${questions.length}`],
          [t("correctLabel"), correctCount],
        ]}
      />

      <section aria-labelledby="practice-prompt" className="card-hero flex flex-col items-center gap-3 p-6 text-center sm:p-8">
        <p id="practice-prompt" className="eyebrow">
          {t("prompt")}
        </p>
        <div className="flex flex-col items-center gap-1">
          <GermanWord card={card} className="text-3xl sm:text-4xl" />
          {card.pluralOnly && <span className="text-sm font-bold text-text-muted">{tv("pluralOnly")}</span>}
        </div>
        <SpeakButton text={card.front} />
      </section>

      <div role="group" aria-labelledby="practice-prompt" className="grid gap-2 sm:grid-cols-2">
        {question!.options.map((id, i) => {
          const r = result(id);
          return (
            <button
              key={id}
              type="button"
              data-option=""
              data-result={r}
              disabled={answer !== undefined}
              onClick={() => choose(id)}
              className={
                "flex min-h-14 items-center gap-3 rounded-3xl border-2 bg-surface px-4 py-3 text-start font-bold shadow-soft transition disabled:cursor-default " +
                (r ? OPTION_TONE[r] : "border-border hover:-translate-y-0.5 hover:border-primary")
              }
            >
              <span aria-hidden="true" className="hidden size-7 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-sm text-text-muted sm:flex">
                {i + 1}
              </span>
              <span lang={tr}>{meaning(byId.get(id)!)}</span>
            </button>
          );
        })}
      </div>

      <FeedbackRegion size="sm">
        {answer &&
          (answer.correct ? (
            <p className="feedback-success font-bold">{t("correct")}</p>
          ) : (
            <p className="feedback-error font-bold">{t("wrong", { answer: meaning(card) })}</p>
          ))}
      </FeedbackRegion>

      <StickyActionBar
        ref={actionRef}
        label={last ? t("finish") : t("next")}
        onAction={advance}
        disabled={!answer}
        status={answer ? undefined : t("pick")}
        statusLive={false}
      />
    </div>
  );
}
