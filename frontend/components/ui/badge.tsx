import { cn } from "@/lib/utils";

type Tone = "neutral" | "violet" | "teal" | "amber" | "rose" | "lime";

const TONES: Record<Tone, string> = {
  neutral: "border-line bg-transparent text-mist-400",
  violet: "border-violet-500/35 bg-transparent text-violet-300",
  teal: "border-teal-400/30 bg-transparent text-teal-300",
  amber: "border-amber-400/30 bg-transparent text-amber-300",
  rose: "border-rose-400/30 bg-transparent text-rose-300",
  lime: "border-lime-400/30 bg-transparent text-lime-300",
};

const DOTS: Record<Tone, string> = {
  neutral: "bg-mist-500",
  violet: "bg-violet-400",
  teal: "bg-teal-400",
  amber: "bg-amber-400",
  rose: "bg-rose-400",
  lime: "bg-lime-400",
};

export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
}: {
  tone?: Tone;
  dot?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        TONES[tone],
        className,
      )}
    >
      {dot ? <span className={cn("h-1.5 w-1.5 rounded-full", DOTS[tone])} /> : null}
      {children}
    </span>
  );
}
