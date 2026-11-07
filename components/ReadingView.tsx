"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Ref } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { highlightSegments } from "@/lib/grammarText";
import { allTasksAnswered, checkTask, isAnswered, pairResults, scoreTasks } from "@/lib/readingLogic";
import type { TaskResponse } from "@/lib/readingLogic";
import { seededShuffle } from "@/lib/shuffle";
import { useReadingStore } from "@/stores/readingStore";
import type { MatchingTask, ReadingTask, ReadingText } from "@/types/reading";
import type { I18n3 } from "@/types/common";
import PageHeader from "./PageHeader";
import Mascot from "./illustrations/Mascot";
import ReadingKindIcon from "./illustrations/ReadingKindIcon";
import SpeakButton from "./SpeakButton";
import ResponsiveSheet from "./ui/ResponsiveSheet";
import StickyActionBar from "./ui/StickyActionBar";
import { scrollAndFocus } from "./DialogueQuiz";

type Locale = "en" | "fa" | "de";

export interface ReadingLink {
  id: string;
  title: I18n3;
}

const stateClass = (checked: boolean, isAnswer: boolean, isWrongPick: boolean): string =>
  isAnswer
    ? "border-success bg-success-soft text-success"
    : isWrongPick
      ? "border-danger bg-danger-soft text-danger"
      : checked
        ? "opacity-60"
        : "";

function Verdict({ ok }: { ok: boolean }) {
  const t = useTranslations("Reading");
  return (
    <p className={"text-sm font-extrabold " + (ok ? "text-success" : "text-danger")}>
      {ok ? `✓ ${t("correct")}` : `✗ ${t("wrong")}`}
    </p>
  );
}

