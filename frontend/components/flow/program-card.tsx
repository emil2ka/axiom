"use client";

import Link from "next/link";
import { IconCalendar, IconCheck, IconChevronRight, IconExternal, IconPlus, IconStar } from "@/components/icons";
import { CampusBackdrop } from "@/components/flow/campus-backdrop";
import { scoreTone } from "@/components/ui/fit";
import { formatDateRu, formatUsd } from "@/lib/shared/engine";
import type { Recommendation, ScoreWeights } from "@/lib/shared/engine";
import { universityHref } from "@/lib/university";
import { cn } from "@/lib/utils";

export function ProgramCard({
  item,
  featured = false,
  favorite,
  inCompare,
  compareDisabled,
  compareSelectionCount,
  weights,
  onToggleFavorite,
  onToggleCompare,
  onSetTarget,
}: {
  item: Recommendation;
  featured?: boolean;
  favorite: boolean;
  inCompare: boolean;
  compareDisabled: boolean;
  compareSelectionCount: number;
  weights?: ScoreWeights;
  onToggleFavorite: (id: string) => void;
  onToggleCompare: (id: string) => void;
  onSetTarget: (id: string) => void;
}) {
  const { program } = item;
  const deadline = program.deadlines[0];
  const tone = scoreTone(item.score);
  const reason = item.reasons[0]?.text ?? "";

  return (
    <article
      className={cn(
        "group relative isolate flex flex-col overflow-hidden rounded-[24px] border bg-ink-950",
        featured ? "min-h-[400px] sm:min-h-[430px]" : "min-h-[360px] sm:min-h-[380px]",
        inCompare ? "border-violet-400/50" : "border-white/[.08]",
      )}
    >
      <CampusBackdrop programId={program.id} priority={featured} />

      <Link
        href={universityHref(program)}
        aria-label={`Открыть страницу вуза ${program.university}`}
        className="absolute inset-0 z-[5]"
      />

      <div className={cn("pointer-events-none relative z-10 flex flex-1 flex-col p-5", featured && "sm:p-8")}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[.16em] text-mist-400">
              {program.city}, {program.country} · {program.language}
            </p>
            <h3
              className={cn(
                "mt-2 font-display font-medium leading-[1.02] tracking-[-.04em] text-white",
                featured ? "text-[30px] sm:text-[38px]" : "text-[24px] sm:text-[28px]",
              )}
            >
              {program.university}
            </h3>
            <span className="mt-2 inline-flex items-center gap-1 text-[11px] text-mist-400 transition-colors group-hover:text-mist-100">
              О вузе
              <IconChevronRight className="h-3 w-3 transition-transform duration-300 group-hover:translate-x-0.5" />
            </span>
          </div>

          <div className="flex shrink-0 items-start gap-4">
            <div className="text-right">
              <p className={cn("font-display text-[26px] leading-none tnum", tone.text)}>{Math.round(item.score)}</p>
              <p className="mt-1 text-[9px] uppercase tracking-[.16em] text-mist-500">соответствие</p>
            </div>
            <button
              type="button"
              onClick={() => onToggleFavorite(program.id)}
              aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"}
              aria-pressed={favorite}
              className={cn(
                "pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-ink-950/45 backdrop-blur transition-colors",
                favorite ? "text-amber-300" : "text-white/60 hover:text-white",
              )}
            >
              <IconStar className="h-4 w-4" filled={favorite} />
            </button>
          </div>
        </div>

        {reason ? (
          <p className="line-clamp-2 mt-auto max-w-[85%] pt-10 text-[13.5px] leading-relaxed text-mist-200 sm:max-w-[46ch]">
            {reason}
          </p>
        ) : null}

        <div className="mt-5">
          <p className="text-[12.5px] leading-snug text-mist-300">{program.programName.replace(/\s*\(на английском\)/i, "")}</p>
          <p className="mt-4 text-[9.5px] uppercase tracking-[.16em] text-mist-500">В год · с проживанием</p>
          <p className="mt-1 text-[21px] font-medium leading-none tracking-[-.03em] text-white tnum">{formatUsd(item.totalPerYearUsd)}</p>
          {deadline ? (
            <p className="mt-1.5 text-[11px] text-mist-500">до {formatDateRu(deadline.date)}</p>
          ) : null}
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onSetTarget(program.id)}
            className="pointer-events-auto rounded-full bg-mist-50 px-4 py-2.5 text-[12px] font-medium text-ink-950 transition-colors hover:bg-white"
          >
            Выбрать
          </button>
          <button
            type="button"
            onClick={() => onToggleCompare(program.id)}
            aria-pressed={inCompare}
            disabled={!inCompare && compareDisabled}
            className={cn(
              "pointer-events-auto rounded-full border px-3.5 py-2.5 text-[11.5px] backdrop-blur transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              inCompare
                ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
                : "border-white/12 bg-ink-950/40 text-mist-200 hover:border-white/25 hover:text-white",
            )}
          >
            {inCompare ? <IconCheck className="mr-1 inline h-3.5 w-3.5" /> : <IconPlus className="mr-1 inline h-3.5 w-3.5" />}
            {inCompare ? "В сравнении" : compareDisabled ? `${compareSelectionCount}/3` : "Сравнить"}
          </button>
          <details className="pointer-events-auto relative ml-auto text-[11.5px] text-mist-400">
            <summary className="cursor-pointer list-none rounded-full border border-white/12 bg-ink-950/40 px-3.5 py-2.5 backdrop-blur transition-colors hover:text-white">
              Детали
            </summary>
            <div className="absolute bottom-12 right-0 z-20 w-72 rounded-xl border border-white/10 bg-ink-950/95 p-4 text-[12px] leading-relaxed text-mist-300 shadow-2xl backdrop-blur">
              <p className="flex items-center gap-1.5 text-mist-400">
                <IconCalendar className="h-3.5 w-3.5" />
                {deadline ? deadline.label : "Дедлайн уточняется"}
              </p>
              <p className="mt-3">{program.scholarshipNote}</p>
              {item.gaps[0] ? <p className="mt-3 text-amber-200">{item.gaps[0].text}</p> : null}
              {program.sources[0] ? (
                <Link
                  href={program.sources[0].url}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-violet-300 transition-colors hover:text-violet-100"
                >
                  Источник <IconExternal className="h-3 w-3" />
                </Link>
              ) : null}
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}
