"use client";

import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import {
  DndContext,
  PointerSensor,
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
import Mascot from "./illustrations/Mascot";

type ChipStatus = "wrong" | "ok" | null;

interface Props {
  exercise: SentenceExercise;
  /** Called on every check. `firstAttempt` is true only for the first check of this exercise. */
  onResult: (correct: boolean, firstAttempt: boolean) => void;
  onNext: () => void;
}

const BASE_CHIP =
  "min-h-11 touch-none select-none rounded-2xl border-2 px-4 py-2 text-start shadow-soft outline-none transition hover:shadow-lift focus-visible:ring-4 focus-visible:ring-primary/40";

function chipClasses(chip: Chip, showRole: boolean, status: ChipStatus): string {
  const tone =
    status === "wrong"
      ? "border-danger bg-danger-soft text-text ring-2 ring-danger/70"
      : showRole && chip.role
        ? ROLE_STYLE[chip.role]
        : "border-border bg-surface text-text";
  return `${BASE_CHIP} ${tone}` + (status === "ok" ? " ring-2 ring-success/60" : "");
}

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
      <span className="block text-lg font-semibold">
        {chip.text}
        {status === "wrong" && (
          <span aria-hidden="true" className="ms-1">
            ✗
          </span>
        )}
        {status === "ok" && (
          <span aria-hidden="true" className="ms-1 text-success">
            ✓
          </span>
        )}
      </span>
      {showRole && chip.role && (
        <span className="block text-[11px] font-extrabold uppercase tracking-wide">{roleLabel}</span>
      )}
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
  children,
}: {
  id: string;
  label: string;
  className: string;
  children: ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      role="group"
      aria-label={label}
      className={className + (isOver ? " border-primary shadow-lift" : "")}
    >
      {children}
    </div>
  );
}

