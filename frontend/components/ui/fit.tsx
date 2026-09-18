"use client";

import { useState } from "react";
import { IconAlert, IconCheck, IconInfo, IconMinus } from "@/components/icons";
import type { Gap, Reason, Recommendation, ScoreWeights } from "@/lib/shared/engine";
import { DEFAULT_WEIGHTS } from "@/lib/shared/engine";
import { cn } from "@/lib/utils";

export const FIT_DISCLAIMER =
  "Соответствие — совпадение с твоими фактами по 8 критериям, а не вероятность поступления.";

export const WEIGHT_LABELS: Record<keyof ScoreWeights, string> = {
  budget: "Бюджет",
  country: "Страна",
  ielts: "IELTS",
  field: "Направление",
  scholarship: "Стипендия",
  timing: "Сроки",
  gpa: "Успеваемость",
  language: "Язык обучения",
};

export interface ScoreTone {
  key: "strong" | "good" | "moderate" | "weak";
  label: string;
  text: string;
  bar: string;
  dot: string;
  soft: string;
  border: string;
}

export function scoreTone(score: number): ScoreTone {
  if (score >= 78)
    return {
      key: "strong",
      label: "Отличное соответствие",
      text: "text-teal-300",
      bar: "bg-teal-400",
      dot: "bg-teal-400",
      soft: "bg-teal-400/10",
      border: "border-teal-400/35",
    };
  if (score >= 62)
    return {
      key: "good",
      label: "Хорошее соответствие",
      text: "text-violet-300",
      bar: "bg-violet-400",
      dot: "bg-violet-400",
      soft: "bg-violet-500/10",
      border: "border-violet-500/35",
    };
  if (score >= 45)
    return {
      key: "moderate",
      label: "Умеренное соответствие",
      text: "text-amber-300",
      bar: "bg-amber-400",
      dot: "bg-amber-400",
      soft: "bg-amber-400/10",
      border: "border-amber-400/35",
    };
  return {
    key: "weak",
    label: "Слабое соответствие",
    text: "text-rose-300",
    bar: "bg-rose-400",
    dot: "bg-rose-400",
    soft: "bg-rose-400/10",
    border: "border-rose-400/35",
  };
}

export function FitLabel({ score, className, short = false }: { score: number; className?: string; short?: boolean }) {
  const tone = scoreTone(score);
  const label = short ? tone.label.replace(" соответствие", "") : tone.label;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium leading-none",
        tone.border,
        tone.soft,
        tone.text,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}

/**
 * Оценка без «магического процента»: шкала с зонами, подписанными словами,
 * и честной оговоркой, что это не вероятность поступления.
 */
