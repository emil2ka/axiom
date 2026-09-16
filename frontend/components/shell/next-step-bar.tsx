import Link from "next/link";
import { buttonStyles } from "@/components/ui/button";
import { IconChevronLeft, IconChevronRight } from "@/components/icons";
import { cn } from "@/lib/utils";

export function NextStepBar({
  backHref,
  backLabel = "Назад",
  nextHref,
  nextLabel,
  disabledReason,
  children,
  className,
}: {
  backHref?: string;
  backLabel?: string;
  nextHref?: string;
  nextLabel?: string;
  disabledReason?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mt-10 flex flex-col gap-3 border-t border-line-soft pt-6 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div>
        {backHref ? (
          <Link href={backHref} className={buttonStyles("ghost", "md")}>
            <IconChevronLeft className="h-4 w-4" />
            {backLabel}
          </Link>
        ) : null}
      </div>
      <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center sm:gap-4">
        {children}
        {nextHref ? (
          <Link href={nextHref} className={buttonStyles("primary", "lg")}>
            {nextLabel}
            <IconChevronRight className="h-4 w-4" />
          </Link>
        ) : null}
        {!nextHref && disabledReason ? (
          <div className="flex items-center gap-3">
            <span className={buttonStyles("primary", "lg", "cursor-not-allowed opacity-45")}>
              {nextLabel}
              <IconChevronRight className="h-4 w-4" />
            </span>
            <span className="text-xs text-mist-500">{disabledReason}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
