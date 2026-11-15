"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { flipCard, markCard, roundDone, startRound } from "@/lib/flashDecks";
import type { DeckRound, Direction } from "@/lib/flashDecks";
import type { ReviewCard } from "@/lib/reviewCards";
import { recordActivity } from "@/stores/activityStore";
import { ensureSrsHydrated, useSrsStore } from "@/stores/srsStore";
import CardFront from "../CardFront";
import Mascot from "../illustrations/Mascot";
import SpeakButton from "../SpeakButton";
import StickyActionBar from "../ui/StickyActionBar";
import { BackIcon } from "../vocab/icons";

function isTypingTarget(el: EventTarget | null): boolean {
  return el instanceof HTMLElement && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName));
}

/**
 * Flipping through one ready-made deck: the card shows the German word (or its meaning), a tap turns it over, and the
 * learner says whether they knew it. Nothing is scheduled; at the end the cards they did not know can go into their own
 * spaced-repetition cards. The round is drawn after mount (shuffling is random), so the server renders a placeholder.
 */
export default function DeckPlayer({ deckName, cards }: { deckName: string; cards: readonly ReviewCard[] }) {
  const t = useTranslations("Decks");
  const locale = useLocale();
  const tr = locale === "fa" ? "fa" : "en";
  const byId = useMemo(() => new Map(cards.map((c) => [c.id, c])), [cards]);
  const allIds = useMemo(() => cards.map((c) => c.id), [cards]);

  const [direction, setDirection] = useState<Direction>("de");
  const [shuffle, setShuffle] = useState(true);
  const [round, setRound] = useState<DeckRound | null>(null);
  const [added, setAdded] = useState<number | null>(null);
  const addCards = useSrsStore((s) => s.addCards);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const doneRef = useRef<HTMLHeadingElement>(null);

  const begin = useCallback((ids: readonly string[], mixed: boolean) => {
    setAdded(null);
    setRound(startRound(ids, mixed ? Math.random : null));
  }, []);

  useEffect(() => {
    void ensureSrsHydrated();
    begin(allIds, true);
  }, [allIds, begin]);

  const done = round !== null && roundDone(round);
  useEffect(() => {
    if (done) {
      recordActivity();
      doneRef.current?.focus();
    }
  }, [done]);

  const flip = useCallback(() => setRound((r) => (r ? flipCard(r) : r)), []);
  const mark = useCallback((knew: boolean) => setRound((r) => (r ? markCard(r, knew) : r)), []);

  useEffect(() => {
    if (!round || done) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === " " && !round.flipped) {
        e.preventDefault();
        flip();
      } else if (round.flipped && (e.key === "1" || e.key === "2")) {
        mark(e.key === "2");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [round, done, flip, mark]);

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link href="/review" className="btn-ghost inline-flex items-center gap-1.5">
        <BackIcon size={20} />
        {t("back")}
      </Link>
    </div>
  );

  if (!round) {
    return (
      <div className="mx-auto max-w-xl space-y-5">
        {header}
        <h1 className="text-2xl font-extrabold">{t("pageTitle", { deck: deckName })}</h1>
        <div aria-hidden="true" className="card h-72 animate-pulse" />
      </div>
    );
  }

  // ---------- end of the deck ----------
  if (done) {
    const total = round.order.length;
    const unknown = round.unknown;
    return (
      <div className="mx-auto max-w-xl space-y-5">
        {header}
        <section aria-labelledby="deck-done" className="card-hero space-y-4 p-6 text-center sm:p-8">
          <Mascot mood={unknown.length === 0 ? "celebrating" : "thinking"} size={120} className="mx-auto" />
          <h1 id="deck-done" ref={doneRef} tabIndex={-1} className="text-3xl font-extrabold outline-none">
            {t("doneTitle")}
          </h1>
          <p className="text-lg font-extrabold text-primary">{t("doneText", { known: round.known.length, total })}</p>
          {unknown.length === 0 ? (
            <p>{t("allKnown")}</p>
          ) : (
            <ul className="flex flex-wrap justify-center gap-2" aria-label={t("didntKnow")}>
              {unknown.map((id) => {
                const c = byId.get(id);
                return c ? (
                  <li key={id} className="pill">
                    <CardFront card={c} className="text-sm" />
                  </li>
                ) : null;
              })}
            </ul>
          )}
          <div className="flex flex-col items-stretch gap-3 sm:items-center">
            {unknown.length > 0 && (
              <>
                <button
                  type="button"
                  className="btn btn-primary"
                  data-add-unknown
                  disabled={added !== null}
                  onClick={() => setAdded(addCards(unknown))}
                >
                  {t("addUnknown", { count: unknown.length })}
                </button>
                <p role="status" className="min-h-6 text-sm font-bold text-success">
                  {added !== null ? t("addedUnknown", { count: added }) : ""}
                </p>
                <button type="button" className="btn btn-secondary" onClick={() => begin(unknown, shuffle)}>
                  {t("retryUnknown", { count: unknown.length })}
                </button>
              </>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => begin(allIds, shuffle)}>
              {t("restart")}
            </button>
            <div className="flex flex-wrap justify-center gap-3">
              <Link href="/review" className="btn-ghost">
                {t("otherDecks")}
              </Link>
              {added !== null && added > 0 && (
                <Link href="/review#my-cards" className="btn-ghost">
                  {t("myCards")}
                </Link>
              )}
            </div>
          </div>
        </section>
      </div>
    );
  }

  // ---------- one card ----------
  const card = byId.get(round.order[round.index]);
  if (!card) return null;
  const total = round.order.length;
  const progress = t("progress", { current: round.index + 1, total });
  const meaning = card.translations[tr];
  const germanFirst = direction === "de";
  // The German word may be read aloud whenever it is visible: on the front in German-first mode, else once turned.
  const germanVisible = germanFirst || round.flipped;

  const german = (
    <span className="flex flex-col items-center gap-2">
      <CardFront card={card} className="text-3xl sm:text-4xl" />
      {card.detail && (
        <bdi dir="ltr" lang="de" className="text-base text-text-muted">
          {card.detail}
        </bdi>
      )}
    </span>
  );
  const translation = (
    <span lang={tr} className="text-2xl font-extrabold sm:text-3xl">
      {meaning}
    </span>
  );
  const front = germanFirst ? <CardFront card={card} className="text-3xl sm:text-4xl" /> : translation;
  const back = (
    <span className="flex flex-col items-center gap-3">
      {germanFirst ? translation : german}
      {germanFirst && card.detail && (
        <bdi dir="ltr" lang="de" className="text-base text-text-muted">
          {card.detail}
        </bdi>
      )}
      {card.example && (
        <span className="text-sm">
          <bdi dir="ltr" lang="de" className="block font-semibold">
            {card.example.de}
          </bdi>
          {card.example[tr] && (
            <span lang={tr} className="block text-text-muted">
              {card.example[tr]}
            </span>
          )}
        </span>
      )}
    </span>
  );

  const face = "absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-3xl p-6 text-center [backface-visibility:hidden]";

  return (
    <div className="mx-auto max-w-xl space-y-5">
      {header}
      <header className="space-y-1">
        <h1 className="text-2xl font-extrabold">{t("pageTitle", { deck: deckName })}</h1>
        <p className="text-sm text-text-muted">{t("pageSubtitle", { count: cards.length })}</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label={t("directionLabel")} className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-bold text-text-muted">{t("directionLabel")}</span>
          {(["de", "meaning"] as const).map((d) => (
            <button key={d} type="button" className="pill" aria-pressed={direction === d} onClick={() => setDirection(d)}>
              {d === "de" ? t("directionDe") : t("directionMeaning")}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="pill"
            aria-pressed={shuffle}
            onClick={() => {
              const next = !shuffle;
              setShuffle(next);
              begin(allIds, next);
            }}
          >
            {t("shuffle")}
          </button>
          <button type="button" className="pill" onClick={() => begin(allIds, shuffle)}>
            {t("restart")}
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-bold text-text-muted">{progress}</p>
        <span className={germanVisible ? "" : "invisible"} aria-hidden={!germanVisible || undefined}>
          <SpeakButton text={card.front} compact />
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={progress}
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={round.index}
        className="h-2 overflow-hidden rounded-full bg-surface-2"
      >
        <div className="h-full bg-primary transition-[width]" style={{ width: `${(round.index / total) * 100}%` }} />
      </div>

      {/* The card turns over in 3D (instantly with reduced motion). Only the visible face is in the accessibility tree. */}
      <div className="[perspective:1200px]">
        <button
          type="button"
          key={card.id}
          data-flashcard={card.id}
          aria-label={round.flipped ? undefined : t("flip")}
          aria-disabled={round.flipped || undefined}
          onClick={flip}
          className={
            "relative block h-80 w-full rounded-3xl text-text outline-none [transform-style:preserve-3d] focus-visible:ring-4 focus-visible:ring-primary/40 motion-safe:transition-transform motion-safe:duration-500 " +
            (round.flipped ? "cursor-default [transform:rotateY(180deg)]" : "cursor-pointer")
          }
        >
          <span className={face + " card-hero"} aria-hidden={round.flipped || undefined}>
            {front}
            <span className="text-xs font-bold text-text-muted">{t("tapToFlip")}</span>
          </span>
          <span className={face + " card [transform:rotateY(180deg)]"} aria-hidden={!round.flipped || undefined}>
            {back}
          </span>
        </button>
      </div>

      <p className="hidden text-center text-xs text-text-muted sm:block">{t("keyboardHint")}</p>

      <StickyActionBar
        ref={primaryRef}
        label={round.flipped ? t("knew") : t("flip")}
        onAction={round.flipped ? () => mark(true) : flip}
        status={round.flipped ? t("answerStatus", { answer: germanFirst ? meaning : card.front }) : progress}
        secondary={
          <button
            type="button"
            aria-disabled={!round.flipped}
            data-didnt-know
            onClick={() => {
              if (!round.flipped) return;
              mark(false);
              primaryRef.current?.focus();
            }}
            className="btn border border-danger bg-danger-soft text-danger aria-disabled:cursor-not-allowed aria-disabled:opacity-40"
          >
            {t("didntKnow")}
          </button>
        }
      />
    </div>
  );
}
