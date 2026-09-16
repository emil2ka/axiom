import { cn } from "@/lib/utils";

type Tone = "neutral" | "violet" | "teal" | "amber" | "rose" | "lime";

const TONES: Record<Tone, string> = {
  neutral: "border-line bg-white/[0.05] text-mist-300",
  violet: "border-violet-500/30 bg-violet-500/15 text-violet-300",
  teal: "border-teal-400/25 bg-teal-400/10 text-teal-300",
  amber: "border-amber-400/25 bg-amber-400/10 text-amber-300",
  rose: "border-rose-400/25 bg-rose-400/10 text-rose-300",
  lime: "border-lime-400/25 bg-lime-400/10 text-lime-300",
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
