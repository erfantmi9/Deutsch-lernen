"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { buildRolePlayChoices } from "@/lib/rolePlay";
import { useDialogueStore } from "@/stores/dialogueStore";
import type { DialogueLine } from "@/types/dialogue";
import Mascot from "./illustrations/Mascot";
import SpeakerAvatar from "./SpeakerAvatar";
import StickyActionBar from "./ui/StickyActionBar";

type Locale = "en" | "fa" | "de";

interface Round {
  role: string;
  choices: Record<number, string[]>;
  /** Indices of the lines the learner has to answer. */
  mine: number[];
}

/**
 * The learner plays one speaker: the other speaker's lines appear by themselves,
 * and at every own line the right reply must be picked out of three.
 *
 * Layout: the chat scrolls; the reply choices sit in a sticky panel right above the StickyActionBar (Continue), and
 * every new line is scrolled into view above that panel. The bar status is the screen's single live region.
 */
export default function RolePlay({
  dialogueId,
  lines,
  speakers,
  pool,
}: {
  dialogueId: string;
  lines: DialogueLine[];
  speakers: string[];
  pool: string[];
}) {
  const t = useTranslations("Dialogues.roleplay");
  const locale = useLocale() as Locale;
  const translationLocale = locale === "de" ? "en" : locale;
  const recordRolePlay = useDialogueStore((s) => s.recordRolePlay);

  const [round, setRound] = useState<Round | null>(null);
  const [step, setStep] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  // Same-tick double click / double Enter guard (state updates are async, a ref is not).
  const answered = useRef(false);
  const chatRef = useRef<HTMLOListElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const actionRef = useRef<HTMLButtonElement>(null);
  const choicesRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLHeadingElement>(null);
  const focusAfter = useRef<"action" | "choice" | "summary" | null>(null);

  const speakerIndex = (name: string): 0 | 1 => (speakers.indexOf(name) === 1 ? 1 : 0);

  const start = (role: string) => {
    setRound({
      role,
      choices: buildRolePlayChoices(lines, role, pool, Math.random),
      mine: lines.flatMap((l, i) => (l.speaker === role ? [i] : [])),
    });
    setStep(0);
    setPicked(null);
    setCorrectCount(0);
    answered.current = false;
    focusAfter.current = "choice";
  };

  const done = round ? step >= round.mine.length : false;
  const current = !round ? 0 : done ? lines.length : round.mine[step];
  const visible = !round ? [] : done ? lines : lines.slice(0, picked ? current + 1 : current);

  // Keep the newest line visible above the sticky choices panel (or the bar once the panel is gone).
  const keepNewestVisible = useCallback(() => {
    const last = chatRef.current?.lastElementChild as HTMLElement | null;
    if (!last) return;
    const r = last.getBoundingClientRect();
    const headerBottom = document.querySelector("header")?.getBoundingClientRect().bottom ?? 0;
    const chromeTops = [...document.querySelectorAll("[data-bottom-chrome]")]
      .filter((c) => getComputedStyle(c).display !== "none")
      .map((c) => c.getBoundingClientRect().top);
    const limit = Math.min(window.innerHeight, panelRef.current?.getBoundingClientRect().top ?? Infinity, ...chromeTops) - 8;
    let dy = 0;
    if (r.bottom > limit) dy = r.bottom - limit;
    // Never push the line's top under the header (very tall line on a tiny screen: show its start).
    if (r.top - dy < headerBottom + 8) dy = r.top - headerBottom - 8;
    if (dy > 0) window.scrollBy({ top: dy, behavior: "instant" });
  }, []);

  useLayoutEffect(() => {
    if (round) keepNewestVisible();
  }, [visible.length, round, keepNewestVisible]);

  // The bar grows when its status wraps (a long "the right reply is ..."), which lifts the panel a frame later.
  useEffect(() => {
    const barEl = document.querySelector("[data-action-button]")?.parentElement;
    if (!round || !barEl) return;
    let frame = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(keepNewestVisible);
    });
    ro.observe(barEl);
    return () => {
      ro.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [round, keepNewestVisible]);

  useEffect(() => {
    const what = focusAfter.current;
    focusAfter.current = null;
    if (what === "action") actionRef.current?.focus({ preventScroll: true });
    if (what === "choice") choicesRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
    if (what === "summary") summaryRef.current?.focus({ preventScroll: true });
  });

  if (!round) {
    return (
      <section aria-labelledby="rp-title" className="card space-y-4 p-5 sm:p-6">
        <h3 id="rp-title" className="text-xl font-extrabold">
          {t("title")}
        </h3>
        <p className="text-text-muted">{t("intro")}</p>
        <div role="group" aria-label={t("chooseRole")} className="grid gap-3 sm:grid-cols-2">
          {speakers.map((name) => (
            <button key={name} type="button" onClick={() => start(name)} className="pill min-h-16 justify-start gap-3 py-2 text-base text-text">
              <SpeakerAvatar index={speakerIndex(name)} />
              <span>{t("playAs", { name })}</span>
            </button>
          ))}
        </div>
      </section>
    );
  }

  const choices = done ? [] : round.choices[current];
  const wasRight = picked !== null && picked === lines[current]?.de;

  const choose = (choice: string) => {
    if (answered.current || picked !== null) return;
    answered.current = true;
    setPicked(choice);
    if (choice === lines[current].de) setCorrectCount((n) => n + 1);
    focusAfter.current = "action";
  };

  const next = () => {
    if (!answered.current) return;
    answered.current = false;
    const finished = step + 1 >= round.mine.length;
    if (finished) recordRolePlay(dialogueId);
    setStep(step + 1);
    setPicked(null);
    focusAfter.current = finished ? "summary" : "choice";
  };

  const otherRole = speakers.find((s) => s !== round.role) ?? round.role;

  const status = done
    ? t("summary", { correct: correctCount, total: round.mine.length })
    : picked === null
      ? t("yourTurn")
      : wasRight
        ? `✓ ${t("correct")}`
        : `✗ ${t("wrong")} ${lines[current].de}`;

  return (
    <section aria-labelledby="rp-title" className="space-y-4">
      <h3 id="rp-title" className="text-xl font-extrabold">
        {t("title")}: {t("playAs", { name: round.role })}
      </h3>

      <ol ref={chatRef} className="flex flex-col gap-3">
        {visible.map((line, i) => {
          const idx = speakerIndex(line.speaker);
          const mine = line.speaker === round.role;
          return (
            <li key={i} data-line className={"flex max-w-[92%] gap-3 " + (idx === 0 ? "self-start" : "flex-row-reverse self-end")}>
              <SpeakerAvatar index={idx} size={40} />
              <div
                className={
                  "space-y-1 rounded-3xl border px-4 py-3 shadow-soft " +
                  (mine ? "border-primary bg-primary-soft" : "border-border bg-surface")
                }
              >
                <p className="eyebrow">{line.speaker}</p>
                <p dir="ltr" lang="de" className="text-lg font-bold leading-relaxed">
                  {line.de}
                </p>
                <p lang={translationLocale} className="text-sm text-text-muted">
                  {line[translationLocale]}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      {!done && (
        <div
          ref={panelRef}
          data-choices-panel
          className="sticky bottom-[calc(var(--bottom-chrome-h)+0.5rem)] z-30 rounded-3xl border border-border bg-surface/95 p-3 shadow-lift backdrop-blur"
        >
          <div ref={choicesRef} role="group" aria-label={t("pickReply")} className="grid gap-2">
            {choices.map((c) => {
              const isAnswer = picked !== null && c === lines[current].de;
              const isWrongPick = picked !== null && c === picked && !wasRight;
              return (
                <button
                  key={c}
                  type="button"
                  aria-disabled={picked !== null}
                  onClick={() => choose(c)}
                  className={
                    "pill min-h-11 justify-start whitespace-normal py-1.5 text-start text-sm text-text aria-disabled:cursor-default sm:text-base " +
                    (isAnswer
                      ? "border-success bg-success-soft text-success"
                      : isWrongPick
                        ? "border-danger bg-danger-soft text-danger"
                        : picked !== null
                          ? "opacity-60"
                          : "")
                  }
                >
                  <bdi dir="ltr" lang="de">
                    {c}
                  </bdi>
                  {isAnswer && <span aria-hidden="true"> ✓</span>}
                  {isWrongPick && <span aria-hidden="true"> ✗</span>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {done && (
        <div className="card-hero space-y-3 p-6 text-center">
          <Mascot mood={correctCount >= round.mine.length - 1 ? "cheering" : "thinking"} size={100} className="mx-auto" />
          <h4 ref={summaryRef} tabIndex={-1} className="text-2xl font-extrabold outline-none">
            {t("done")}
          </h4>
          <p>{t("summary", { correct: correctCount, total: round.mine.length })}</p>
        </div>
      )}

      <StickyActionBar
        ref={actionRef}
        label={
          done ? (
            t("again")
          ) : (
            <>
              {t("next")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
            </>
          )
        }
        disabled={!done && picked === null}
        onAction={done ? () => start(round.role) : next}
        status={status}
        statusTone={done || picked === null ? "hint" : wasRight ? "success" : "danger"}
        secondary={
          <button type="button" disabled={!done} onClick={() => start(otherRole)} className="btn btn-secondary shrink-0">
            {t("otherRole")}
          </button>
        }
      />
    </section>
  );
}
