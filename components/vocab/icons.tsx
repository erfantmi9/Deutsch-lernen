import type { ReactNode } from "react";
import type { TopicId } from "@/lib/vocabTopics";

/** Outline icons (24px grid, 2px stroke, currentColor) for the vocabulary topics and their controls. Decorative. */
function Line({ children, size = 24, className }: { children: ReactNode; size?: number; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {children}
    </svg>
  );
}

const dot = (cx: number, cy: number) => <circle cx={cx} cy={cy} r="0.6" fill="currentColor" />;

const TOPIC_PATHS: Readonly<Record<TopicId, ReactNode>> = {
  food: (
    <>
      <path d="M4 3v6a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2V3M7 3v18" />
      <path d="M20 15V3a4 4 0 0 0-4 4v6a2 2 0 0 0 2 2h2zm0 0v6" />
    </>
  ),
  family: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20v-1a5 5 0 0 1 5-5h3a5 5 0 0 1 5 5v1" />
      <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.2a5 5 0 0 1 3 4.8v1" />
    </>
  ),
  home: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7V19a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 19z" />
      <path d="M9.5 20.5v-6h5v6" />
    </>
  ),
  travel: (
    <>
      <path d="m21.5 2.5-6.5 19-4-8.5-8.5-4z" />
      <path d="M21.5 2.5 11 13" />
    </>
  ),
  time: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  school: (
    <>
      <rect x="4.5" y="3" width="15" height="18" rx="2" />
      <path d="M4.5 16.5h15M8.5 7.5h7" />
    </>
  ),
  body: (
    <>
      <circle cx="12" cy="4.5" r="1.8" />
      <path d="M5.5 9 12 10.5 18.5 9M12 10.5v4.5M8.5 21l3.5-6 3.5 6" />
    </>
  ),
  health: (
    <>
      <path d="M12 20.5s-8.5-5-8.5-11A4.8 4.8 0 0 1 12 6.6a4.8 4.8 0 0 1 8.5 2.9c0 6-8.5 11-8.5 11z" />
      <path d="M12 9.5v5M9.5 12h5" />
    </>
  ),
  animals: (
    <>
      <circle cx="7" cy="8" r="1.8" />
      <circle cx="11" cy="4.8" r="1.8" />
      <circle cx="15.5" cy="5.5" r="1.8" />
      <circle cx="18.5" cy="9.5" r="1.8" />
      <path d="M8 18.5c-2 0-2.6-2.4-1-3.6l3-2.6a3 3 0 0 1 4 0l3 2.6c1.6 1.2 1 3.6-1 3.6-1.4 0-2.4-.8-4-.8s-2.6.8-4 .8z" />
    </>
  ),
  shopping: (
    <>
      <path d="M5 8h14l-1 12.5H6z" />
      <path d="M9 8V6.5a3 3 0 0 1 6 0V8" />
    </>
  ),
  jobs: (
    <>
      <rect x="3" y="7" width="18" height="13" rx="2" />
      <path d="M8.5 7V5a1.5 1.5 0 0 1 1.5-1.5h4A1.5 1.5 0 0 1 15.5 5v2M3 12.5h18" />
    </>
  ),
  weather: (
    <>
      <path d="M8 2.5v1.5M3.2 4.6l1 1M1.5 9.5H3M12.8 4.6l-1 1" />
      <path d="M4.6 12.4A4 4 0 1 1 11.3 8" />
      <path d="M9 20.5h8a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.6 1A3 3 0 0 0 9 20.5z" />
    </>
  ),
  colors: (
    <>
      <path d="M12 3a9 9 0 0 0 0 18c1 0 1.6-.7 1.6-1.6 0-.5-.2-.8-.4-1.1-.3-.3-.4-.6-.4-1.1 0-.9.7-1.6 1.6-1.6h1.9a4.8 4.8 0 0 0 4.7-4.9C21 6.6 17 3 12 3z" />
      {dot(7.5, 11.5)}
      {dot(9, 7.5)}
      {dot(13.5, 6.5)}
      {dot(17, 9.5)}
    </>
  ),
  clothes: <path d="M9 3.5 4 5.5 2.5 10l3 1.2V20.5h13v-9.3l3-1.2L20 5.5l-5-2a3 3 0 0 1-6 0z" />,
  city: (
    <>
      <rect x="4" y="3" width="11" height="18" rx="1" />
      <path d="M15 9h4a1 1 0 0 1 1 1v11H3M7.5 7h4M7.5 11h4M7.5 15h4M17.5 13v.01M17.5 17v.01" />
    </>
  ),
  services: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3.5 7 8.5 6 8.5-6" />
    </>
  ),
  hobbies: (
    <>
      <rect x="2.5" y="7" width="19" height="11" rx="4" />
      <path d="M7.5 10.5v4M5.5 12.5h4" />
      {dot(15.5, 11.5)}
      {dot(17.5, 13.5)}
    </>
  ),
  celebrations: (
    <>
      <rect x="3.5" y="8" width="17" height="4" rx="1" />
      <path d="M5 12v8.5h14V12M12 8v12.5" />
      <path d="M12 8C11 5 9.5 3.5 8 3.8 6.4 4.1 6.6 6.6 8.5 8M12 8c1-3 2.5-4.5 4-4.2 1.6.3 1.4 2.8-.5 4.2" />
    </>
  ),
  "numbers-time": <path d="M4 9h16M4 15h16M10 3.5 8 20.5M16 3.5l-2 17" />,
  adjectives: (
    <>
      <path d="M3 4.5V11l9.3 9.3a1.5 1.5 0 0 0 2.1 0l5.9-5.9a1.5 1.5 0 0 0 0-2.1L11 3H4.5A1.5 1.5 0 0 0 3 4.5z" />
      {dot(7.5, 7.5)}
    </>
  ),
  adverbs: <path d="M3.5 12h13M11 6l6 6-6 6M20.5 5v14" />,
  prepositions: (
    <>
      <rect x="3.5" y="12" width="8.5" height="8.5" rx="1.5" />
      <path d="M12 12 20.5 3.5M14.5 3.5h6v6" />
    </>
  ),
  phrases: <path d="M20.5 15a2 2 0 0 1-2 2H8l-4.5 3.5V5.5a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />,
};

export function TopicIcon({ topic, size = 24 }: { topic: TopicId; size?: number }) {
  return <Line size={size}>{TOPIC_PATHS[topic]}</Line>;
}

export const SearchIcon = ({ size = 22 }: { size?: number }) => (
  <Line size={size}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Line>
);

/** Points back towards the reading start: mirrored in RTL by the `rtl:` class. */
export const BackIcon = ({ size = 24 }: { size?: number }) => (
  <Line size={size} className="rtl:-scale-x-100">
    <path d="M19.5 12h-15M10.5 6l-6 6 6 6" />
  </Line>
);

export const ClearIcon = ({ size = 22 }: { size?: number }) => (
  <Line size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="m9 9 6 6M15 9l-6 6" />
  </Line>
);

export const CheckCircleIcon = ({ size = 22 }: { size?: number }) => (
  <Line size={size}>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.2 2.4 2.4 4.6-4.9" />
  </Line>
);

export const PlusIcon = ({ size = 22 }: { size?: number }) => (
  <Line size={size}>
    <path d="M12 5v14M5 12h14" />
  </Line>
);

export const BulbIcon = ({ size = 22 }: { size?: number }) => (
  <Line size={size}>
    <path d="M9 18h6M10 21h4" />
    <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" />
  </Line>
);
