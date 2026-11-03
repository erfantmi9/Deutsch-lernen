"use client";

import { useId, useState } from "react";
import type { KeyboardEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { getChangedPersons, perfektForms } from "@/lib/verbs";
import { PRONOUN } from "@/lib/verbDrill";
import { PERSONS } from "@/types/verb";
import type { Conjugation, Person, VerbEntry } from "@/types/verb";

type TabKey = "praesens" | "perfekt" | "praeteritum";

/** A finite verb form joined with its separated prefix by a dotted line (…stehe ······ auf). */
function SplitForm({ stem, prefix }: { stem: string; prefix: string }) {
  return (
    <span className="inline-flex w-full items-baseline gap-1">
      <span>{stem}</span>
      <span aria-hidden="true" className="h-0 min-w-6 flex-1 border-b-2 border-dotted border-role-verb-edge" />
      <span className="rounded-full bg-role-verb px-2 font-extrabold">{prefix}</span>
    </span>
  );
}

export default function VerbTable({ verb }: { verb: VerbEntry }) {
  const t = useTranslations("Verbs");
  const locale = useLocale() as "en" | "fa" | "de";
  const baseId = useId();

  const tabs: TabKey[] = verb.praeteritum ? ["praesens", "perfekt", "praeteritum"] : ["praesens", "perfekt"];
  const [tab, setTab] = useState<TabKey>("praesens");
  const active: TabKey = tabs.includes(tab) ? tab : "praesens";

  const changed = new Set<Person>(getChangedPersons(verb));
  const forms: Conjugation =
    active === "perfekt" ? perfektForms(verb) : active === "praeteritum" && verb.praeteritum ? verb.praeteritum : verb.present;

  const onTabKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    const rtl = locale === "fa";
    const idx = tabs.indexOf(active);
    let next = idx;
    if (e.key === (rtl ? "ArrowLeft" : "ArrowRight")) next = (idx + 1) % tabs.length;
    else if (e.key === (rtl ? "ArrowRight" : "ArrowLeft")) next = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = tabs.length - 1;
    else return;
    e.preventDefault();
    setTab(tabs[next]);
    document.getElementById(`${baseId}-tab-${tabs[next]}`)?.focus();
  };

  const translation = verb.translations[locale === "de" ? "en" : locale];

  return (
    <article className="card-hero space-y-4 p-5">
      <header className="flex flex-wrap items-center gap-3">
        <h2 className="text-3xl font-extrabold">
          <bdi dir="ltr" lang="de">
            {verb.infinitive}
          </bdi>
        </h2>
        <span className="text-text-muted">{translation}</span>
        <span className="rounded-full bg-primary-soft px-3 py-0.5 text-xs font-extrabold uppercase text-primary">
          {t(`types.${verb.type}`)}
        </span>
        <span className="rounded-full bg-surface-2 px-3 py-0.5 text-xs font-bold text-text-muted">{verb.level}</span>
        {verb.stemChange && (
          <span className="rounded-full border-2 border-role-verb-edge bg-role-verb px-3 py-0.5 text-xs font-extrabold">
            {t("stemChange")}: <bdi dir="ltr">{verb.stemChange}</bdi>
          </span>
        )}
      </header>

      {/* Tabs */}
      <div role="tablist" aria-label={t("tenses")} className="flex gap-1 rounded-full border border-border bg-surface-2 p-1">
        {tabs.map((k) => (
          <button
            key={k}
            id={`${baseId}-tab-${k}`}
            role="tab"
            type="button"
            aria-selected={active === k}
            aria-controls={`${baseId}-panel`}
            tabIndex={active === k ? 0 : -1}
            onClick={() => setTab(k)}
            onKeyDown={onTabKey}
            className="pill flex-1 justify-center border-transparent bg-transparent"
          >
            {t(`tabs.${k}`)}
          </button>
        ))}
      </div>

      {/* Conjugation table */}
      <div id={`${baseId}-panel`} role="tabpanel" aria-labelledby={`${baseId}-tab-${active}`}>
        <table className="w-full border-separate border-spacing-y-1 text-start">
          <caption className="sr-only">
            {verb.infinitive} – {t(`tabs.${active}`)}
          </caption>
          <thead>
            <tr className="eyebrow">
              <th scope="col" className="px-3 py-1 text-start font-medium">
                {t("person")}
              </th>
              <th scope="col" className="px-3 py-1 text-start font-medium">
                {t("form")}
              </th>
            </tr>
          </thead>
          <tbody>
            {PERSONS.map((p) => {
              const isChanged = active === "praesens" && changed.has(p);
              return (
                <tr key={p}>
                  <th
                    scope="row"
                    className="w-2/5 rounded-s-2xl bg-surface-2 px-3 py-2 text-start font-normal"
                  >
                    <bdi dir="ltr" lang="de" className="font-semibold">
                      {PRONOUN[p]}
                    </bdi>
                    <span className="ms-2 text-xs text-text-muted">{t(`persons.${p}`)}</span>
                  </th>
                  <td
                    className={
                      "rounded-e-2xl px-3 py-2 text-lg font-semibold " +
                      (isChanged ? "bg-role-verb ring-2 ring-role-verb-edge" : "bg-surface-2")
                    }
                  >
                    <bdi dir="ltr" lang="de" className="inline-block w-full">
                      {active === "praesens" && verb.separable ? (
                        <>
                          <SplitForm stem={forms[p]} prefix={verb.separable.prefix} />
                          <span className="sr-only">
                            {forms[p]} … {verb.separable.prefix}
                          </span>
                        </>
                      ) : (
                        forms[p]
                      )}
                      {isChanged && (
                        <>
                          <span aria-hidden="true" className="ms-2 text-xs">
                            ✱
                          </span>
                          <span className="sr-only"> ({t("stemChangedForm")})</span>
                        </>
                      )}
                    </bdi>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {active === "perfekt" && (
          <p className="mt-2 text-sm text-text-muted">
            {t("auxiliary")}: <bdi dir="ltr" lang="de" className="font-extrabold text-text">{verb.perfekt.auxiliary}</bdi>
            {" · "}
            {t("partizip2")}: <bdi dir="ltr" lang="de" className="font-extrabold text-text">{verb.perfekt.partizip2}</bdi>
          </p>
        )}
        {verb.separable && active === "praesens" && (
          <p className="mt-2 rounded-2xl bg-role-verb px-3 py-2 text-sm">
            {t("separableInfo", { prefix: verb.separable.prefix })}
          </p>
        )}
        {changed.size > 0 && active === "praesens" && (
          <p className="mt-2 text-xs text-text-muted">✱ {t("stemChangedForm")}</p>
        )}
      </div>

      {verb.note && (
        <div className="panel text-sm leading-relaxed">
          <p className="eyebrow mb-1 text-primary">{t("note")}</p>
          <p>{verb.note[locale]}</p>
        </div>
      )}

      <div className="text-sm">
        <p className="eyebrow mb-1 text-primary">{t("example")}</p>
        <p className="font-semibold italic">
          <bdi dir="ltr" lang="de">
            {verb.example.de}
          </bdi>
        </p>
        <p className="text-text-muted">{verb.example[locale === "de" ? "en" : locale]}</p>
      </div>
    </article>
  );
}
