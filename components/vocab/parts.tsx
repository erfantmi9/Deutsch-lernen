"use client";

import type { ReactNode, Ref } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { TopicId } from "@/lib/vocabTopics";
import Mascot from "../illustrations/Mascot";
import { ClearIcon, SearchIcon, TopicIcon } from "./icons";

/** A topic tile: icon, name, word count and (unless compact) how much of it is in the review deck. */
export function TopicCard({
  topic,
  name,
  count,
  percent,
  compact = false,
}: {
  topic: TopicId;
  name: string;
  count: number;
  /** null until the deck has loaded. */
  percent: number | null;
  compact?: boolean;
}) {
  const t = useTranslations("Vocabulary");
  return (
    <li>
      <Link
        href={`/vocabulary/${topic}`}
        data-topic={topic}
        className={
          "card flex h-full flex-col gap-4 p-4 transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-lift " +
          (compact ? "justify-center py-3" : "")
        }
      >
        <span className="flex items-start gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <TopicIcon topic={topic} size={22} />
          </span>
          <span className="min-w-0 pt-0.5">
            <span className="block text-[0.9375rem] font-extrabold leading-snug">{name}</span>
            <span className="block text-sm text-text-muted">{t("count", { count })}</span>
            {percent !== null && <span className="sr-only">{t("inReview", { percent })}</span>}
          </span>
        </span>
        {!compact && (
          <span aria-hidden="true" className="mt-auto block h-1.5 overflow-hidden rounded-full bg-surface-2">
            <span
              className={"block h-full rounded-full bg-primary transition-[width] duration-500 " + (percent ? "min-w-1.5" : "")}
              style={{ width: `${percent ?? 0}%` }}
            />
          </span>
        )}
      </Link>
    </li>
  );
}

/** Rounded search field with a leading magnifier and a clear button once something is typed. */
export function SearchField({
  value,
  onChange,
  placeholder,
  label,
  lang,
  inputRef,
  className = "",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label: string;
  lang: string;
  inputRef?: Ref<HTMLInputElement>;
  className?: string;
}) {
  const t = useTranslations("Vocabulary");
  return (
    <div className={"relative " + className}>
      <span className="pointer-events-none absolute inset-y-0 start-4 flex items-center text-text-muted">
        <SearchIcon />
      </span>
      <input
        ref={inputRef}
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={label}
        lang={lang}
        className="min-h-14 w-full rounded-3xl border-2 border-border bg-surface pe-14 ps-12 text-text shadow-soft outline-none transition placeholder:text-text-muted focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/20 [&::-webkit-search-cancel-button]:hidden"
      />
      {value !== "" && (
        <button
          type="button"
          onClick={() => onChange("")}
          aria-label={t("clearSearch")}
          className="absolute inset-y-0 end-2 my-auto flex size-11 items-center justify-center rounded-full text-text-muted transition hover:bg-surface-2 hover:text-text"
        >
          <ClearIcon />
        </button>
      )}
    </div>
  );
}

/** Deutschi with a mustard speech bubble, for "nothing found". */
export function NothingFound({ message, children }: { message: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center">
      <p className="relative max-w-sm rounded-3xl bg-brand px-6 py-4 text-lg font-extrabold leading-relaxed text-on-brand shadow-lift">
        {message}
        <span aria-hidden="true" className="absolute -bottom-2 left-1/2 size-4 -translate-x-1/2 rotate-45 rounded-sm bg-brand" />
      </p>
      <Mascot mood="searching" size={200} />
      {children}
    </div>
  );
}
