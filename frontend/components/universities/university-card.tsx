import Link from "next/link";
import { CampusBackdrop } from "@/components/flow/campus-backdrop";
import { formatDateRu, formatUsd, pluralRu } from "@/lib/shared/engine";
import { minYearlyTotal, nearestDeadline, primaryProgram, universityHref } from "@/lib/university";
import type { UniversityGroup } from "@/lib/university";
import { cn } from "@/lib/utils";

/** Флаг из кода страны: PL → 🇵🇱. */
function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)));
}

/**
 * Карточка вуза для каталога и лендинга: широкий формат, два в ряд.
 * Клик открывает страницу вуза, выбранная программа — сразу.
 */
export function UniversityCard({
  group,
  anchorId,
  priority = false,
  className,
}: {
  group: UniversityGroup;
  /** Какая программа вуза откроется по клику. По умолчанию — первая. */
  anchorId?: string;
  priority?: boolean;
  className?: string;
}) {
  const anchor = primaryProgram(group, anchorId);
  const deadline = nearestDeadline(group.programs);
  const fields = [...new Set(group.programs.map((program) => program.field))];
  const programLine =
    group.programs.length === 1 ? anchor.programName.replace(/\s*\(на английском\)/i, "") : fields.join(" · ");

  return (
    <Link
      href={universityHref(anchor)}
      className={cn(
        "group relative isolate flex min-h-[280px] flex-col overflow-hidden rounded-[26px] border border-white/[.08] bg-ink-950 transition-colors hover:border-white/[.2] sm:min-h-[310px]",
        className,
      )}
    >
      <CampusBackdrop
        programId={anchor.id}
        priority={priority}
        imageClassName="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
      />

      <div className="relative z-10 flex flex-1 flex-col p-5 pb-7 sm:p-7 sm:pb-10">
        <div>
          <p className="text-[10px] uppercase tracking-[.18em] text-mist-400">
            <span className="mr-1.5">{flagEmoji(anchor.countryCode)}</span>
            {group.city}, {group.country}
          </p>
        </div>

        <div className="mt-auto pt-8">
          <h3 className="max-w-[82%] min-h-[56px] font-display text-[26px] font-medium leading-[1.04] tracking-[-.045em] text-white sm:min-h-[72px] sm:text-[32px]">
            {group.name}
          </h3>
          <p className="mt-2.5 line-clamp-1 text-[12px] text-mist-300">{programLine}</p>

          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] text-mist-400">
            <span>
              от <span className="text-[12px] text-mist-100 tnum">{formatUsd(minYearlyTotal(group))}</span> в год
            </span>
            {deadline ? (
              <span>
                дедлайн <span className="text-mist-200 tnum">{formatDateRu(deadline.deadline.date)}</span>
              </span>
            ) : null}
            {group.programs.length > 1 ? (
              <span>
                {group.programs.length} {pluralRu(group.programs.length, "программа", "программы", "программ")}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </Link>
  );
}
