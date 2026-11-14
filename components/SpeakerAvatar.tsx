import Portrait from "./illustrations/people/Portrait";
import { lookFor } from "./illustrations/people/looks";

/** Ring and background from the sentence-part tokens, so the two sides of a conversation stay apart at a glance. */
const TONES = ["bg-role-subject border-role-subject-edge", "bg-role-place border-role-place-edge"] as const;

/**
 * Round portrait of a dialogue character. Every named character has their own face (see LOOKS); texts without names
 * get one look per side. Decorative: the speaker's name is always written next to it.
 */
export default function SpeakerAvatar({ index, name, size = 44 }: { index: 0 | 1; name?: string; size?: number }) {
  return (
    <span
      aria-hidden="true"
      data-speaker-avatar={name ?? index}
      className={"inline-flex shrink-0 items-end justify-center overflow-hidden rounded-full border-2 " + TONES[index]}
      style={{ width: size, height: size }}
    >
      <Portrait look={lookFor(name, index)} size={size - 4} />
    </span>
  );
}
