"use client";

import { useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { highlightSegments } from "@/lib/grammarText";
import { allTasksAnswered, checkTask, pairResults, scoreTasks } from "@/lib/readingLogic";
import type { TaskResponse } from "@/lib/readingLogic";
import { seededShuffle } from "@/lib/shuffle";
import { useReadingStore } from "@/stores/readingStore";
import type { MatchingTask, ReadingTask, ReadingText } from "@/types/reading";
import type { I18n3 } from "@/types/common";
import PageHeader from "./PageHeader";
import Mascot from "./illustrations/Mascot";
import ReadingKindIcon from "./illustrations/ReadingKindIcon";
import SpeakButton from "./SpeakButton";

type Locale = "en" | "fa" | "de";

export interface ReadingLink {
  id: string;
  title: I18n3;
}

const stateClass = (checked: boolean, isAnswer: boolean, isWrongPick: boolean): string =>
  isAnswer
    ? "border-success bg-success-soft text-success disabled:opacity-100"
    : isWrongPick
      ? "border-danger bg-danger-soft text-danger disabled:opacity-100"
      : checked
        ? "disabled:opacity-60"
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
  onChange,
}: {
  task: MatchingTask;
  response: Record<number, string>;
  checked: boolean;
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
          {checked && (
            <span className={"text-sm font-extrabold " + (results[i] ? "text-success" : "text-danger")}>
              {results[i] ? `✓ ${t("correct")}` : `✗ ${t("wrong")}`}
              {!results[i] && (
                <>
                  {" · "}
                  <bdi dir="ltr" lang="de" className="text-text">
                    {pair.answer}
                  </bdi>
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
}: {
  task: ReadingTask;
  index: number;
  response: TaskResponse;
  checked: boolean;
  locale: Locale;
  onChange: (value: TaskResponse) => void;
}) {
  const t = useTranslations("Reading");
  const choiceOptions = useMemo(
    () => (task.type === "choice" ? seededShuffle(task.options, task.id) : []),
    [task],
  );
  const ok = checkTask(task, response);

  return (
    <fieldset className="card min-w-0 space-y-3 p-5">
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
                disabled={checked}
                onClick={() => onChange(v)}
                className={"pill min-h-12 justify-center disabled:cursor-default " + stateClass(checked, checked && task.answer === v, checked && response === v && !ok)}
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
                disabled={checked}
                onClick={() => onChange(opt)}
                className={
                  "pill min-h-12 justify-center whitespace-normal py-2 text-center disabled:cursor-default " +
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
            onChange={onChange}
          />
        </>
      )}

      {checked && task.type !== "matching" && (
        <div className="space-y-1">
          <Verdict ok={ok} />
          {!ok && (
            <p className="text-sm">
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

/** One reading text with its translation toggle and the four tasks. Three right tasks complete the text. */
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

  const score = scoreTasks(text.tasks, responses);
  const complete = allTasksAnswered(text.tasks, responses);

  // After checking, every evidence passage is marked in the text.
  const evidence = text.tasks.flatMap((t) => (t.type === "matching" ? [] : [t.evidence]));
  const segments = highlightSegments(text.text, checked ? evidence : undefined);

  const check = () => {
    if (!complete) return;
    setChecked(true);
    recordResult(text.id, score.correct);
  };

  const retry = () => {
    setResponses(text.tasks.map(() => null));
    setChecked(false);
  };

  return (
    <div className="space-y-6">
      <Link href="/reading" className="btn-ghost">
        <span aria-hidden="true" className="me-1 rtl:-scale-x-100">←</span> {t("back")}
      </Link>

      <PageHeader
        title={text.title[locale]}
        subtitle={t(`kinds.${text.kind}`)}
        illustration={
          <div className="mx-auto w-20 sm:w-28">
            <ReadingKindIcon kind={text.kind} size="100%" />
          </div>
        }
      />

      <section aria-labelledby="text-title" className="card space-y-4 p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="text-title" className="text-xl font-extrabold">
            {t("text")}
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <SpeakButton text={text.text} />
            <button type="button" aria-pressed={showTranslation} onClick={() => setShowTranslation((v) => !v)} className="pill">
              {showTranslation ? t("hideTranslation") : t("showTranslation")}
            </button>
          </div>
        </div>
        <p dir="ltr" lang="de" className="whitespace-pre-line rounded-2xl bg-surface-2 p-4 text-lg leading-relaxed">
          {segments.map((seg, i) =>
            seg.highlight ? (
              <mark key={i} className="rounded-md bg-primary-soft px-0.5 font-extrabold text-primary">
                {seg.text}
              </mark>
            ) : (
              <span key={i}>{seg.text}</span>
            ),
          )}
        </p>
        {checked && <p className="text-sm text-text-muted">{t("evidence")}</p>}
        {showTranslation && (
          <div className="space-y-1">
            <p className="eyebrow">{t("translation")}</p>
            <p lang={translationLocale} className="whitespace-pre-line leading-relaxed text-text-muted">
              {text.translation[translationLocale]}
            </p>
          </div>
        )}
      </section>

      <section aria-labelledby="tasks-title" className="space-y-4">
        <h2 id="tasks-title" className="text-xl font-extrabold">
          {t("tasksTitle")}
        </h2>
        {text.tasks.map((task, i) => (
          <TaskCard
            key={task.id}
            task={task}
            index={i}
            response={responses[i]}
            checked={checked}
            locale={locale}
            onChange={(value) => setResponses((r) => r.map((v, j) => (j === i ? value : v)))}
          />
        ))}

        {!checked ? (
          <div className="space-y-2">
            <button type="button" onClick={check} disabled={!complete} className="btn btn-primary w-full py-3 text-lg">
              {t("check")}
            </button>
            {!complete && <p className="text-center text-sm text-text-muted">{t("answerAll")}</p>}
          </div>
        ) : (
          <div role="status" className={"flex items-center gap-4 " + (score.passed ? "feedback-success" : "feedback-error")}>
            <Mascot mood={score.passed ? "cheering" : "thinking"} size={80} className="shrink-0" />
            <div className="space-y-2">
              <p className="font-extrabold">{t("score", { correct: score.correct, total: score.total })}</p>
              <p>{score.passed ? t("passed") : t("notPassed")}</p>
              <button type="button" onClick={retry} className="btn btn-secondary">
                {t("retry")}
              </button>
            </div>
          </div>
        )}
      </section>

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
