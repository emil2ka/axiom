import { cn } from "@/lib/utils";

export type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-5 w-5 shrink-0", className)}
    >
      {children}
    </svg>
  );
}

export function IconSparkles(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m12 3 1.9 5.6L19.5 10l-5.6 1.4L12 17.5l-1.9-6.1L4.5 10l5.6-1.4L12 3Z" />
      <path d="m18.5 15.5.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
    </Svg>
  );
}

export function IconVolume(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M11 5.5 6.5 9H3.5v6h3L11 18.5v-13Z" />
      <path d="M15.3 8.8a4.5 4.5 0 0 1 0 6.4" />
      <path d="M17.8 6.3a8 8 0 0 1 0 11.4" />
    </Svg>
  );
}

export function IconVolumeOff(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M11 5.5 6.5 9H3.5v6h3L11 18.5v-13Z" />
      <path d="M15.5 9.5l4 4" />
      <path d="M19.5 9.5l-4 4" />
    </Svg>
  );
}

export function IconMic(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4.5A2.8 2.8 0 0 0 9.2 7.3v4.2a2.8 2.8 0 0 0 5.6 0V7.3A2.8 2.8 0 0 0 12 4.5Z" />
      <path d="M5.5 11.5v.5a6.5 6.5 0 0 0 13 0v-.5" />
      <path d="M12 18.5V21" />
    </Svg>
  );
}

export function IconMicOff(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9.2 5.8A2.8 2.8 0 0 1 14.8 7v2.2" />
      <path d="M14.8 9.7v1.8a2.8 2.8 0 0 1-4.3 2.4" />
      <path d="M5.5 11.5v.5a6.5 6.5 0 0 0 9.9 5.6" />
      <path d="M18.5 11.5v.5c0 .7-.1 1.3-.3 1.9" />
      <path d="M12 18.5V21" />
      <path d="m4 4 16 16" />
    </Svg>
  );
}

export function IconSend(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M21 3 10.5 13.5" />
      <path d="M21 3l-6.5 18-4-8-8-4L21 3Z" />
    </Svg>
  );
}

export function IconCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m5 12.5 4.5 4.5L19 6.5" />
    </Svg>
  );
}

export function IconCircleCheck(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.4 12.3 2.4 2.4 4.8-5" />
    </Svg>
  );
}

export function IconChevronRight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m9.5 6 6 6-6 6" />
    </Svg>
  );
}

export function IconChevronLeft(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m14.5 6-6 6 6 6" />
    </Svg>
  );
}

export function IconChevronDown(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m6 9.5 6 6 6-6" />
    </Svg>
  );
}

export function IconStar({ filled, className }: IconProps & { filled?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-5 w-5 shrink-0", className)}
    >
      <path d="m12 3.6 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8-4.2-4.1 5.8-.8L12 3.6Z" />
    </svg>
  );
}

export function IconTrash(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 7h15" />
      <path d="M9.5 7V5.4A1.4 1.4 0 0 1 10.9 4h2.2a1.4 1.4 0 0 1 1.4 1.4V7" />
      <path d="m6.5 7 .8 11a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-11" />
      <path d="M10.2 11v5.5M13.8 11v5.5" />
    </Svg>
  );
}

export function IconPencil(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20h4.2L20 8.2a2 2 0 0 0 0-2.8l-1.4-1.4a2 2 0 0 0-2.8 0L4 15.8V20Z" />
      <path d="m14.5 5.5 4 4" />
    </Svg>
  );
}

export function IconArrowRight(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 12h15" />
      <path d="m13.5 6.5 5.5 5.5-5.5 5.5" />
    </Svg>
  );
}

export function IconTrophy(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M7.5 4h9v5.2a4.5 4.5 0 0 1-9 0V4Z" />
      <path d="M7.5 5.5H4.8v1.6a3 3 0 0 0 3 3" />
      <path d="M16.5 5.5h2.7v1.6a3 3 0 0 1-3 3" />
      <path d="M12 13.8V17" />
      <path d="M8.5 21h7" />
      <path d="M10 17h4v4h-4z" />
    </Svg>
  );
}

export function IconCalendar(p: IconProps) {
  return (
    <Svg {...p}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M8 3v4M16 3v4M3.5 10.2h17" />
    </Svg>
  );
}

export function IconWallet(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
      <path d="M15 11h5v3.5h-5a1.75 1.75 0 0 1 0-3.5Z" />
    </Svg>
  );
}

export function IconGlobe(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3.2 12h17.6" />
      <path d="M12 3c2.7 2.9 2.7 15.1 0 18-2.7-2.9-2.7-15.1 0-18Z" />
    </Svg>
  );
}

export function IconGraduation(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m3 9.2 9-4.4 9 4.4-9 4.4-9-4.4Z" />
      <path d="M7 11.3v4.1c0 .9 2.3 2.2 5 2.2s5-1.3 5-2.2v-4.1" />
      <path d="M21 9.5v5" />
    </Svg>
  );
}

export function IconTarget(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.8" />
      <circle cx="12" cy="12" r="4.8" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconCompass(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="m15.6 8.4-2.3 5.3-5.3 2.3 2.3-5.3 5.3-2.3Z" />
    </Svg>
  );
}

