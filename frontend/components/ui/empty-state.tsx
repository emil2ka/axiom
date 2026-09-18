import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("panel flex flex-col items-center gap-3 px-6 py-14 text-center", className)}>
      {icon ? (
        <div className="relative mb-1 flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/25 bg-violet-500/[0.08] text-violet-300">
          <span className="absolute inset-0 -z-10 rounded-2xl bg-[radial-gradient(60%_60%_at_50%_30%,rgba(111,179,238,0.18),transparent_75%)]" aria-hidden="true" />
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-lg font-semibold text-mist-50">{title}</h3>
      {description ? <p className="max-w-md text-sm leading-relaxed text-mist-400">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
