"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  DndContext,
  MouseSensor,
  TouchSensor,
  closestCenter,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  addToAnswer,
  checkOrder,
  initialBoard,
  moveInAnswer,
  removeFromAnswer,
  reorderAnswer,
} from "@/lib/sentenceBoard";
import type { Board, Chip, OrderCheck } from "@/lib/sentenceBoard";
import type { SentenceExercise } from "@/types/sentence";
import RoleLegend from "./RoleLegend";
import { ROLE_STYLE } from "./roleStyles";
import ResponsiveSheet from "./ui/ResponsiveSheet";
import StickyActionBar from "./ui/StickyActionBar";

type ChipStatus = "wrong" | "ok" | null;

interface Props {
  exercise: SentenceExercise;
  /** Called on every check. `firstAttempt` is true only for the first check of this exercise. */
  onResult: (correct: boolean, firstAttempt: boolean) => void;
  onNext: () => void;
}

// No `touch-none`: a finger that starts on a word must still be able to scroll the page. Dragging on touch needs a
// press-and-hold (see the TouchSensor below); tapping is the primary way to place a word.
const BASE_CHIP =
  "relative block h-11 whitespace-nowrap touch-manipulation select-none [-webkit-touch-callout:none] rounded-2xl border-2 px-3 py-2 text-start shadow-soft outline-none transition hover:shadow-lift focus-visible:ring-4 focus-visible:ring-primary/40";

function chipClasses(chip: Chip, showRole: boolean, status: ChipStatus): string {
  const tone =
    status === "wrong"
      ? "border-danger bg-danger-soft text-text ring-2 ring-danger/70"
      : showRole && chip.role
        ? ROLE_STYLE[chip.role]
        : "border-border bg-surface text-text";
  return `${BASE_CHIP} ${tone}` + (status === "ok" ? " ring-2 ring-success/60" : "");
}

/**
 * The word, plus overlays that never change the chip's size (so nothing shifts under a finger when parts are
 * coloured or an answer is checked): the part-of-speech badge (12px) sits on the top-start corner, the right/wrong
 * marker on the top-end corner.
 */
function ChipBody({
  chip,
  showRole,
  status,
  roleLabel,
  statusLabel,
}: {
  chip: Chip;
  showRole: boolean;
  status: ChipStatus;
  roleLabel: string;
  statusLabel: string;
}) {
  return (
    <>
      <span className="block text-lg font-semibold leading-6">{chip.text}</span>
      {showRole && chip.role && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -top-2.5 start-2 rounded-full border border-border bg-surface px-1.5 text-xs font-extrabold uppercase leading-4 tracking-wide text-text"
        >
          {roleLabel}
        </span>
      )}
      {status && (
        <span
          aria-hidden="true"
          className={
            "pointer-events-none absolute -top-2 -end-2 flex size-5 items-center justify-center rounded-full text-xs font-extrabold text-on-primary " +
            (status === "wrong" ? "bg-danger" : "bg-success")
          }
        >
          {status === "wrong" ? "✗" : "✓"}
        </span>
      )}
      {showRole && chip.role && <span className="sr-only"> ({roleLabel})</span>}
      {statusLabel && <span className="sr-only"> ({statusLabel})</span>}
    </>
  );
}

function BankChip({
  chip,
  showRole,
  roleLabel,
  label,
  disabled,
  onAdd,
}: {
  chip: Chip;
  showRole: boolean;
  roleLabel: string;
  label: string;
  disabled: boolean;
  onAdd: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: chip.id, disabled });
  return (
    <li
      ref={setNodeRef}
      data-chip
      style={{ transform: CSS.Translate.toString(transform), zIndex: isDragging ? 20 : undefined }}
      className={isDragging ? "opacity-80" : undefined}
    >
      <button
        type="button"
        id={`chip-${chip.id}`}
        {...attributes}
        {...listeners}
        aria-label={label}
        aria-roledescription={undefined}
        disabled={disabled}
        onClick={() => onAdd(chip.id)}
        className={chipClasses(chip, showRole, null) + " disabled:opacity-60"}
      >
        <ChipBody chip={chip} showRole={showRole} status={null} roleLabel={roleLabel} statusLabel="" />
      </button>
    </li>
  );
}

