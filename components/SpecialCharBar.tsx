"use client";

import { useTranslations } from "next-intl";

const SPECIAL_CHARS = ["ä", "ö", "ü", "ß"] as const;

/** Buttons that insert ä ö ü ß into a text field (for keyboards without these keys). */
export default function SpecialCharBar({
  disabled,
  onInsert,
}: {
  disabled?: boolean;
  onInsert: (char: string) => void;
}) {
  const t = useTranslations("Grammar");
  return (
    <div role="group" aria-label={t("specialChars")} className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-bold text-text-muted">{t("specialChars")}:</span>
      {SPECIAL_CHARS.map((ch) => (
        <button
          key={ch}
          type="button"
          disabled={disabled}
          // Keep focus (and the mobile keyboard) in the text field the character is inserted into.
          onPointerDown={(e) => e.preventDefault()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onInsert(ch)}
          aria-label={t("insertChar", { char: ch })}
          className="pill h-11 w-11 justify-center px-0 text-lg text-text disabled:opacity-50"
        >
          {ch}
        </button>
      ))}
    </div>
  );
}