function MatchingInputs({
  task,
  response,
  checked,
  reserve,
  onChange,
}: {
  task: MatchingTask;
  response: Record<number, string>;
  checked: boolean;
  reserve: boolean;
  onChange: (next: Record<number, string>) => void;
}) {
  const t = useTranslations("Reading");
  const options = useMemo(() => seededShuffle(task.options, task.id), [task]);
  const results = pairResults(task, response);

  return (
    <ul className="space-y-3">
      {task.pairs.map((pair, i) => (
        <li key={pair.item} className="flex flex-wrap items-center gap-3">
          <bdi dir="ltr" lang="de" className="min-w-[8rem] flex-1 font-bold">
            {pair.item}
          </bdi>
          <select
            aria-label={t("answerFor", { item: pair.item })}
            value={response[i] ?? ""}
            disabled={checked}
            onChange={(e) => onChange({ ...response, [i]: e.target.value })}
            dir="ltr"
            lang="de"
            className={
              "min-h-11 min-w-[10rem] flex-1 rounded-full border-2 bg-surface px-4 py-2 font-semibold text-text outline-none focus-visible:ring-4 focus-visible:ring-primary/30 " +
              (checked ? (results[i] ? "border-success" : "border-danger") : "border-border focus-visible:border-primary")
            }
          >
            <option value="">{t("choose")}</option>
            {options.map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
          {(checked || reserve) && (
            <span data-verdict className={"min-h-5 basis-full text-sm font-extrabold leading-5 " + (results[i] ? "text-success" : "text-danger")}>
              {checked && (
                <>
              {results[i] ? `✓ ${t("correct")}` : `✗ ${t("wrong")}`}
              {!results[i] && (
                <>
                  {" · "}
                  <bdi dir="ltr" lang="de" className="text-text">
                    {pair.answer}
                  </bdi>
                </>
              )}
                </>
              )}
            </span>
          )}
        </li>
      ))}
    </ul>
  );
}

export function TaskCard({
  task,
  index,
  response,
  checked,
  locale,
  onChange,
  reserveVerdict = false,
  ref,
}: {
  task: ReadingTask;
  index: number;
  response: TaskResponse;
  checked: boolean;
  locale: Locale;
  onChange: (value: TaskResponse) => void;
  /** Keep the verdict lines' height reserved before checking, so the result never moves the tasks below. */
  reserveVerdict?: boolean;
  ref?: Ref<HTMLFieldSetElement>;
}) {
  const t = useTranslations("Reading");
  const choiceOptions = useMemo(
    () => (task.type === "choice" ? seededShuffle(task.options, task.id) : []),
    [task],
  );
  const ok = checkTask(task, response);

  return (
    <fieldset ref={ref} data-task={index + 1} className="card min-w-0 space-y-3 p-5">
      <legend className="sr-only">{t("taskNumber", { n: index + 1 })}</legend>
      <p className="eyebrow">{t("taskNumber", { n: index + 1 })}</p>

      {task.type === "true-false" && (
        <>
          <p className="text-sm text-text-muted">{t("instruction.trueFalse")}</p>
          <p dir="ltr" lang="de" className="text-lg font-extrabold">
            {task.statement}
          </p>
          <div role="group" aria-label={task.statement} className="grid grid-cols-2 gap-3">
            {([true, false] as const).map((v) => (
              <button
                key={String(v)}
                type="button"
                aria-pressed={response === v}
                aria-disabled={checked}
                onClick={() => !checked && onChange(v)}
                className={"pill min-h-12 justify-center aria-disabled:cursor-default " + stateClass(checked, checked && task.answer === v, checked && response === v && !ok)}
              >
                {v ? t("true") : t("false")}
                {checked && task.answer === v && <span aria-hidden="true"> ✓</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {task.type === "choice" && (
        <>
          <p className="text-sm text-text-muted">{t("instruction.choice")}</p>
          <p dir="ltr" lang="de" className="text-lg font-extrabold">
            {task.question}
          </p>
          <div role="group" aria-label={task.question} className="grid gap-2 sm:grid-cols-3">
            {choiceOptions.map((opt) => (
              <button
                key={opt}
                type="button"
                aria-pressed={response === opt}
                aria-disabled={checked}
                onClick={() => !checked && onChange(opt)}
                className={
                  "pill min-h-12 justify-center whitespace-normal py-2 text-center aria-disabled:cursor-default " +
                  stateClass(checked, checked && opt === task.answer, checked && response === opt && !ok)
                }
              >
                <bdi dir="ltr" lang="de">
                  {opt}
                </bdi>
                {checked && opt === task.answer && <span aria-hidden="true"> ✓</span>}
              </button>
            ))}
          </div>
        </>
      )}

      {task.type === "matching" && (
        <>
          <p className="text-sm text-text-muted">{task.prompt[locale]}</p>
          <MatchingInputs
            task={task}
            response={typeof response === "object" && response !== null ? response : {}}
            checked={checked}
            reserve={reserveVerdict}
            onChange={onChange}
          />
        </>
      )}

      {(checked || reserveVerdict) && task.type !== "matching" && (
        <div data-verdict className="min-h-10 space-y-0 leading-5">
          {checked && <Verdict ok={ok} />}
          {checked && !ok && (
            <p className="line-clamp-1 text-sm">
              {t("correctAnswer")}{" "}
              <bdi dir="ltr" lang="de" className="font-extrabold">
                {task.type === "true-false" ? (task.answer ? t("true") : t("false")) : task.answer}
              </bdi>
            </p>
          )}
        </div>
      )}
    </fieldset>
  );
}

/**
 * One reading text with its four tasks. Three right tasks complete the text.
 *
 * - Compact header at every size: the page's job is answering.
 * - lg: text and tasks side by side, the text column sticky (scrolls on its own when taller than the viewport).
 * - The translation opens in a ResponsiveSheet (bottom sheet on phones, side panel from md).
 * - Check / Try again live in the StickyActionBar; its status ("2/4 answered · Missing: 3") and then the score is the
 *   single live region. After checking the result heading is focused; Try again focuses the first task.
 * - Verdict lines and the evidence hint are reserved up front, so checking never moves anything.
 */
export default function ReadingView({
  text,
  prev,
  next,
}: {
  text: ReadingText;
  prev: ReadingLink | null;
  next: ReadingLink | null;
}) {
  const t = useTranslations("Reading");
  const locale = useLocale() as Locale;
  const translationLocale = locale === "de" ? "en" : locale;
  const recordResult = useReadingStore((s) => s.recordResult);

  const [showTranslation, setShowTranslation] = useState(false);
  const [responses, setResponses] = useState<TaskResponse[]>(() => text.tasks.map(() => null));
  const [checked, setChecked] = useState(false);
  const firstTaskRef = useRef<HTMLFieldSetElement>(null);
  const resultRef = useRef<HTMLHeadingElement>(null);
  const pendingFocus = useRef<"result" | "first" | null>(null);

  const score = scoreTasks(text.tasks, responses);
  const complete = allTasksAnswered(text.tasks, responses);
  const missing = text.tasks.flatMap((task, i) => (isAnswered(task, responses[i]) ? [] : [String(i + 1)]));

  // After checking, every evidence passage is marked in the text.
  const evidence = text.tasks.flatMap((t) => (t.type === "matching" ? [] : [t.evidence]));
  const segments = highlightSegments(text.text, checked ? evidence : undefined);

  useEffect(() => {
    const what = pendingFocus.current;
    pendingFocus.current = null;
    if (what === "result") scrollAndFocus(resultRef.current);
    if (what === "first") scrollAndFocus(firstTaskRef.current);
  });

  const check = () => {
    if (!complete || checked) return;
    setChecked(true);
    recordResult(text.id, score.correct);
    pendingFocus.current = "result";
  };

  const retry = () => {
    setResponses(text.tasks.map(() => null));
    setChecked(false);
    pendingFocus.current = "first";
  };

  const status = checked
    ? `${t("score", { correct: score.correct, total: score.total })} ${score.passed ? t("passed") : t("notPassed")}`
    : t("answered", { answered: text.tasks.length - missing.length, total: text.tasks.length }) +
      (missing.length > 0 ? ` · ${t("missing", { items: missing.join(", ") })}` : "");

  return (
    <div className="space-y-6">
      <Link href="/reading" className="btn-ghost">
        <span aria-hidden="true" className="me-1 rtl:-scale-x-100">←</span> {t("back")}
      </Link>

      <PageHeader compact="always" title={text.title[locale]} />

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <section
          aria-labelledby="text-title"
          data-reading-text
          className="card space-y-4 p-5 sm:p-6 lg:sticky lg:top-[calc(var(--header-h)+1rem)] lg:max-h-[calc(100dvh-var(--header-h)-2rem)] lg:overflow-y-auto"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div aria-hidden="true" className="w-10 shrink-0">
                <ReadingKindIcon kind={text.kind} size="100%" />
              </div>
              <div>
                <h2 id="text-title" className="text-xl font-extrabold">
                  {t("text")}
                </h2>
                <p className="text-sm text-text-muted">{t(`kinds.${text.kind}`)}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SpeakButton text={text.text} />
              <button type="button" aria-haspopup="dialog" onClick={() => setShowTranslation(true)} className="pill">
                {t("showTranslation")}
              </button>
            </div>
          </div>
          <p dir="ltr" lang="de" className="whitespace-pre-line rounded-2xl bg-surface-2 p-4 text-lg leading-relaxed">
            {segments.map((seg, i) =>
              seg.highlight ? (
                // Same weight and no padding as plain text: marking the evidence never reflows the text.
                <mark key={i} className="rounded-sm bg-primary-soft text-primary underline decoration-2 underline-offset-4">
                  {seg.text}
                </mark>
              ) : (
                <span key={i}>{seg.text}</span>
              ),
            )}
          </p>
          <p className={"min-h-5 text-sm text-text-muted " + (checked ? "" : "invisible")}>{t("evidence")}</p>
        </section>

        <section aria-labelledby="tasks-title" className="min-w-0 space-y-4">
          <h2 id="tasks-title" className="text-xl font-extrabold">
            {t("tasksTitle")}
          </h2>
          {text.tasks.map((task, i) => (
            <TaskCard
              key={task.id}
              ref={i === 0 ? firstTaskRef : undefined}
              task={task}
              index={i}
              response={responses[i]}
              checked={checked}
              locale={locale}
              reserveVerdict
              onChange={(value) => setResponses((r) => r.map((v, j) => (j === i ? value : v)))}
            />
          ))}

          {checked && (
            <div className={"flex items-center gap-4 " + (score.passed ? "feedback-success" : "feedback-error")}>
              <Mascot mood={score.passed ? "cheering" : "thinking"} size={80} className="shrink-0" />
              <div className="space-y-2">
                <h3 ref={resultRef} tabIndex={-1} data-reading-result className="font-extrabold outline-none">
                  {t("result")}: {t("score", { correct: score.correct, total: score.total })}
                </h3>
                <p>{score.passed ? t("passed") : t("notPassed")}</p>
              </div>
            </div>
          )}
        </section>
      </div>

      <StickyActionBar
        label={checked ? t("retry") : t("check")}
        disabled={!checked && !complete}
        onAction={checked ? retry : check}
        status={status}
        statusTone={checked ? (score.passed ? "success" : "danger") : "hint"}
      />

      <ResponsiveSheet open={showTranslation} onClose={() => setShowTranslation(false)} title={t("translation")}>
        <p lang={translationLocale} className="whitespace-pre-line leading-relaxed">
          {text.translation[translationLocale]}
        </p>
      </ResponsiveSheet>

      <nav aria-label={t("listLabel")} className="flex flex-wrap items-center justify-between gap-3">
        {prev ? (
          <Link href={`/reading/${prev.id}`} className="btn btn-secondary">
            <span aria-hidden="true" className="rtl:-scale-x-100">←</span> {t("prev")}: {prev.title[locale]}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link href={`/reading/${next.id}`} className="btn btn-secondary">
            {t("next")}: {next.title[locale]} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
          </Link>
        )}
      </nav>
    </div>
  );
}
