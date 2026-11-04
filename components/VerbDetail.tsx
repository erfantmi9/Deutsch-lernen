"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { filterVerbs, parseVerbType, verbs } from "@/lib/verbs";
import type { VerbEntry } from "@/types/verb";
import AddToReviewButton from "./AddToReviewButton";
import SpeakButton from "./SpeakButton";
import VerbTable from "./VerbTable";

/** Verb detail page body: back link (keeps the list filter), actions, conjugation, previous / next verb. */
export default function VerbDetail({ verb }: { verb: VerbEntry }) {
  const t = useTranslations("Verbs");
  const type = parseVerbType(useSearchParams().get("type"));

  // Prev/next follow the filtered list the user came from; fall back to all verbs if this verb isn't in it.
  const filtered = type ? filterVerbs({ type }) : [...verbs];
  const inFilter = filtered.some((v) => v.id === verb.id);
  const list = inFilter ? filtered : [...verbs];
  const qs = type && inFilter ? `?type=${type}` : "";
  const i = list.findIndex((v) => v.id === verb.id);
  const prev = i > 0 ? list[i - 1] : null;
  const next = i >= 0 && i < list.length - 1 ? list[i + 1] : null;

  return (
    <div className="space-y-4">
      <Link href={`/verbs${qs}`} className="btn-ghost -ms-4 gap-1">
        <span aria-hidden="true" className="rtl:-scale-x-100">
          ←
        </span>
        {t("backToList")}
      </Link>

      <div className="flex flex-wrap items-center gap-2">
        <Link href={`/verbs${qs ? qs + "&" : "?"}practice=1`} className="btn btn-primary">
          {t("practice")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
        </Link>
        <AddToReviewButton cardId={`verb:${verb.id}`} word={verb.infinitive} />
        <SpeakButton text={verb.infinitive} />
      </div>

      <VerbTable key={verb.id} verb={verb} />

      <nav aria-label={t("verbNavigation")} className="flex items-stretch justify-between gap-3">
        {prev ? (
          <Link href={`/verbs/${prev.id}${qs}`} rel="prev" className="btn btn-secondary">
            <span aria-hidden="true" className="rtl:-scale-x-100">
              ←
            </span>
            <span className="sr-only">{t("previousVerb")}: </span>
            <bdi dir="ltr" lang="de">
              {prev.infinitive}
            </bdi>
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/verbs/${next.id}${qs}`} rel="next" className="btn btn-secondary">
            <span className="sr-only">{t("nextVerb")}: </span>
            <bdi dir="ltr" lang="de">
              {next.infinitive}
            </bdi>
            <span aria-hidden="true" className="rtl:-scale-x-100">
              →
            </span>
          </Link>
        )}
      </nav>
    </div>
  );
}
