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
      <div className="max-w-2xl space-y-2.5">
        {eyebrow ? (
          <p className="flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.2em] text-mist-500">
            <span className="h-px w-5 bg-violet-400/60" aria-hidden="true" />
            <span className="text-violet-300">{eyebrow}</span>
          </p>
        ) : null}
        <h2 className="font-display text-[26px] font-medium leading-[1.12] tracking-[-0.04em] text-mist-50 sm:text-[32px]">
          {title}
        </h2>
        {description ? <p className="text-[13.5px] leading-relaxed text-mist-400">{description}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
