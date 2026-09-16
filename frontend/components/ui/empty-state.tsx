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
    <div className={cn("card flex flex-col items-center gap-3 px-6 py-12 text-center", className)}>
      {icon ? (
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300">
          {icon}
        </div>
      ) : null}
      <h3 className="font-display text-lg font-semibold text-mist-50">{title}</h3>
      {description ? <p className="max-w-md text-sm leading-relaxed text-mist-400">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
