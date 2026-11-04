"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { dateKey } from "@/lib/dateKey";
import type { ReviewCard } from "@/lib/reviewCards";
import { buildQueue, clampNewPerDay, deckStats, GRADES, previewInterval, requeueAfterAgain } from "@/lib/srs";
import type { Grade } from "@/lib/srs";
import { exportSrs, parseSrsImport } from "@/lib/srsData";
import { ensureSrsHydrated, useSrsStore } from "@/stores/srsStore";
import CardFront from "./CardFront";
import SpeakButton from "./SpeakButton";
import PageHeader from "./PageHeader";
import Mascot from "./illustrations/Mascot";
import ConfirmDialog from "./ui/ConfirmDialog";
import FeedbackRegion from "./ui/FeedbackRegion";
import StickyActionBar from "./ui/StickyActionBar";

type Locale = "en" | "fa" | "de";
type ImportMode = "merge" | "replace";

interface Session {
  queue: string[];
  index: number;
  flipped: boolean;
  counts: Record<Grade, number>;
  /** Answers that were scheduled (a repeat of a missed card is practice only). */
  answered: number;
}

const GRADE_STYLE: Record<Grade, string> = {
  again: "btn border border-danger bg-danger-soft text-danger",
  hard: "btn btn-secondary",
  good: "btn btn-primary",
  easy: "btn border border-success bg-success-soft text-success",
};

const emptyCounts = (): Record<Grade, number> => ({ again: 0, hard: 0, good: 0, easy: 0 });

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat">
      <p className="text-2xl font-extrabold tabular-nums">{value}</p>
      <p className="text-xs font-bold text-text-muted">{label}</p>
    </div>
  );
}