function AnswerChip({
  chip,
  showRole,
  status,
  roleLabel,
  statusLabel,
  label,
  disabled,
  onRemove,
  onMove,
}: {
  chip: Chip;
  showRole: boolean;
  status: ChipStatus;
  roleLabel: string;
  statusLabel: string;
  label: string;
  disabled: boolean;
  onRemove: (id: string) => void;
  onMove: (id: string, delta: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: chip.id,
    disabled,
  });

  // Direction-independent: the German line is always LTR, so arrows are literal.
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (disabled) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      onMove(chip.id, -1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      onMove(chip.id, 1);
    }
  };

  return (
    <li
      ref={setNodeRef}
      data-chip
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 20 : undefined }}
      className={isDragging ? "opacity-80" : undefined}
    >
      <button
        type="button"
        id={`chip-${chip.id}`}
        {...attributes}
        {...listeners}
        aria-label={label}
        aria-roledescription={undefined}
        disabled={disabled}
        onClick={() => onRemove(chip.id)}
        onKeyDown={onKeyDown}
        className={chipClasses(chip, showRole, status) + " disabled:cursor-default"}
      >
        <ChipBody chip={chip} showRole={showRole} status={status} roleLabel={roleLabel} statusLabel={statusLabel} />
      </button>
    </li>
  );
}

function DropZone({
  id,
  label,
  className,
  style,
  zone,
  children,
}: {
  id: string;
  label: string;
  className: string;
  style?: CSSProperties;
  zone: "answer" | "bank";
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      role="group"
      aria-label={label}
      data-zone={zone}
      style={style}
      className={className + (isOver ? " border-primary shadow-lift" : "")}
    >
      {children}
    </div>
  );
}

const ICON = "btn-ghost size-11 shrink-0 !px-0 text-xl disabled:opacity-40";

