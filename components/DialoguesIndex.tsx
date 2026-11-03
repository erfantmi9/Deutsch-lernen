"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { bestScore, isPassed, passedFraction } from "@/lib/scoreStats";
import { useDialogueStore } from "@/stores/dialogueStore";
import type { DialogueTopic } from "@/types/dialogue";
import type { I18n3 } from "@/types/common";
import PageHeader from "./PageHeader";
import ProgressRing from "./ProgressRing";
import DialogueTopicIcon from "./illustrations/DialogueTopicIcon";
import DialoguesHeader from "./illustrations/headers/DialoguesHeader";

type Locale = "en" | "fa" | "de";

export interface DialogueCard {
  id: string;
  topic: DialogueTopic;
  title: I18n3;
  setting: I18n3;
  lineCount: number;
}

/** /dialogues: all dialogues as cards with their quiz status. */
export default function DialoguesIndex({ cards }: { cards: DialogueCard[] }) {
  const t = useTranslations("Dialogues");
  const locale = useLocale() as Locale;
  const [ready, setReady] = useState(false);

  const results = useDialogueStore((s) => s.results);
  const reset = useDialogueStore((s) => s.reset);

  // Persisted progress loads on the client only, after mount.
  useEffect(() => {
    let cancelled = false;
    Promise.resolve(useDialogueStore.persist.rehydrate()).then(() => {
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
        illustration={<DialoguesHeader size="100%" />}
        actions={
          <div className="flex items-center gap-3">
            <ProgressRing value={overall} size={48} label={t("progress", { percent })} />
            <span className="text-sm font-bold text-text-muted">{t("progress", { percent })}</span>
          </div>
        }
      />

      <ul aria-label={t("listLabel")} className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => {
          const done = ready && isPassed(results, c.id);
          const best = ready ? bestScore(results, c.id) : null;
          return (
            <li key={c.id}>
              <Link
                href={`/dialogues/${c.id}`}
                className="card group flex h-full items-start gap-4 p-5 transition duration-150 hover:-translate-y-1 hover:shadow-lift"
              >
                <div className="w-16 shrink-0 rounded-2xl bg-surface-2 p-2 [&>svg]:h-auto [&>svg]:w-full">
                  <DialogueTopicIcon topic={c.topic} size="100%" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="eyebrow">
                    {t(`topics.${c.topic}`)} · {t("lines", { n: c.lineCount })}
                  </p>
                  <h2 className="text-xl font-extrabold">{c.title[locale]}</h2>
                  <p className="text-sm text-text-muted">{c.setting[locale]}</p>
                  <p className="flex flex-wrap items-center gap-2 pt-1 text-xs font-bold">
                    <span className="rounded-full bg-primary-soft px-3 py-1 text-primary">
                      {done && <span aria-hidden="true">✓ </span>}
                      {done ? t("statusDone") : t("statusNew")}
                    </span>
                    {best !== null && (
                      <span className="text-text-muted">{t("bestScore", { score: best, total: 4 })}</span>
                    )}
                  </p>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="text-end">
        <button type="button" onClick={() => reset()} className="btn-ghost">
          {t("reset")}
        </button>
      </div>
    </div>
  );
}
