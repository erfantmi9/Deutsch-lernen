"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { bestScore, isPassed, passedFraction } from "@/lib/scoreStats";
import { useReadingStore } from "@/stores/readingStore";
import type { ReadingKind } from "@/types/reading";
import type { I18n3 } from "@/types/common";
import PageHeader from "./PageHeader";
import ProgressRing from "./ProgressRing";
import ReadingKindIcon from "./illustrations/ReadingKindIcon";
import ReadingHeader from "./illustrations/headers/ReadingHeader";
import ConfirmDialog from "./ui/ConfirmDialog";

type Locale = "en" | "fa" | "de";

export interface ReadingCard {
  id: string;
  kind: ReadingKind;
  title: I18n3;
  taskCount: number;
}

/** /reading: all texts as cards with their status. */
export default function ReadingIndex({ cards }: { cards: ReadingCard[] }) {
  const t = useTranslations("Reading");
  const locale = useLocale() as Locale;
  const [ready, setReady] = useState(false);

  const results = useReadingStore((s) => s.results);
  const reset = useReadingStore((s) => s.reset);
  const [askReset, setAskReset] = useState(false);
  const tUi = useTranslations("Ui");

  // Persisted progress loads on the client only, after mount.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(useReadingStore.persist.rehydrate()).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const overall = ready
    ? passedFraction(
        cards.map((c) => c.id),
        results,
      )
    : 0;
  const percent = Math.round(overall * 100);

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        illustration={<ReadingHeader size="100%" />}
        actions={
          <div className="flex items-center gap-3">
            <ProgressRing value={overall} size={48} label={t("progress", { percent })} />
            <span className="text-sm font-bold text-text-muted">{t("progress", { percent })}</span>
          </div>
        }
      />

      <ul aria-label={t("listLabel")} aria-busy={!ready || undefined} className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => {
          const done = ready && isPassed(results, c.id);
          const best = ready ? bestScore(results, c.id) : null;
          return (
            <li key={c.id}>
              <Link
                href={`/reading/${c.id}`}
                className="card group flex h-full items-start gap-4 p-5 transition duration-150 hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="w-16 shrink-0 rounded-2xl bg-surface-2 p-2 [&>svg]:h-auto [&>svg]:w-full">
                  <ReadingKindIcon kind={c.kind} size="100%" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="eyebrow">
                    {t(`kinds.${c.kind}`)} · {t("tasks", { n: c.taskCount })}
                  </p>
                  <h2 className="text-xl font-extrabold">{c.title[locale]}</h2>
                  <p className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                    {/* Until the store has loaded, a neutral placeholder holds the badge's place: never a "New" that turns
                        into "Done". Both labels share one grid cell, so the badge is the same size in every state. */}
                    <span
                      data-status-badge={ready ? (done ? "done" : "new") : "loading"}
                      aria-hidden={!ready || undefined}
                      className={"grid rounded-full px-3 py-1 " + (ready ? "bg-primary-soft text-primary" : "bg-surface-2")}
                    >
                      <span className={"col-start-1 row-start-1" + (ready && !done ? "" : " invisible")}>{t("statusNew")}</span>
                      <span className={"col-start-1 row-start-1" + (ready && done ? "" : " invisible")}>
                        <span aria-hidden="true">✓ </span>
                        {t("statusDone")}
                      </span>
                    </span>
                    {best !== null && <span className="text-text-muted">{t("bestScore", { score: best, total: c.taskCount })}</span>}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="text-end">
        <button type="button" onClick={() => setAskReset(true)} aria-haspopup="dialog" className="btn-ghost">
          {t("reset")}
        </button>
        <ConfirmDialog
          open={askReset}
          title={tUi("resetTitle")}
          message={tUi("resetMessage", { area: t("title") })}
          confirmLabel={tUi("resetAction")}
          onCancel={() => setAskReset(false)}
          onConfirm={() => {
            reset();
            setAskReset(false);
          }}
        />
      </div>
    </div>
  );
}