export default function SentenceBuilder({ exercise, onResult, onNext }: Props) {
  const t = useTranslations("Sentences");
  const locale = useLocale() as "en" | "fa" | "de";
  const uiDir = locale === "fa" ? "rtl" : "ltr";

  const [board, setBoard] = useState<Board>(() => initialBoard(exercise));
  const [result, setResult] = useState<OrderCheck | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);
  const [showRoles, setShowRoles] = useState(false);
  const [announcement, setAnnouncement] = useState("");
  const [focusId, setFocusId] = useState<string | null>(null);
  const attempts = useRef(0);

  const solved = result?.correct === true;
  const hasRoles = Boolean(exercise.roles);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  // Keep keyboard focus on the chip that was just moved (it re-mounts when it changes lists).
  useEffect(() => {
    if (!focusId) return;
    document.getElementById(`chip-${focusId}`)?.focus();
    setFocusId(null);
  }, [focusId, board]);

  const update = (next: Board, message: string, focus: string | null) => {
    setBoard(next);
    setResult(null);
    setShowExplanation(false);
    setAnnouncement(message);
    setFocusId(focus);
  };

  const add = (id: string, index?: number) => {
    if (solved) return;
    const chip = board.bank.find((c) => c.id === id);
    if (!chip) return;
    const next = addToAnswer(board, id, index);
    const pos = next.answer.findIndex((c) => c.id === id) + 1;
    update(next, t("announceAdded", { word: chip.text, pos, total: next.answer.length }), id);
  };

  const remove = (id: string) => {
    if (solved) return;
    const chip = board.answer.find((c) => c.id === id);
    if (!chip) return;
    update(removeFromAnswer(board, id), t("announceRemoved", { word: chip.text }), id);
  };

  const move = (id: string, delta: number) => {
    if (solved) return;
    const chip = board.answer.find((c) => c.id === id);
    if (!chip) return;
    const next = moveInAnswer(board, id, delta);
    const pos = next.answer.findIndex((c) => c.id === id) + 1;
    update(next, t("announceMoved", { word: chip.text, pos, total: next.answer.length }), id);
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
      if (chip && next !== board) {
        update(next, t("announceMoved", { word: chip.text, pos: to + 1, total: next.answer.length }), activeId);
      }
    } else if (!fromAnswer && toAnswer) {
      add(activeId, overIndex);
    } else if (fromAnswer && toBank) {
      remove(activeId);
    }
  };

  const check = () => {
    const res = checkOrder(
      board.answer.map((c) => c.text),
      exercise,
    );
    const first = attempts.current === 0;
    attempts.current += 1;
    setResult(res);
    setShowExplanation(false);
    if (res.correct) setShowRoles(true);
    onResult(res.correct, first);
  };

  const reset = () => {
    setBoard(initialBoard(exercise));
    setResult(null);
    setShowExplanation(false);
    setAnnouncement(t("announceReset"));
  };

  const statusOf = (index: number): ChipStatus => {
    if (!result) return null;
    if (result.correct) return "ok";
    return result.wrongPositions.includes(index) ? "wrong" : "ok";
  };

  const wrongWords = result && !result.correct ? result.wrongPositions.map((i) => board.answer[i]?.text).filter(Boolean) : [];
  const translation = exercise.translations[locale === "de" ? "en" : locale];
  const rolesInUse = exercise.roles ?? [];

  return (
    <section aria-labelledby="builder-title" className="space-y-5">
      {/* Task prompt: translation in the active locale */}
      <div className="card-hero p-5">
        <p id="builder-title" className="eyebrow mb-1">
          {locale === "de" ? t("promptDe") : t("prompt")}
        </p>
        <p className="text-2xl font-extrabold">{translation}</p>
      </div>

      <p className="text-sm text-text-muted">{t("howTo")}</p>

      <DndContext id="sentence-builder" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        {/* German area: ALWAYS LTR, even on /fa */}
        <div dir="ltr" lang="de" className="space-y-4">
          <DropZone
            id="answer"
            label={t("answerLine")}
            className="relative min-h-[5.5rem] rounded-3xl border-2 border-dashed border-border bg-surface-2 p-3 transition"
          >
            <SortableContext items={board.answer.map((c) => c.id)} strategy={horizontalListSortingStrategy}>
              <ul className="flex min-h-[3.5rem] flex-wrap items-center gap-2">
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
            className="min-h-[4.5rem] rounded-3xl border border-border bg-surface p-3 shadow-soft transition"
          >
            <ul className="flex flex-wrap gap-2">
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

      {/* Colour legend + toggle */}
      {hasRoles && (
        <div className="space-y-2">
          <button type="button" aria-pressed={showRoles} onClick={() => setShowRoles((v) => !v)} className="pill">
            {showRoles ? t("hideParts") : t("showParts")}
          </button>
          {showRoles && <RoleLegend roles={rolesInUse} />}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {!solved && (
          <button
            type="button"
            onClick={check}
            disabled={board.answer.length === 0}
            className="btn btn-primary"
          >
            {t("check")}
          </button>
        )}
        {!solved && (
          <button type="button" onClick={reset} className="btn btn-secondary">
            {t("reset")}
          </button>
        )}
        {solved ? (
          <button
            type="button"
            onClick={onNext}
            autoFocus
            className="btn btn-primary"
          >
            {t("next")} <span aria-hidden="true" className="rtl:-scale-x-100">→</span>
          </button>
        ) : (
          <button type="button" onClick={onNext} className="btn-ghost">
            {t("skip")}
          </button>
        )}
      </div>

      {/* Screen-reader announcements for moves */}
      <div aria-live="polite" role="status" className="sr-only">
        {announcement}
      </div>

      {/* Result (aria-live) */}
      <div aria-live="polite" role="status" className="min-h-[4rem]">
        {result?.correct && (
          <div className="feedback-success space-y-3">
            <div className="flex items-center gap-4">
              <Mascot mood="cheering" size={80} className="shrink-0 motion-safe:animate-bounce-soft" />
              <div className="space-y-1">
                <p className="font-extrabold">✓ {t("correct")}</p>
                <p dir="ltr" lang="de" className="text-lg font-extrabold text-text">
                  {board.answer.map((c) => c.text).join(" ")}
                </p>
              </div>
            </div>
            <Explanation exercise={exercise} locale={locale} open={showExplanation} onToggle={setShowExplanation} />
          </div>
        )}
        {result && !result.correct && (
          <div className="feedback-error space-y-3">
            <div className="flex items-center gap-4">
              <Mascot mood="thinking" size={80} className="shrink-0" />
              <p className="font-bold">✗ {result.incomplete && wrongWords.length === 0 ? t("incomplete") : t("wrongOrder")}</p>
            </div>
            {wrongWords.length > 0 && (
              <p className="text-sm text-text">
                {t("wrongWords")}{" "}
                <bdi dir="ltr" lang="de" className="font-extrabold">
                  {wrongWords.join(", ")}
                </bdi>
              </p>
            )}
            <p className="feedback-hint">
              <span className="font-extrabold">{t("hint")}:</span> {exercise.hint[locale]}
            </p>
            <Explanation exercise={exercise} locale={locale} open={showExplanation} onToggle={setShowExplanation} />
          </div>
        )}
      </div>
    </section>
  );
}

function Explanation({
  exercise,
  locale,
  open,
  onToggle,
}: {
  exercise: SentenceExercise;
  locale: "en" | "fa" | "de";
  open: boolean;
  onToggle: (open: boolean) => void;
}) {
  const t = useTranslations("Sentences");
  return (
    <div>
      <button type="button" aria-expanded={open} onClick={() => onToggle(!open)} className="pill">
        {open ? t("hideExplanation") : t("showExplanation")}
      </button>
      {open && <p className="mt-2 text-sm leading-relaxed text-text">{exercise.explanation[locale]}</p>}
    </div>
  );
}
