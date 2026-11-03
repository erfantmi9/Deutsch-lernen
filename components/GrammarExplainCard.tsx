"use client";

import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getExplanation, type ExplainLocale } from "@/lib/explain";
import type { VocabEntry } from "@/types/vocab";
import { MixedText } from "./MixedText";
import { ROLE_STYLE } from "./roleStyles";

const BADGE: Record<string, string> = {
  suffix: ROLE_STYLE.subject,
  semantic: ROLE_STYLE.time,
  exception: ROLE_STYLE.verb,
  learn: ROLE_STYLE.other,
};

export default function GrammarExplainCard({ word }: { word: VocabEntry }) {
  const t = useTranslations("Explain");
  const tCat = useTranslations("Category");
  const locale = useLocale() as ExplainLocale;
  const [simple, setSimple] = useState(false);

  const ex = getExplanation(word, locale, simple ? "simple" : "normal");

  return (
    <div className="card space-y-3 p-4 text-start text-text">
      <div className="flex flex-wrap items-center gap-2">
        <bdi dir="ltr" lang="de" className="text-lg font-extrabold">
          {word.article} {word.word}
        </bdi>
        <span className={"rounded-full border-2 px-3 py-0.5 text-xs font-extrabold uppercase " + BADGE[ex.category]}>
          {tCat(ex.category)}
        </span>
      </div>

      <div>
        <p className="eyebrow text-primary">{t("rule")}</p>
        <p className="text-sm leading-relaxed">
          <MixedText text={ex.rule} locale={locale} />
        </p>
      </div>

      <div>
        <p className="eyebrow text-primary">{t("example")}</p>
        <p className="text-sm font-semibold italic">
          <bdi dir="ltr" lang="de">{ex.example.de}</bdi>
        </p>
        <p className="text-sm text-text-muted">{ex.example.translation}</p>
      </div>

      <button type="button" aria-pressed={simple} onClick={() => setSimple((s) => !s)} className="pill">
        {simple ? t("detailed") : t("simpler")}
      </button>
    </div>
  );
}
