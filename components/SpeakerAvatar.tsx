import Mascot from "./illustrations/Mascot";

/** Border and fill from the sentence-part tokens. The speaker's name is always written next to the avatar. */
const TONES = ["bg-role-subject border-role-subject-edge", "bg-role-place border-role-place-edge"] as const;

/** Round mascot avatar: speaker 0 faces one way, speaker 1 the other, each on its own tint. */
export default function SpeakerAvatar({ index, size = 44 }: { index: 0 | 1; size?: number }) {
  return (
    <span
      aria-hidden="true"
      className={"inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border-2 " + TONES[index]}
      style={{ width: size, height: size }}
    >
      <Mascot mood={index === 0 ? "happy" : "waving"} size={Math.round(size * 0.85)} className={index === 1 ? "-scale-x-100" : ""} />
    </span>
  );
}
