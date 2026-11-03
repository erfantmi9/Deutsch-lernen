import type { ReviewCard } from "@/lib/reviewCards";

const ARTICLE_COLOR = { der: "text-der", die: "text-die", das: "text-das" } as const;

/** German side of a card. Nouns show their article in its colour (the word itself is always spelled out too). */
export default function CardFront({ card, className = "text-xl" }: { card: ReviewCard; className?: string }) {
  const [first, ...rest] = card.front.split(" ");
  return (
    <bdi dir="ltr" lang="de" className={className + " font-extrabold"}>
      {card.article ? (
        <>
          <span className={ARTICLE_COLOR[card.article]}>{first}</span> {rest.join(" ")}
        </>
      ) : (
        card.front
      )}
    </bdi>
  );
}
