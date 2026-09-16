import { cn } from "@/lib/utils";

export function Card({
  hover = false,
  className,
  children,
  ...rest
}: React.HTMLAttributes<HTMLDivElement> & { hover?: boolean }) {
  return (
    <div className={cn("card p-5 sm:p-6", hover && "card-hover", className)} {...rest}>
      {children}
    </div>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  right,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  right?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-4", className)}>
      <div className="max-w-2xl space-y-2">
        {eyebrow ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300">{eyebrow}</p>
        ) : null}
        <h2 className="font-display text-2xl font-semibold tracking-tight text-mist-50 sm:text-[28px]">{title}</h2>
        {description ? <p className="text-sm leading-relaxed text-mist-400">{description}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
