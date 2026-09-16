"use client";

import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/progress";
import {
  IconAlert,
  IconArrowRight,
  IconCalendar,
  IconCircleCheck,
  IconExternal,
  IconMapPin,
  IconSparkles,
  IconStar,
  IconWallet,
} from "@/components/icons";
import { formatDateRu, formatUsd } from "@/lib/shared/engine";
import type { Recommendation } from "@/lib/shared/engine";
import { durationLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

function moneyBadge(item: Recommendation) {
  if (item.budgetDeltaUsd === null) return null;
  if (item.program.scholarship === "full") {
    return (
      <Badge tone="lime" dot>
        Полная стипендия
      </Badge>
    );
  }
  if (item.budgetDeltaUsd >= 0) {
    return (
      <Badge tone="teal" dot>
        В бюджет · запас {formatUsd(item.budgetDeltaUsd)}
      </Badge>
    );
  }
  return (
    <Badge tone="rose" dot>
      Выше бюджета на {formatUsd(Math.abs(item.budgetDeltaUsd))}
    </Badge>
  );
}

export function ProgramCard({
  item,
  favorite,
  inCompare,
  compareDisabled,
  compareSelectionCount,
  onToggleFavorite,
  onToggleCompare,
  onSetTarget,
}: {
  item: Recommendation;
  favorite: boolean;
  inCompare: boolean;
  compareDisabled: boolean;
  compareSelectionCount: number;
  onToggleFavorite: (programId: string) => void;
  onToggleCompare: (programId: string) => void;
  onSetTarget: (programId: string) => void;
}) {
  const { program } = item;
  const deadline = program.deadlines[0];

  return (
    <Card hover className={cn("relative", inCompare && "border-violet-500/50")}>
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div className="flex min-w-0 items-start gap-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-white/[0.04] font-display text-[13px] font-semibold tabular-nums text-mist-300">
            {item.rank}
          </span>
          <div className="min-w-0">
            <h3 className="font-display text-[15.5px] font-semibold leading-snug text-mist-50">{program.university}</h3>
            <p className="mt-0.5 text-[12.5px] text-mist-400">{program.programName}</p>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-mist-500">
              <span className="inline-flex items-center gap-1">
                <IconMapPin className="h-3.5 w-3.5" />
                {program.country}, {program.city}
              </span>
              <span>{durationLabel(program.durationYears)}</span>
              <span>{program.language}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ScoreRing value={item.score} size={62} stroke={5} />
          <div className="text-right">
            <p className="text-[12px] font-medium text-mist-200">{item.fitLabel}</p>
            <p className="mt-1 text-[11px] text-mist-500">оценка соответствия, не прогноз</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Badge tone="neutral">
          <IconWallet className="h-3.5 w-3.5" />
          {formatUsd(item.totalPerYearUsd)}/год
        </Badge>
        {moneyBadge(item)}
        <Badge tone="neutral">
          <IconCalendar className="h-3.5 w-3.5" />
          {deadline ? formatDateRu(deadline.date) : "дедлайн уточняется"}
        </Badge>
        <span className="inline-flex items-center gap-1.5 text-[11px]">
          <Badge tone="violet" dot>
            Демо-данные
          </Badge>
          {program.sources[0] ? (
            <a
              href={program.sources[0].url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-mist-500 transition-colors hover:text-violet-300"
            >
              {program.sources[0].label}
              <IconExternal className="h-3 w-3" />
            </a>
          ) : null}
        </span>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-teal-300">
            <IconSparkles className="h-3.5 w-3.5" />
            Почему подходит
          </p>
          <ul className="mt-2 space-y-1.5">
            {item.reasons.slice(0, 3).map((reason) => (
              <li key={reason.text} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-mist-300">
                <IconCircleCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-teal-400" />
                {reason.text}
              </li>
            ))}
          </ul>
        </div>

        {item.gaps.length ? (
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-300">
              <IconAlert className="h-3.5 w-3.5" />
              Чего не хватает
            </p>
            <ul className="mt-2 space-y-1.5">
              {item.gaps.slice(0, 3).map((gap) => (
                <li key={gap.text} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-mist-400">
                  <span
                    className={cn(
                      "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                      gap.severity === "high" ? "bg-rose-400" : gap.severity === "medium" ? "bg-amber-400" : "bg-mist-500",
                    )}
                  />
                  {gap.text}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="flex items-start gap-2 rounded-xl border border-teal-400/20 bg-teal-400/[0.06] px-3.5 py-3 text-[12.5px] text-teal-200/90">
            <IconCircleCheck className="mt-0.5 h-4 w-4 shrink-0 text-teal-400" />
            Явных разрывов нет — программа подходит по всем ключевым критериям.
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-line-soft pt-4">
        <button
          type="button"
          onClick={() => onToggleCompare(program.id)}
          aria-pressed={inCompare}
          disabled={!inCompare && compareDisabled}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-[12.5px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-45",
            inCompare
              ? "border-violet-500/50 bg-violet-500/20 text-violet-200"
              : "border-line bg-white/[0.04] text-mist-300 hover:bg-white/[0.08] hover:text-mist-100",
          )}
        >
          <IconArrowRight className="h-3.5 w-3.5" />
          {inCompare ? "В сравнении" : compareDisabled ? `Сравнение: ${compareSelectionCount}/3` : "Добавить в сравнение"}
        </button>
        <button
          type="button"
          onClick={() => onToggleFavorite(program.id)}
          aria-pressed={favorite}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg border px-3.5 text-[12.5px] font-medium transition-colors",
            favorite
              ? "border-amber-400/40 bg-amber-400/15 text-amber-300"
              : "border-line bg-white/[0.04] text-mist-300 hover:bg-white/[0.08] hover:text-mist-100",
          )}
        >
          <IconStar className="h-3.5 w-3.5" filled={favorite} />
          {favorite ? "В избранном" : "В избранное"}
        </button>
        <button
          type="button"
          onClick={() => onSetTarget(program.id)}
          className="inline-flex h-9 items-center gap-2 rounded-lg px-3.5 text-[12.5px] font-medium text-mist-400 transition-colors hover:bg-white/[0.06] hover:text-mist-100"
        >
          Сделать целью маршрута
        </button>
      </div>
    </Card>
  );
}
