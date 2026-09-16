import { cn } from "@/lib/utils";

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-teal-400 shadow-[var(--shadow-glow)]">
        <svg
          viewBox="0 0 24 24"
          className="h-5 w-5 text-ink-950"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 4 5.4 20" />
          <path d="m12 4 6.6 16" />
          <path d="M8.3 14h7.4" />
        </svg>
      </span>
      {!compact ? (
        <span className="font-display text-lg font-semibold tracking-[0.14em] text-mist-50">AXIOM</span>
      ) : null}
    </span>
  );
}
