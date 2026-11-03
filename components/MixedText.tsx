import { Fragment } from "react";

const LATIN_RUN = /(-?[A-Za-zÄÖÜäöüß]+(?:[ '\-][A-Za-zÄÖÜäöüß]+)*)/g;

/**
 * In Persian (RTL) text, wraps every Latin-script run (German words) in <bdi dir="ltr">
 * so it keeps its direction. For LTR locales the text is returned unchanged.
 */
export function MixedText({ text, locale }: { text: string; locale: string }) {
  if (locale !== "fa") return <>{text}</>;
  const parts = text.split(LATIN_RUN);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <bdi key={i} dir="ltr">
            {part}
          </bdi>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
