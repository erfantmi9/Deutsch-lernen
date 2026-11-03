"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { currentStreak } from "@/lib/activity";
import { dateKey } from "@/lib/dateKey";
import { buildQueue } from "@/lib/srs";
import { useActivityStore } from "@/stores/activityStore";
import { ensureSrsHydrated, useSrsStore } from "@/stores/srsStore";

/** Three shortcuts under the module cards: vocabulary, review (with today's due count) and progress (with the streak). */
export default function HomeStudy() {
  const t = useTranslations("HomeStudy");
  const [ready, setReady] = useState(false);
  const [today, setToday] = useState("1970-01-01");
  const cards = useSrsStore((s) => s.cards);
  const log = useSrsStore((s) => s.log);
  const newPerDay = useSrsStore((s) => s.newPerDay);
  const days = useActivityStore((s) => s.days);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([ensureSrsHydrated(), useActivityStore.persist.rehydrate()]).then(() => {
      if (cancelled) return;
      setToday(dateKey());
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const deckSize = Object.keys(cards).length;
  const queue = buildQueue(cards, { today, newPerDay, newDoneToday: log[today]?.newCards ?? 0 });
  const due = ready ? queue.ids.length : 0;
  const streak = ready ? currentStreak(days, today) : 0;

  const items = [
    { href: "/vocabulary", title: t("vocabulary"), text: t("vocabularyDesc") },
    { href: "/review", title: t("review"), text: ready && deckSize === 0 ? t("reviewEmpty") : t("reviewDue", { count: due }) },
    { href: "/progress", title: t("progress"), text: t("progressStreak", { count: streak }) },
  ] as const;

  return (
    <section aria-labelledby="study-title" className="space-y-4">
      <h2 id="study-title" className="text-2xl font-extrabold">
        {t("title")}
      </h2>
      <ul className="grid gap-4 sm:grid-cols-3">
        {items.map((i) => (
          <li key={i.href}>
            <Link
              href={i.href}
              className="card flex h-full flex-col gap-1 p-5 transition duration-150 hover:-translate-y-1 hover:shadow-lift"
            >
              <span className="text-lg font-extrabold">{i.title}</span>
              <span className="text-sm text-text-muted">{i.text}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
