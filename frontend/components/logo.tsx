import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <Image
        src="/brand/axiom-mark.png"
        alt=""
        width={44}
        height={44}
        className="h-11 w-11 object-contain"
        priority
      />
      {!compact ? (
        <span className="font-display text-[17px] font-semibold tracking-[0.08em] text-mist-50">AXIOM</span>
      ) : null}
    </span>
  );
}
