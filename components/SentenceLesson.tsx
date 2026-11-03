"use client";

import { useTranslations } from "next-intl";
import type { GrammarFocus } from "@/types/sentence";

const EXAMPLES: Record<GrammarFocus, readonly string[]> = {
  v2: ["Ich lerne heute Deutsch.", "Heute lerne ich Deutsch."],
  question: ["Wo wohnst du?", "Hast du Hunger?"],
  "modal-bracket": ["Ich kann gut schwimmen.", "Du musst heute arbeiten."],
  "separable-bracket": ["Ich stehe um sieben Uhr auf.", "Der Zug kommt um acht Uhr an."],
  "subordinate-weil": ["Ich lerne Deutsch, weil ich in Berlin wohne."],
  "negation-nicht-kein": ["Ich habe keinen Hunger.", "Ich komme heute nicht."],
  "time-manner-place": ["Ich fahre morgen mit dem Zug nach Berlin."],
};

/** Lesson-style intro card for one grammar focus (text lives in messages/{en,fa,de}.json). */
export default function SentenceLesson({ focus }: { focus: GrammarFocus }) {
  const t = useTranslations("Sentences");

  return (
    <aside aria-label={t("lesson")} className="card space-y-2 p-5">
      <p className="eyebrow text-primary">{t("lesson")}</p>
      <h2 className="text-lg font-extrabold">{t(`lessons.${focus}.title`)}</h2>
      <p className="text-sm leading-relaxed">{t(`lessons.${focus}.body`)}</p>
      <ul dir="ltr" lang="de" className="space-y-1 rounded-2xl bg-surface-2 p-3 text-start text-sm font-semibold italic">
        {EXAMPLES[focus].map((ex) => (
          <li key={ex}>{ex}</li>
        ))}
      </ul>
    </aside>
  );
}