export default function SentenceBuilder({ exercise, onResult, onNext }: Props) {
  const t = useTranslations("Sentences");
  const locale = useLocale() as "en" | "fa" | "de";
  const uiDir = locale === "fa" ? "rtl" : "ltr";

  const [board, setBoard] = useState<Board>(() => initialBoard(exercise));
  const [result, setResult] = useState<OrderCheck | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const attempts = useRef(0);
  const actionRef = useRef<HTMLButtonElement>(null);
  // Synchronous guards (state is async): a double press can neither record a result twice nor leave the exercise twice.
  const solvedRef = useRef(false);
  const leavingRef = useRef(false);

  const solved = result?.correct === true;
  const hasRoles = Boolean(exercise.roles);

  // Tap/click is the primary way to place a word. Dragging is optional: a mouse drags after 8px, a finger only after
  // a 250ms press-and-hold, so an ordinary swipe that starts on a word still scrolls the page.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
  );

  // Reserve the height of both areas for the whole exercise (about 3 words per row on a phone), so words moving between
  // the word bank and the answer line never shift the targets below them.
  const chipCount = board.bank.length + board.answer.length;
  const rows = Math.max(1, Math.ceil(chipCount / 3));
  const zoneRows = { "--rows": rows } as CSSProperties; // .chip-zone turns this into a min-height (see globals.css)

  // Keep keyboard focus on the chip that was just moved (it re-mounts when it changes lists).
  useEffect(() => {
    if (!focusId) return;
    document.getElementById(`chip-${focusId}`)?.focus();
    setFocusId(null);
  }, [focusId, board]);

  // After a correct answer focus parks on the persistent button: Enter / Space goes to the next sentence.
  useEffect(() => {
    if (solved) actionRef.current?.focus({ preventScroll: true });
  }, [solved]);

  const update = (next: Board, focus: string | null) => {
    setBoard(next);
    setResult(null);
    setFocusId(focus);
  };

  const add = (id: string, index?: number) => {
    if (solved) return;
    const chip = board.bank.find((c) => c.id === id);
    if (!chip) return;
    update(addToAnswer(board, id, index), id);
  };

  const remove = (id: string) => {
    if (solved) return;
    const chip = board.answer.find((c) => c.id === id);
    if (!chip) return;
    update(removeFromAnswer(board, id), id);
  };

  const move = (id: string, delta: number) => {
    if (solved) return;
    const chip = board.answer.find((c) => c.id === id);
    if (!chip) return;
    update(moveInAnswer(board, id, delta), id);
  };

  const onDragEnd = (e: DragEndEvent) => {
    if (solved || !e.over) return;
    const activeId = String(e.active.id);
    const overId = String(e.over.id);
    const fromAnswer = board.answer.some((c) => c.id === activeId);
    const overIsAnswerChip = board.answer.some((c) => c.id === overId);
    const toAnswer = overId === "answer" || overIsAnswerChip;
    const toBank = overId === "bank" || board.bank.some((c) => c.id === overId);
    const overIndex = overIsAnswerChip ? board.answer.findIndex((c) => c.id === overId) : undefined;

    if (fromAnswer && toAnswer) {
      const to = overIndex ?? board.answer.length - 1;
      const next = reorderAnswer(board, activeId, to);
      const chip = board.answer.find((c) => c.id === activeId);
      if (chip && next !== board) update(next, activeId);
    } else if (!fromAnswer && toAnswer) {
      add(activeId, overIndex);
    } else if (fromAnswer && toBank) {
      remove(activeId);
    }
  };

  const check = () => {
    if (solvedRef.current || board.answer.length === 0) return;
    const res = checkOrder(
      board.answer.map((c) => c.text),
      exercise,
    );
    const first = attempts.current === 0;
    attempts.current += 1;
    setResult(res);
    if (res.correct) {
      solvedRef.current = true;
      setShowRoles(true);
    }
    onResult(res.correct, first);
  };

  const next = () => {
    if (!solvedRef.current || leavingRef.current) return;
    leavingRef.current = true;
    onNext();
  };

  const skip = () => {
    if (leavingRef.current) return;
    leavingRef.current = true;
    onNext();
  };

  const reset = () => {
    setBoard(initialBoard(exercise));
    setResult(null);
  };

  const statusOf = (index: number): ChipStatus => {
    if (!result) return null;
    if (result.correct) return "ok";
    return result.wrongPositions.includes(index) ? "wrong" : "ok";
  };

  const wrongCount = result && !result.correct ? result.wrongPositions.length : 0;
  const translation = exercise.translations[locale === "de" ? "en" : locale];
  const rolesInUse = exercise.roles ?? [];
  const wordsLeft = board.bank.filter((c) => !c.distractor).length;
  const sentence = board.answer.map((c) => c.text).join(" ");

  return (
    <section aria-labelledby="builder-title" className="space-y-3 short:space-y-2">
      {/* Task prompt: translation in the active locale */}
      <div className="card-hero flex items-start justify-between gap-3 p-3 sm:p-5">
        <div className="min-w-0">
          <p id="builder-title" className="eyebrow mb-0.5 short:sr-only">
            {locale === "de" ? t("promptDe") : t("prompt")}
          </p>
          <p className="text-xl font-extrabold sm:text-2xl">{translation}</p>
          <p className="mt-1 hidden text-sm text-text-muted sm:block short:hidden">{t("howTo")}</p>
        </div>
        {hasRoles && (
          // Always rendered, fixed size: toggling the part colours never moves anything.
          <button
            type="button"
            aria-pressed={showRoles}
            aria-label={t("partsToggle")}
            title={t("partsToggle")}
            onClick={() => setShowRoles((v) => !v)}
            className="pill size-11 shrink-0 justify-center !px-0 text-lg"
          >
            <span aria-hidden="true">🎨</span>
          </button>
        )}
      </div>

      <DndContext id="sentence-builder" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        {/* German area: ALWAYS LTR, even on /fa */}
        <div dir="ltr" lang="de" className="space-y-2.5">
          <DropZone
            id="answer"
            label={t("answerLine")}
            style={zoneRows}
            className="chip-zone relative rounded-3xl border-2 border-dashed border-border bg-surface-2 transition"
            zone="answer"
          >
            <SortableContext items={board.answer.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              <ul className="flex flex-wrap content-start items-center gap-2">
                {board.answer.map((chip, i) => {
                  const status = statusOf(i);
                  return (
                    <AnswerChip
                      key={chip.id}
                      chip={chip}
                      showRole={showRoles}
                      status={status}
                      roleLabel={chip.role ? t(`roles.${chip.role}`) : ""}
                      statusLabel={status === "wrong" ? t("wrongPosition") : status === "ok" ? t("rightPosition") : ""}
                      label={t("chipAnswer", { word: chip.text, pos: i + 1, total: board.answer.length })}
                      disabled={solved}
                      onRemove={remove}
                      onMove={move}
                    />
                  );
                })}
              </ul>
            </SortableContext>
            {board.answer.length === 0 && (
              <p
                dir={uiDir}
                className="pointer-events-none absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-text-muted"
              >
                {t("answerPlaceholder")}
              </p>
            )}
          </DropZone>

          <DropZone
            id="bank"
            label={t("wordBank")}
            style={zoneRows}
            className="chip-zone rounded-3xl border border-border bg-surface shadow-soft transition"
            zone="bank"
          >
            <ul className="flex flex-wrap content-start gap-2">
              {board.bank.map((chip) => (
                <BankChip
                  key={chip.id}
                  chip={chip}
                  showRole={showRoles}
                  roleLabel={chip.role ? t(`roles.${chip.role}`) : ""}
                  label={t("chipBank", { word: chip.text })}
                  disabled={solved}
                  onAdd={add}
                />
              ))}
            </ul>
          </DropZone>
        </div>
      </DndContext>

      {/*
        The verdict lives in the bar's status line, which is therefore this page's ONE live region (it also says how many
        words are left while building). No separate feedback box: at 375x667 an 8-word sentence needs every pixel for the
        answer line and the word bank. Wrong words are marked on the answer line itself; the hint and explanation are
        behind Details.
      */}
      <StickyActionBar
        ref={actionRef}
        label={
          solved ? (
            <>
              {t("next")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
            </>
          ) : (
            t("check")
          )
        }
        disabled={solved ? false : board.answer.length === 0}
        onAction={solved ? next : check}
        statusTone={result ? (result.correct ? "success" : "danger") : "hint"}
        status={
          result
            ? result.correct
              ? `✓ ${t("correct")} ${sentence}`
              : `✗ ${result.incomplete && wrongCount === 0 ? t("incomplete") : wrongCount > 0 ? t("wrongCount", { count: wrongCount }) : t("wrongOrder")}`
            : board.answer.length === 0
              ? t("tapToStart")
              : wordsLeft > 0
                ? t("wordsLeft", { count: wordsLeft })
                : null
        }
        secondary={
          // Always present (disabled instead of swapped out), so the bar never changes shape.
          <>
            <button type="button" onClick={reset} disabled={solved || board.answer.length === 0} aria-label={t("reset")} title={t("reset")} className={ICON}>
              <span aria-hidden="true">↺</span>
            </button>
            <button type="button" onClick={skip} disabled={solved} aria-label={t("skip")} title={t("skip")} className={ICON}>
              <span aria-hidden="true">⏭</span>
            </button>
            {/* Icon only on phones (the bar has no room); a visible short label from sm up. */}
            <button
              type="button"
              data-details
              onClick={() => setDetailsOpen(true)}
              disabled={!result}
              aria-haspopup="dialog"
              aria-label={t("details")}
              title={t("details")}
              className="btn-ghost inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1 !px-0 text-xl disabled:opacity-40 sm:!px-3"
            >
              <span aria-hidden="true">ⓘ</span>
              <span aria-hidden="true" className="hidden text-sm font-bold sm:inline">
                {t("detailsShort")}
              </span>
            </button>
          </>
        }
      />

      <ResponsiveSheet open={detailsOpen} onClose={() => setDetailsOpen(false)} title={t("details")}>
        <div className="space-y-4">
          {result && !result.correct && (
            <p className="feedback-hint">
              <span className="font-extrabold">{t("hint")}:</span> {exercise.hint[locale]}
            </p>
          )}
          <p className="leading-relaxed">{exercise.explanation[locale]}</p>
          {hasRoles && <RoleLegend roles={rolesInUse} />}
        </div>
      </ResponsiveSheet>
    </section>
  );
}