export function FitMeter({
  score,
  className,
  showScale = false,
  label,
}: {
  score: number;
  className?: string;
  showScale?: boolean;
  label?: string;
}) {
  const clamped = Math.max(0, Math.min(100, score));
  const tone = scoreTone(clamped);
  return (
    <div className={className}>
      <div
        role="img"
        aria-label={label ?? `Соответствие ${Math.round(clamped)} из 100. ${tone.label}. ${FIT_DISCLAIMER}`}
        className="relative h-2 w-full overflow-hidden rounded-full bg-white/[0.07]"
      >
        <div
          className={cn("h-full rounded-full transition-[width] duration-700 ease-out", tone.bar)}
          style={{ width: `${clamped}%` }}
        />
        {[45, 62, 78].map((tick) => (
          <span
            key={tick}
            aria-hidden="true"
            className="absolute top-0 h-full w-px bg-ink-950/70"
            style={{ left: `${tick}%` }}
          />
        ))}
        <span
          aria-hidden="true"
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-ink-900 bg-mist-50 shadow-[0_0_0_2px_rgba(6,7,10,0.55)] transition-[left] duration-700 ease-out"
          style={{ left: `${clamped}%` }}
        />
      </div>
      {showScale ? (
        <div aria-hidden="true" className="mt-1.5 text-[9.5px] uppercase tracking-[0.12em] text-mist-600">
          <div className="flex justify-between sm:hidden">
            <span>слабое</span>
            <span className="text-teal-300/80">отличное</span>
          </div>
          <div className="hidden sm:flex">
            <span style={{ width: "45%" }}>слабое</span>
            <span style={{ width: "17%" }}>умеренное</span>
            <span style={{ width: "16%" }}>хорошее</span>
            <span className="text-teal-300/80" style={{ width: "22%" }}>
              отличное
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function FitScoreLine({ score, className }: { score: number; className?: string }) {
  const tone = scoreTone(score);
  return (
    <span className={cn("inline-flex items-baseline gap-1.5", className)}>
      <span className={cn("font-display text-[22px] font-medium leading-none tnum", tone.text)}>{Math.round(score)}</span>
      <span className="text-[11px] uppercase tracking-[0.14em] text-mist-500">/ 100</span>
    </span>
  );
}

function componentPhrase(value: number): string {
  if (value >= 0.85) return "совпадает";
  if (value >= 0.6) return "скорее совпадает";
  if (value >= 0.35) return "частично";
  return "почти не совпадает";
}

export function FitBreakdown({
  breakdown,
  weights = DEFAULT_WEIGHTS,
  className,
}: {
  breakdown: Recommendation["breakdown"];
  weights?: ScoreWeights;
  className?: string;
}) {
  const entries = (Object.keys(WEIGHT_LABELS) as (keyof ScoreWeights)[])
    .map((key) => ({
      key,
      label: WEIGHT_LABELS[key],
      weight: weights[key],
      value: breakdown[key],
      contribution: weights[key] * breakdown[key],
    }))
    .sort((a, b) => b.contribution - a.contribution);
  const max = Math.max(...entries.map((entry) => entry.weight)) || 1;

  return (
    <ul className={cn("space-y-2", className)}>
      {entries.map((entry) => (
        <li key={entry.key} className="flex items-center gap-3">
          <span className="w-[92px] shrink-0 truncate text-[11.5px] text-mist-400" title={entry.label}>
            {entry.label}
          </span>
          <span className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
            <span
              aria-hidden="true"
              className="absolute inset-y-0 left-0 rounded-full bg-white/[0.07]"
              style={{ width: `${(entry.weight / max) * 100}%` }}
            />
            <span
              className={cn(
                "absolute inset-y-0 left-0 rounded-full",
                entry.value >= 0.85 ? "bg-teal-400/90" : entry.value >= 0.55 ? "bg-violet-400/90" : entry.value >= 0.3 ? "bg-amber-400/90" : "bg-rose-400/85",
              )}
              style={{ width: `${(entry.weight / max) * entry.value * 100}%` }}
            />
          </span>
          <span className="w-[132px] shrink-0 text-right text-[10.5px] leading-tight text-mist-500">
            {componentPhrase(entry.value)} · вес {Math.round(entry.weight * 100)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

/**
 * Причины приходят из движка с пересекающимися формулировками: приоритет
 * «стипендия» и поддержка программы часто объясняют одно и то же. Дубликаты
 * в карточке выглядят как сбой, поэтому оставляем самую весомую формулировку.
 */
export function dedupeReasons(reasons: Reason[]): Reason[] {
  const tokens = (text: string) =>
    new Set(
      text
        .toLowerCase()
        .replace(/[^a-zа-яё0-9€$%]+/gi, " ")
        .split(" ")
        .filter((word) => word.length > 3),
    );
  const kept: Reason[] = [];
  for (const reason of reasons) {
    const current = tokens(reason.text);
    const redundant = current.size
      ? kept.some((existing) => {
          const other = tokens(existing.text);
          let shared = 0;
          for (const token of current) if (other.has(token)) shared += 1;
          return shared / Math.min(current.size, other.size || 1) >= 0.72;
        })
      : false;
    if (!redundant) kept.push(reason);
  }
  return kept;
}

export function ReasonList({
  reasons,
  gaps,
  maxReasons = 2,
  maxGaps = 2,
  className,
}: {
  reasons: Reason[];
  gaps: Gap[];
  maxReasons?: number;
  maxGaps?: number;
  className?: string;
}) {
  const shownReasons = dedupeReasons(reasons).slice(0, maxReasons);
  const shownGaps = gaps.slice(0, maxGaps);
  return (
    <ul className={cn("space-y-2", className)}>
      {shownReasons.map((reason) => (
        <li key={reason.text} className="flex items-start gap-2.5 text-[12.5px] leading-[1.55] text-mist-300">
          <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-teal-400/15 text-teal-300">
            <IconCheck className="h-3 w-3" />
          </span>
          {reason.text}
        </li>
      ))}
      {shownGaps.map((gap) => (
        <li
          key={gap.text}
          className={cn(
            "flex items-start gap-2.5 text-[12.5px] leading-[1.55]",
            gap.severity === "high" ? "text-rose-200/90" : gap.severity === "medium" ? "text-amber-200/90" : "text-mist-400",
          )}
        >
          <span
            className={cn(
              "mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full",
              gap.severity === "high"
                ? "bg-rose-400/15 text-rose-300"
                : gap.severity === "medium"
                  ? "bg-amber-400/15 text-amber-300"
                  : "bg-white/[0.06] text-mist-400",
            )}
          >
            <IconAlert className="h-3 w-3" />
          </span>
          {gap.text}
        </li>
      ))}
      {!shownReasons.length && !shownGaps.length ? (
        <li className="flex items-start gap-2.5 text-[12.5px] leading-[1.55] text-mist-500">
          <span className="mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-mist-500">
            <IconMinus className="h-3 w-3" />
          </span>
          Пока нечем объяснить — добавь факты в интервью.
        </li>
      ) : null}
    </ul>
  );
}

/**
 * Блок соответствия на карточке: слово, число, шкала, причины и разбор.
 * Разбор свёрнут, чтобы карточка не превращалась в таблицу.
 */
export function FitPanel({
  item,
  weights = DEFAULT_WEIGHTS,
  className,
  reasonsLimit = 2,
  gapsLimit = 1,
  defaultOpen = false,
}: {
  item: Recommendation;
  weights?: ScoreWeights;
  className?: string;
  reasonsLimit?: number;
  gapsLimit?: number;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const tone = scoreTone(item.score);

  return (
    <div className={cn("rounded-xl border border-line-soft bg-white/[0.02] p-3.5 sm:p-4", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <FitLabel score={item.score} />
        <FitScoreLine score={item.score} />
      </div>
      <FitMeter score={item.score} className="mt-3" showScale />
      <div className="mt-3.5 border-t border-line-soft pt-3.5">
        <ReasonList reasons={item.reasons} gaps={item.gaps} maxReasons={reasonsLimit} maxGaps={gapsLimit} />
      </div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] text-mist-500 transition-colors hover:text-mist-200"
      >
        <IconInfo className="h-3.5 w-3.5" />
        {open ? "Скрыть разбор оценки" : "Из чего сложилась оценка"}
      </button>
      {open ? (
        <div className="mt-3 animate-rise-in rounded-lg border border-line-soft bg-ink-950/60 p-3.5">
          <FitBreakdown breakdown={item.breakdown} weights={weights} />
          <p className={cn("mt-3 border-t border-line-soft pt-3 text-[11px] leading-relaxed text-mist-500")}>
            {FIT_DISCLAIMER}
          </p>
        </div>
      ) : null}
    </div>
  );
}