export function IconScale(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4.5V20" />
      <path d="M5 20h14" />
      <path d="M7.5 7.5h9" />
      <path d="M7.5 7.5 4.8 13a2.9 2.9 0 0 0 5.4 0L7.5 7.5Z" />
      <path d="m16.5 7.5-2.7 5.5a2.9 2.9 0 0 0 5.4 0l-2.7-5.5Z" />
    </Svg>
  );
}

export function IconWand(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4 20 14.5 9.5" />
      <path d="m13 8 3 3" />
      <path d="M17.5 3.5 18.4 6l2.5.9-2.5.9-.9 2.5-.9-2.5-2.5-.9 2.5-.9.9-2.5Z" />
      <path d="M20.5 15.5v3M19 17h3" />
    </Svg>
  );
}

export function IconRefresh(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M4.5 12a7.5 7.5 0 0 1 12.9-5.2L20 9.3" />
      <path d="M20 4.5v4.8h-4.8" />
      <path d="M19.5 12a7.5 7.5 0 0 1-12.9 5.2L4 14.7" />
      <path d="M4 19.5v-4.8h4.8" />
    </Svg>
  );
}

export function IconDownload(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
      <path d="M5 20h14" />
    </Svg>
  );
}

export function IconX(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m6.5 6.5 11 11M17.5 6.5l-11 11" />
    </Svg>
  );
}

export function IconPlus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 5.5v13M5.5 12h13" />
    </Svg>
  );
}

export function IconMinus(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5.5 12h13" />
    </Svg>
  );
}

export function IconInfo(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 11v5.2" />
      <path d="M12 8v.4" />
    </Svg>
  );
}

export function IconAlert(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 4.2 3.2 19.3h17.6L12 4.2Z" />
      <path d="M12 10v4.3" />
      <path d="M12 17.4v.4" />
    </Svg>
  );
}

export function IconMapPin(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 21s6.4-5.3 6.4-10A6.4 6.4 0 0 0 5.6 11C5.6 15.7 12 21 12 21Z" />
      <circle cx="12" cy="10.8" r="2.3" />
    </Svg>
  );
}

export function IconClock(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="12" r="8.8" />
      <path d="M12 7.5V12l3.1 2" />
    </Svg>
  );
}

export function IconListChecks(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M10.5 6h9M10.5 12h9M10.5 18h9" />
      <path d="m3.5 6 1.5 1.5L7.5 5" />
      <path d="m3.5 12 1.5 1.5L7.5 11" />
      <path d="m3.5 18 1.5 1.5L7.5 17" />
    </Svg>
  );
}

export function IconBrain(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M9.6 4.6a3 3 0 0 0-2.9 3v.3a2.8 2.8 0 0 0-1.4 5 2.9 2.9 0 0 0 1.8 4.6 3 3 0 0 0 5.6-.9V7.6a3 3 0 0 0-3.1-3Z" />
      <path d="M14.4 4.6a3 3 0 0 1 2.9 3v.3a2.8 2.8 0 0 1 1.4 5 2.9 2.9 0 0 1-1.8 4.6 3 3 0 0 1-5.6-.9" />
      <path d="M12 10.5h1.3" />
    </Svg>
  );
}

export function IconLoader(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5v3.6M12 16.9v3.6M5.9 5.9l2.6 2.6M15.5 15.5l2.6 2.6M3.5 12h3.6M16.9 12h3.6M5.9 18.1l2.6-2.6M15.5 8.5l2.6-2.6" />
    </Svg>
  );
}

export function IconTrendingUp(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m3.5 17 5.8-5.8 4 4 7.2-7.2" />
      <path d="M15.5 8h5v5" />
    </Svg>
  );
}

export function IconTrendingDown(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="m3.5 7 5.8 5.8 4-4 7.2 7.2" />
      <path d="M15.5 16h5v-5" />
    </Svg>
  );
}

export function IconExternal(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M14 4h6v6" />
      <path d="M20 4 11.5 12.5" />
      <path d="M19 14.5V18a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h3.5" />
    </Svg>
  );
}

export function IconFlag(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M5.5 21V4" />
      <path d="M5.5 5h11.5l-2.4 3.5L17 12H5.5" />
    </Svg>
  );
}

export function IconMessage(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 20.2c4.5 0 8.2-3.2 8.2-7.1S16.5 6 12 6s-8.2 3.2-8.2 7.1c0 1.5.6 2.9 1.6 4L4.5 20.4l3.4-.9c1.2.5 2.6.7 4.1.7Z" />
    </Svg>
  );
}

export function IconUsers(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="9.2" cy="8.6" r="3.1" />
      <path d="M3.8 19a5.4 5.4 0 0 1 10.8 0" />
      <path d="M15.8 5.9a3.1 3.1 0 0 1 0 5.5" />
      <path d="M17.4 13.9a5.4 5.4 0 0 1 2.8 4.8" />
    </Svg>
  );
}

export function IconRoute(p: IconProps) {
  return (
    <Svg {...p}>
      <circle cx="6" cy="18" r="2.4" />
      <circle cx="18" cy="6" r="2.4" />
      <path d="M8.4 18h5.1a3.2 3.2 0 0 0 0-6.4h-3a3.2 3.2 0 0 1 0-6.4h5.1" />
    </Svg>
  );
}

export function IconShield(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M12 3.5 5 6v5.4c0 4.3 3 7.4 7 9.1 4-1.7 7-4.8 7-9.1V6l-7-2.5Z" />
      <path d="m9.2 11.6 2 2 3.6-3.7" />
    </Svg>
  );
}
