"use client";

import { useEffect, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { isPassed, bestScore } from "@/lib/scoreStats";
import { useDialogueStore } from "@/stores/dialogueStore";
import { useListenStore } from "@/stores/listenStore";
import type { I18n3 } from "@/types/common";
import type { DialogueTopic } from "@/types/dialogue";
import PageHeader from "../PageHeader";
import ProgressRing from "../ProgressRing";
import Mascot from "../illustrations/Mascot";
import DialogueTopicIcon from "../illustrations/DialogueTopicIcon";
import SpeechGate from "./SpeechGate";

type Locale = "en" | "fa" | "de";

export interface ListenHubDialogue {
  id: string;
  title: I18n3;
  topic: DialogueTopic;
}

type ModuleKey = "dictation" | "messages" | "sounds" | "words";

/** The listening section: four kinds of practice, dialogues by ear, and how to practise. */
export default function ListenHub({
  dictationTotal,
  messagesTotal,
  dictationIds,
  messageIds,
  dialogues,
}: {
  dictationTotal: number;
  messagesTotal: number;
  /** Ids that exist today, so progress on removed content is not counted. */
  dictationIds: string[];
  messageIds: string[];
  dialogues: ListenHubDialogue[];
}) {
  const t = useTranslations("Listen.hub");
  const tD = useTranslations("Dialogues");
  const locale = useLocale() as Locale;
  const [ready, setReady] = useState(false);

  const dictationPassed = useListenStore((s) => s.dictationPassed);
  const messagesSolved = useListenStore((s) => s.messagesSolved);
  const dialogueResults = useDialogueStore((s) => s.results);

  useEffect(() => {
    let cancelled = false;
    Promise.all([useListenStore.persist.rehydrate(), useDialogueStore.persist.rehydrate()]).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const dictationDone = ready ? new Set(dictationPassed.filter((id) => dictationIds.includes(id))).size : 0;
  const messagesDone = ready ? new Set(messagesSolved.filter((id) => messageIds.includes(id))).size : 0;

  const modules: { key: ModuleKey; href: string; done: number | null; total: number | null }[] = [
    { key: "dictation", href: "/listen/dictation", done: dictationDone, total: dictationTotal },
    { key: "messages", href: "/listen/messages", done: messagesDone, total: messagesTotal },
    { key: "sounds", href: "/listen/sounds", done: null, total: null },
    { key: "words", href: "/listen/words", done: null, total: null },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} illustration={<Mascot mood="listening" size={160} />} />

      <SpeechGate>{null}</SpeechGate>

      <ul className="grid gap-4 sm:grid-cols-2">
        {modules.map((m) => {
          const value = m.total ? (m.done ?? 0) / m.total : null;
          return (
            <li key={m.key}>
              <Link
                href={m.href}
                data-listen-module={m.key}
                className="card flex h-full items-start justify-between gap-3 p-5 transition duration-150 hover:-translate-y-1 hover:shadow-lift"
              >
                <span className="min-w-0 space-y-1">
                  <span className="eyebrow block">{t(`modules.${m.key}.tag`)}</span>
                  <span className="block text-xl font-extrabold">{t(`modules.${m.key}.title`)}</span>
                  <span className="block text-sm text-text-muted">{t(`modules.${m.key}.desc`)}</span>
                  {m.total !== null && (
                    <span className="block pt-1 text-xs font-bold text-text-muted">{t("count", { done: m.done ?? 0, total: m.total })}</span>
                  )}
                </span>
                {value !== null && <ProgressRing value={ready ? value : 0} size={44} label={t("percent", { percent: Math.round(value * 100) })} />}
              </Link>
            </li>
          );
        })}
      </ul>

      <section aria-labelledby="lh-dialogues" className="space-y-3">
        <div className="space-y-1">
          <h2 id="lh-dialogues" className="text-2xl font-extrabold">
            {t("dialoguesTitle")}
          </h2>
          <p className="text-text-muted">{t("dialoguesDesc")}</p>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2" aria-busy={!ready || undefined}>
          {dialogues.map((d) => {
            const done = ready && isPassed(dialogueResults, d.id);
            const best = ready ? bestScore(dialogueResults, d.id) : null;
            return (
              <li key={d.id}>
                <Link
                  href={`/listen/dialogues/${d.id}`}
                  className="card flex h-full items-center gap-3 p-4 transition duration-150 hover:-translate-y-0.5 hover:shadow-lift"
                >
                  <span className="w-12 shrink-0 rounded-xl bg-surface-2 p-1.5 [&>svg]:h-auto [&>svg]:w-full">
                    <DialogueTopicIcon topic={d.topic} size="100%" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-extrabold">{d.title[locale]}</span>
                    <span className="block text-xs font-bold text-text-muted">
                      {done ? (
                        <span className="text-success">
                          <span aria-hidden="true">✓ </span>
                          {tD("statusDone")}
                        </span>
                      ) : (
                        tD(`topics.${d.topic}`)
                      )}
                      {best !== null && <> · {tD("bestScore", { score: best, total: 4 })}</>}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="lh-tips" className="card space-y-3 p-5">
        <h2 id="lh-tips" className="text-lg font-extrabold">
          {t("tipsTitle")}
        </h2>
        <ol className="list-inside list-decimal space-y-2 text-text-muted">
          {(["first", "slow", "keywords", "shadow", "daily"] as const).map((k) => (
            <li key={k}>{t(`tips.${k}`)}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