export default function ReviewView({ cards: catalog }: { cards: readonly ReviewCard[] }) {
  const t = useTranslations("Review");
  const tUi = useTranslations("Ui");
  const [askLeave, setAskLeave] = useState(false);
  const locale = useLocale() as Locale;
  const tr = locale === "de" ? "en" : locale;

  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("1970-01-01");
  const [session, setSession] = useState<Session | null>(null);
  const [summary, setSummary] = useState<Session | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<ImportMode>("merge");
  const [confirmReset, setConfirmReset] = useState(false);

  const cards = useSrsStore((s) => s.cards);
  const log = useSrsStore((s) => s.log);
  const newPerDay = useSrsStore((s) => s.newPerDay);
  const grade = useSrsStore((s) => s.grade);
  const setNewPerDay = useSrsStore((s) => s.setNewPerDay);
  const importState = useSrsStore((s) => s.importState);
  const reset = useSrsStore((s) => s.reset);

  useEffect(() => {
    let cancelled = false;
    void ensureSrsHydrated().then(() => {
      if (cancelled) return;
      setToday(dateKey());
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const byId = useMemo(() => new Map(catalog.map((c) => [c.id, c])), [catalog]);

  const queue = useMemo(
    () => buildQueue(cards, { today, newPerDay, newDoneToday: log[today]?.newCards ?? 0 }),
    [cards, today, newPerDay, log],
  );
  const playable = useMemo(() => queue.ids.filter((id) => byId.has(id)), [queue, byId]);
  const stats = useMemo(() => deckStats(cards, today), [cards, today]);
  const doneToday = log[today]?.reviews ?? 0;

  const start = () => {
    setMessage(null);
    setSummary(null);
    repeated.current = new Set();
    setSession({ queue: playable, index: 0, flipped: false, counts: emptyCounts(), answered: 0 });
  };

  const repeated = useRef<Set<string>>(new Set());
  const statusRef = useRef<HTMLDivElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (summary) summaryRef.current?.focus();
  }, [summary]);

  const answer = useCallback(
    (g: Grade) => {
      if (!session || !session.flipped) return;
      const id = session.queue[session.index];
      // A repeat of a card missed earlier in this session is practice only: it is not scheduled again.
      const isRepeat = session.queue.indexOf(id) < session.index;
      if (!isRepeat) grade(id, g);

      const queue = isRepeat ? session.queue : requeueAfterAgain(session.queue, session.index, g, repeated.current);
      if (!isRepeat && g === "again") repeated.current.add(id);

      const next: Session = {
        queue,
        index: session.index + 1,
        flipped: false,
        counts: isRepeat ? session.counts : { ...session.counts, [g]: session.counts[g] + 1 },
        answered: isRepeat ? session.answered : session.answered + 1,
      };
      if (next.index >= next.queue.length) {
        setSession(null);
        setSummary(next);
      } else {
        setSession(next);
      }
    },
    [session, grade],
  );

  const flip = useCallback(() => setSession((s) => (s && !s.flipped ? { ...s, flipped: true } : s)), []);

  useEffect(() => {
    if (!session) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT")) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === " " && !session.flipped) {
        e.preventDefault();
        flip();
      } else if (session.flipped && ["1", "2", "3", "4"].includes(e.key)) {
        answer(GRADES[Number(e.key) - 1]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session, flip, answer]);

  const exportDeck = () => {
    const { cards: c, log: l, newPerDay: n } = useSrsStore.getState();
    const blob = new Blob([exportSrs({ cards: c, log: l, newPerDay: n })], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `deutsch-lernen-review-${today}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const onImport = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const result = parseSrsImport(await file.text());
    if (!result.ok) {
      setMessage(result.error === "json" ? t("importJson") : t("importShape"));
      return;
    }
    importState(result.state, importMode);
    setMessage(t("importOk", { count: Object.keys(useSrsStore.getState().cards).length }));
  };

  if (!ready) {
    return (
      <div className="space-y-6">
        <PageHeader title={t("title")} subtitle={t("subtitle")} />
        <div aria-hidden="true" className="card h-40 animate-pulse" />
      </div>
    );
  }

  // ---------- one card ----------
  if (session) {
    const card = byId.get(session.queue[session.index]);
    if (!card) return null;
    const exampleTr = card.example?.[tr];
    const progress = t("progress", { current: session.index + 1, total: session.queue.length });
    const srsCard = cards[card.id] ?? { id: card.id, ease: 2.5, interval: 0, reps: 0, lapses: 0, due: today, added: today };
    const intervalOf = (g: Grade) => t("nextIn", { days: previewInterval(srsCard, g, today) });
    const gradeLabel = (g: Grade) => (
      <span className="flex flex-col items-center leading-tight">
        <span>
          <span aria-hidden="true" className="me-1 text-xs opacity-70">
            {GRADES.indexOf(g) + 1}
          </span>
          {t(`grades.${g}`)}
        </span>
        <span className="text-xs font-semibold opacity-80">{intervalOf(g)}</span>
      </span>
    );
    // Again, Hard and Easy sit around the primary button (Show answer, then Good). They stay mounted, aria-disabled
    // until the answer shows, so nothing appears or vanishes under the finger.
    const gradeButton = (g: Grade) => (
      <button
        key={g}
        type="button"
        data-grade={g}
        aria-disabled={!session.flipped}
        aria-label={t("gradeAria", { grade: t(`grades.${g}`), interval: intervalOf(g) })}
        onClick={() => {
          if (!session.flipped) return;
          answer(g);
          primaryRef.current?.focus();
        }}
        className={
          GRADE_STYLE[g] +
          " min-w-0 flex-1 px-2 py-1 text-sm aria-disabled:cursor-not-allowed aria-disabled:opacity-40 aria-disabled:hover:translate-y-0"
        }
      >
        {gradeLabel(g)}
      </button>
    );
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <h1 className="sr-only">{t("title")}</h1>
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold text-text-muted">{progress}</p>
          <button
            type="button"
            className="btn-ghost"
            aria-haspopup={session.index > 0 ? "dialog" : undefined}
            onClick={() => (session.index > 0 ? setAskLeave(true) : setSession(null))}
          >
            {t("backToOverview")}
          </button>
          <ConfirmDialog
            open={askLeave}
            title={tUi("leaveTitle")}
            message={tUi("leaveMessage", { done: session.index, total: session.queue.length })}
            confirmLabel={tUi("leaveAction")}
            tone="primary"
            onCancel={() => setAskLeave(false)}
            onConfirm={() => {
              setAskLeave(false);
              setSession(null);
            }}
          />
        </div>
        <div
          role="progressbar"
          aria-label={progress}
          aria-valuemin={0}
          aria-valuemax={session.queue.length}
          aria-valuenow={session.index}
          className="h-2 overflow-hidden rounded-full bg-surface-2"
        >
          <div className="h-full bg-primary transition-[width]" style={{ width: `${(session.index / session.queue.length) * 100}%` }} />
        </div>

        <section aria-label={t("cardAria")} className="card-hero space-y-5 p-6 text-center sm:p-8">
          <div className="space-y-1">
            <p className="eyebrow">{t("front")}</p>
            <div className="flex items-center justify-center gap-3">
              <CardFront card={card} className="text-3xl sm:text-4xl" />
              <SpeakButton text={card.front} compact />
            </div>
          </div>

          {/* Reserved: revealing the answer never moves the card or the page. */}
          <div data-review-answer className="min-h-48 space-y-3 border-t border-border pt-5">
            {session.flipped ? (
              <>
                <p className="eyebrow">{t("answer")}</p>
                <p lang={tr} className="text-2xl font-extrabold">
                  {card.translations[tr]}
                </p>
                {card.detail && (
                  <p className="text-text-muted">
                    <bdi dir="ltr" lang="de">
                      {card.detail}
                    </bdi>
                  </p>
                )}
                {card.example && (
                  <p className="text-sm">
                    <bdi dir="ltr" lang="de" className="font-semibold">
                      {card.example.de}
                    </bdi>
                    {exampleTr && (
                      <span lang={tr} className="block text-text-muted">
                        {exampleTr}
                      </span>
                    )}
                  </p>
                )}
              </>
            ) : (
              <p className="pt-8 text-sm text-text-muted">{t("thinkFirst")}</p>
            )}
          </div>
        </section>

        <p className="hidden text-center text-xs text-text-muted sm:block">{session.flipped ? t("againHint") : t("keyboardHint")}</p>

        {/* The bar status is the page's single live region: the progress, then the answer once it is shown. */}
        <StickyActionBar
          ref={primaryRef}
          label={session.flipped ? gradeLabel("good") : t("showAnswer")}
          onAction={session.flipped ? () => answer("good") : flip}
          status={session.flipped ? t("answerStatus", { answer: card.translations[tr] }) : progress}
          secondary={GRADES.slice(0, 2).map(gradeButton)}
          trailing={gradeButton("easy")}
        />
      </div>
    );
  }

  // ---------- summary ----------
  if (summary) {
    const good = summary.counts.good + summary.counts.easy;
    const percent = summary.answered === 0 ? 0 : Math.round((good / summary.answered) * 100);
    return (
      <div className="mx-auto max-w-xl space-y-5">
        <section aria-labelledby="summary-title" className="card-hero space-y-4 p-6 text-center sm:p-8">
          <Mascot mood={percent >= 60 ? "cheering" : "thinking"} size={120} className="mx-auto" />
          <h1 id="summary-title" ref={summaryRef} tabIndex={-1} className="text-3xl font-extrabold outline-none">
            {t("summaryTitle")}
          </h1>
          <p>{t("summaryText", { count: summary.answered })}</p>
          <p className="text-lg font-extrabold text-primary">{t("remembered", { percent })}</p>
          <div className="grid grid-cols-4 gap-2">
            {GRADES.map((g) => (
              <Stat key={g} label={t(`grades.${g}`)} value={summary.counts[g]} />
            ))}
          </div>
          <p className="font-bold">{playable.length > 0 ? t("nextMore", { count: playable.length }) : t("nextDone")}</p>
          <div className="flex flex-wrap justify-center gap-3">
            {playable.length > 0 ? (
              <button type="button" data-summary-next className="btn btn-primary" onClick={start}>
                {t("practiseMore")}
              </button>
            ) : (
              <Link href="/vocabulary" data-summary-next className="btn btn-primary">
                {t("addWords")}
              </Link>
            )}
            <button type="button" className="btn btn-secondary" onClick={() => setSummary(null)}>
              {t("backToOverview")}
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ---------- overview ----------
  const deckEmpty = stats.total === 0;
  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        illustration={<Mascot mood="waving" size={120} className="mx-auto" />}
      />

      {deckEmpty ? (
        <section className="card space-y-3 p-6 text-center">
          <h2 className="text-xl font-extrabold">{t("emptyDeckTitle")}</h2>
          <p className="text-text-muted">{t("emptyDeckText")}</p>
          <Link href="/vocabulary" className="btn btn-primary">
            {t("goVocabulary")}
          </Link>
        </section>
      ) : (
        <section aria-labelledby="today-title" className="card space-y-4 p-5 sm:p-6">
          <h2 id="today-title" className="text-xl font-extrabold">
            {t("today")}
          </h2>
          <div className="grid grid-cols-3 gap-3">
            <Stat label={t("dueLabel")} value={queue.dueCount} />
            <Stat label={t("newLabel")} value={queue.newCount} />
            <Stat label={t("doneLabel")} value={doneToday} />
          </div>
          {playable.length > 0 ? (
            <button type="button" onClick={start} className="btn btn-primary w-full py-3 text-lg">
              {t("start")}
            </button>
          ) : (
            <div className="feedback-success space-y-1">
              <p className="font-extrabold">{t("allDoneTitle")}</p>
              <p>{t("allDoneText")}</p>
            </div>
          )}
          {queue.newBacklog > 0 && <p className="text-sm text-text-muted">{t("backlog", { count: queue.newBacklog })}</p>}
        </section>
      )}

      <section aria-labelledby="deck-title" className="card space-y-3 p-5 sm:p-6">
        <h2 id="deck-title" className="text-xl font-extrabold">
          {t("deckTitle")}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label={t("stats.total")} value={stats.total} />
          <Stat label={t("stats.fresh")} value={stats.fresh} />
          <Stat label={t("stats.learning")} value={stats.learning} />
          <Stat label={t("stats.mature")} value={stats.mature} />
        </div>
      </section>

      <section aria-labelledby="settings-title" className="card space-y-3 p-5 sm:p-6">
        <h2 id="settings-title" className="text-xl font-extrabold">
          {t("settingsTitle")}
        </h2>
        <label className="flex flex-wrap items-center gap-3">
          <span className="font-bold">{t("newPerDay")}</span>
          <input
            type="number"
            inputMode="numeric"
            min={0}
            max={100}
            value={newPerDay}
            onChange={(e) => setNewPerDay(clampNewPerDay(e.target.valueAsNumber))}
            className="min-h-11 w-24 rounded-full border-2 border-border bg-surface px-4 py-2 text-center font-bold tabular-nums outline-none focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/30"
          />
        </label>
        <p className="text-sm text-text-muted">{t("newPerDayHint")}</p>
      </section>

      <section aria-labelledby="data-title" className="card space-y-4 p-5 sm:p-6">
        <h2 id="data-title" className="text-xl font-extrabold">
          {t("dataTitle")}
        </h2>
        <p className="text-sm text-text-muted">{t("dataText")}</p>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={exportDeck} className="btn btn-secondary">
            {t("export")}
          </button>
          <label className="btn btn-secondary cursor-pointer focus-within:ring-4 focus-within:ring-primary/30">
            {t("importLabel")}
            <input type="file" accept=".json,application/json" onChange={onImport} className="sr-only" />
          </label>
        </div>
        {/* Import and reset results show right under the buttons (the page's single live region, height reserved). */}
        <FeedbackRegion size="sm" className="!min-h-12" ref={statusRef}>
          {message && <p className="feedback-hint">{message}</p>}
        </FeedbackRegion>
        <fieldset className="space-y-1">
          <legend className="text-sm font-bold">{t("importMode")}</legend>
          <div className="flex flex-wrap gap-4">
            {(["merge", "replace"] as const).map((m) => (
              <label key={m} className="flex min-h-11 items-center gap-2">
                <input type="radio" name="import-mode" checked={importMode === m} onChange={() => setImportMode(m)} />
                {m === "merge" ? t("importMerge") : t("importReplace")}
              </label>
            ))}
          </div>
        </fieldset>

        <button type="button" onClick={() => setConfirmReset(true)} disabled={deckEmpty} aria-haspopup="dialog" className="btn-ghost">
          {t("reset")}
        </button>
        <ConfirmDialog
          open={confirmReset}
          title={tUi("resetTitle")}
          message={t("resetConfirm")}
          confirmLabel={tUi("resetAction")}
          cancelLabel={t("resetCancel")}
          onCancel={() => setConfirmReset(false)}
          onConfirm={() => {
            reset();
            repeated.current = new Set();
            setConfirmReset(false);
            setMessage(t("resetDone"));
          }}
        />
      </section>
    </div>
  );
}
