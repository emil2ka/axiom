import { cn } from "@/lib/utils";

type Tone = "violet" | "teal" | "amber";

const GRADIENTS: Record<Tone, string> = {
  violet: "from-violet-500 to-teal-400",
  teal: "from-teal-400 to-violet-400",
  amber: "from-amber-400 to-rose-400",
};

export function ProgressBar({
  value,
  tone = "violet",
  size = "md",
  className,
}: {
  value: number;
  tone?: Tone;
  size?: "sm" | "md";
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn("w-full overflow-hidden rounded-full bg-white/[0.07]", size === "sm" ? "h-1.5" : "h-2.5", className)}
    >
      <div
        className={cn("h-full rounded-full bg-gradient-to-r transition-[width] duration-700 ease-out", GRADIENTS[tone])}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}

function ringColor(value: number): string {
  if (value >= 78) return "#46e2c7";
  if (value >= 62) return "#a293ff";
  if (value >= 45) return "#ffb964";
  return "#ff7189";
}

export function ScoreRing({
  value,
  size = 68,
  stroke = 6,
  label,
  className,
}: {
  value: number;
  size?: number;
  stroke?: number;
  label?: string;
  className?: string;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped / 100);
  const color = ringColor(clamped);

  return (
    <div className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-lg font-semibold tabular-nums text-mist-50">{Math.round(clamped)}</span>
        {label ? <span className="text-[10px] uppercase tracking-wide text-mist-500">{label}</span> : null}
      </div>
    </div>
  );
}
