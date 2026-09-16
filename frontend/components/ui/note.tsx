import { cn } from "@/lib/utils";
import { IconAlert, IconInfo, IconShield } from "@/components/icons";

type Tone = "info" | "data" | "warn";

const TONES: Record<Tone, { wrap: string; icon: string; defaultIcon: React.ReactNode }> = {
  info: {
    wrap: "border-line bg-white/[0.04] text-mist-300",
    icon: "text-mist-400",
    defaultIcon: <IconInfo className="h-4 w-4" />,
  },
  data: {
    wrap: "border-teal-400/20 bg-teal-400/[0.07] text-teal-200/90",
    icon: "text-teal-300",
    defaultIcon: <IconShield className="h-4 w-4" />,
  },
  warn: {
    wrap: "border-amber-400/20 bg-amber-400/[0.08] text-amber-200/90",
    icon: "text-amber-300",
    defaultIcon: <IconAlert className="h-4 w-4" />,
  },
};

export function InfoNote({
  tone = "info",
  icon,
  className,
  children,
}: {
  tone?: Tone;
  icon?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const config = TONES[tone];
  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[12.5px] leading-relaxed", config.wrap, className)}>
      <span className={cn("mt-0.5", config.icon)}>{icon ?? config.defaultIcon}</span>
      <div>{children}</div>
    </div>
  );
}
