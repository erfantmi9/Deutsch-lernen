"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { glossLabel, glossaryMap, parseCell } from "@/lib/grammarText";
import type { Locale } from "@/lib/grammarText";
import type { GlossaryEntry, GrammarTable as GrammarTableData } from "@/types/grammar";

/**
 * Case terms get a soft colour from the sentence-part tokens (nominative = subject, accusative = object).
 * Gender terms get a dot in the article colour. The term is always written out, colour is never the only signal.
 */
const TERM_TONE: Readonly<Record<string, string>> = {
  nominative: "bg-role-subject border-role-subject-edge",
  accusative: "bg-role-object border-role-object-edge",
  dative: "bg-role-place border-role-place-edge",
};

const GENDER_DOT: Readonly<Record<string, string>> = {
  masculine: "bg-der",
  feminine: "bg-die",
  neuter: "bg-das",
};

function Cell({ cell, glossary, locale }: { cell: string; glossary: ReadonlyMap<string, GlossaryEntry>; locale: Locale }): ReactNode {
  const parsed = parseCell(cell);

  if (parsed.kind === "text") {
    return (
      <bdi dir="ltr" lang="de">
        {parsed.runs.map((r, i) =>
          r.bold ? (
            <strong key={i} className="font-extrabold text-primary underline decoration-2 underline-offset-4">
              {r.text}
            </strong>
          ) : (
            <span key={i}>{r.text}</span>
          ),
        )}
      </bdi>
    );
  }

  const entry = glossary.get(parsed.term);
  if (!entry) return <span>{parsed.term}</span>;
  const { label, german } = glossLabel(entry, locale);
  const dot = GENDER_DOT[parsed.term];
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5">
      {dot && <span aria-hidden="true" className={"inline-block h-3 w-3 shrink-0 rounded-full " + dot} />}
      <span>{label}</span>
      {german && (
        <bdi dir="ltr" lang="de" className="text-xs font-semibold text-text-muted">
          ({german})
        </bdi>
      )}
    </span>
  );
}

/** Rounded, scrollable table. The first column is a row header. */
export default function GrammarTable({
  table,
  glossary,
  locale,
  caption,
}: {
  table: GrammarTableData;
  glossary: readonly GlossaryEntry[];
  locale: Locale;
  caption: string;
}) {
  const map = glossaryMap(glossary);
  const scroller = useRef<HTMLDivElement>(null);
  // Which logical edges have more content beyond them. Both false on the server: the fades are overlays, so showing
  // them after mount never moves anything.
  const [more, setMore] = useState({ start: false, end: false });

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const update = () => {
      // In RTL, scrollLeft runs from 0 to negative values; its magnitude is the distance from the start edge.
      const fromStart = Math.abs(el.scrollLeft);
      const start = fromStart > 1;
      const end = fromStart + el.clientWidth < el.scrollWidth - 1;
      setMore((m) => (m.start === start && m.end === end ? m : { start, end }));
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, []);

  const fade = "pointer-events-none absolute inset-y-0 w-10 from-surface to-transparent transition-opacity duration-150 ";
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border bg-surface shadow-soft">
      <div
        ref={scroller}
        className="overflow-x-auto rounded-3xl focus-visible:ring-4 focus-visible:ring-inset focus-visible:ring-primary/30 focus-visible:outline-none"
        tabIndex={0}
        role="region"
        aria-label={caption}
      >
        <table className="w-full border-collapse text-start">
          <caption className="sr-only">{caption}</caption>
          <thead>
            <tr>
              {table.headers.map((h, i) => {
                const term = parseCell(h);
                const tone = term.kind === "gloss" ? TERM_TONE[term.term] : undefined;
                return (
                  <th
                    key={i}
                    scope="col"
                    className={
                      "whitespace-nowrap border-b border-border px-4 py-3 text-start text-sm font-extrabold " +
                      (tone ? `border-b-4 ${tone}` : "bg-surface-2")
                    }
                  >
                    <Cell cell={h} glossary={map} locale={locale} />
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((row, r) => (
              <tr key={r} className="border-t border-border first:border-t-0">
                {row.map((cell, c) => {
                  const parsed = parseCell(cell);
                  const tone = c === 0 && parsed.kind === "gloss" ? TERM_TONE[parsed.term] : undefined;
                  return c === 0 ? (
                    <th
                      key={c}
                      scope="row"
                      className={"whitespace-nowrap px-4 py-3 text-start text-sm font-extrabold " + (tone ? `border-s-4 ${tone}` : "bg-surface-2")}
                    >
                      <Cell cell={cell} glossary={map} locale={locale} />
                    </th>
                  ) : (
                    <td key={c} className="px-4 py-3 text-start font-semibold">
                      <Cell cell={cell} glossary={map} locale={locale} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Scroll cue: a fade on each logical edge that hides more columns. start-0/end-0 flip in RTL. */}
      <div
        aria-hidden="true"
        data-fade="start"
        data-visible={more.start ? "" : undefined}
        className={fade + "start-0 bg-gradient-to-r rtl:bg-gradient-to-l " + (more.start ? "opacity-100" : "opacity-0")}
      />
      <div
        aria-hidden="true"
        data-fade="end"
        data-visible={more.end ? "" : undefined}
        className={fade + "end-0 bg-gradient-to-l rtl:bg-gradient-to-r " + (more.end ? "opacity-100" : "opacity-0")}
      />
    </div>
  );
}
