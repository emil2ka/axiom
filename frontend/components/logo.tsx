import Image from "next/image";
import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-[10px] bg-[#07101d] shadow-[0_8px_22px_-12px_rgba(111,179,238,0.9)]">
        <Image src="/brand/axiom-mark.png" alt="" width={36} height={36} className="h-[34px] w-[34px] object-contain" priority />
      </span>
      {!compact ? (
        <span className="font-display text-[17px] font-semibold tracking-[0.08em] text-mist-50">AXIOM</span>
      ) : null}
    </span>
  );
}
