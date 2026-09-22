import type { SVGProps } from "react";
const paths = {
  library: "M4 5h16v15H4z M8 2v6 M16 2v6 M4 10h16",
  check: "m5 12 4 4L19 6",
  actions: "M9 5h11 M9 12h11 M9 19h11 M3 5h.01 M3 12h.01 M3 19h.01",
  settings:
    "M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2",
  mic: "M9 5a3 3 0 0 1 6 0v7a3 3 0 0 1-6 0z M5 10v2a7 7 0 0 0 14 0v-2 M12 19v3 M8 22h8",
  shield: "m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z m-4 9 3 3 5-6",
  search: "M11 3a8 8 0 1 0 0 16 8 8 0 0 0 0-16 m6 14 5 5",
  folder: "M3 6h7l2 2h9v12H3z",
  plus: "M12 5v14 M5 12h14",
  arrow: "M5 12h14 m-5-5 5 5-5 5",
  back: "M19 12H5 m5-5-5 5 5 5",
  chevron: "m9 5 7 7-7 7",
  clock: "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M12 7v5l3 2",
  transcript: "M5 3h14v18H5z M8 8h8 M8 12h8 M8 16h5",
  download: "M12 3v12 m-5-5 5 5 5-5 M4 16v5h16v-5",
  edit: "m14 4 6 6 M4 20l5-1L21 7l-5-5L4 14z",
  trash: "M3 6h18 M9 6V3h6v3 M6 6l1 15h10l1-15 M10 10v7 M14 10v7",
  close: "m6 6 12 12 M6 18 18 6",
  minus: "M5 12h14",
  alert: "m12 3 10 18H2z M12 9v5 M12 17h.01",
  refresh: "M20 7a9 9 0 1 0 1 9 M20 2v6h-6",
  cloud: "M7 19a5 5 0 1 1 1-10 6 6 0 0 1 12 2 4 4 0 0 1 0 8z",
  monitor: "M3 4h18v13H3z M12 17v4 M8 21h8",
  globe:
    "M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18 M3 12h18 M12 3c-5 5-5 13 0 18 5-5 5-13 0-18",
  sparkle: "m12 3 2 7 7 2-7 2-2 7-2-7-7-2 7-2z",
  chat: "M3 4h18v13H9l-6 4z M7 8h10 M7 12h6",
  stop: "M6 6h12v12H6z",
  play: "m8 4 12 8-12 8z",
  person: "M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M4 21v-2a8 8 0 0 1 16 0v2",
  bolt: "m13 2-9 12h7l-1 8 10-12h-7z",
};
export type IconName = keyof typeof paths;
export function Icon({
  name,
  size = 20,
  ...props
}: SVGProps<SVGSVGElement> & { name: IconName; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      <path d={paths[name]} />
    </svg>
  );
}
export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand">
      <span className="brand-mark" aria-hidden="true">
        <i />
        <i />
        <i />
        <i />
      </span>
      {!compact && (
        <span>
          Watch<span className="brand-emphasis">NT</span>
        </span>
      )}
    </span>
  );
}
