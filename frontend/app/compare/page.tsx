"use client";

import { Fragment, useMemo, type CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { StepGuard } from "@/components/shell/step-guard";
import { EmptyState } from "@/components/ui/empty-state";
import { buttonStyles } from "@/components/ui/button";
import { CampusBackdrop } from "@/components/flow/campus-backdrop";
import { FitMeter, dedupeReasons, scoreTone } from "@/components/ui/fit";
import { ScoreRing } from "@/components/ui/score-ring";
import { IconArrowRight, IconCheck, IconScale, IconSparkles, IconX } from "@/components/icons";
import { budgetFitText, deadlineRelative, scholarshipLabel } from "@/lib/labels";
import { formatDateRu, formatUsd, getBudget, getIelts, recommend } from "@/lib/shared/engine";
import type { Recommendation } from "@/lib/shared/engine";
import { universityHref } from "@/lib/university";
import { useAxiomStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const LABEL_COL = 112;

const SCHOLARSHIP_RANK: Record<Recommendation["program"]["scholarship"], number> = {
  none: 0,
  partial: 1,
  full: 2,
};

function cleanName(name: string): string {
  return name.replace(/\s*\(на английском\)/i, "");
}

/** Лучшее значение строки; подсветка появляется с лёгкой задержкой по строкам. */
function BestMark({ delay, warn, reduce }: { delay: number; warn?: boolean; reduce: boolean }) {
  return (
    <motion.span
      aria-hidden="true"
      className={cn(
        "absolute -inset-x-3 -inset-y-1.5 rounded-lg border",
        warn ? "border-amber-400/25 bg-amber-400/[0.06]" : "border-teal-400/25 bg-teal-400/[0.07]",
      )}
      initial={reduce ? false : { opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: EASE, delay }}
    />
  );
}

function pickBest(values: (number | null)[], mode: "min" | "max"): number | null {
  const numbers = values.filter((value): value is number => value !== null);
  if (numbers.length < 2 || new Set(numbers).size < 2) return null;
  return mode === "min" ? Math.min(...numbers) : Math.max(...numbers);
}

interface RowSpec {
  key: string;
  label: string;
  values: (number | null)[];
  mode: "min" | "max";
  /** Выигрыш засчитывается не всегда: стипендия «нет» никого не выигрывает. */
  qualify?: (best: number) => boolean;
}

export default function ComparePage() {
  const reduce = useReducedMotion() ?? false;
  const memories = useAxiomStore((state) => state.memories);
  const compareIds = useAxiomStore((state) => state.compareIds);
  const toggleCompare = useAxiomStore((state) => state.toggleCompare);
  const clearCompare = useAxiomStore((state) => state.clearCompare);
  const setTarget = useAxiomStore((state) => state.setTargetProgram);
  const router = useRouter();

  const selected = useMemo(() => {
    const byId = new Map(recommend(memories).recommendations.map((item) => [item.program.id, item]));
    return compareIds.map((id) => byId.get(id)).filter((item): item is Recommendation => Boolean(item));
  }, [compareIds, memories]);

  if (selected.length < 2) {
    return (
      <StepGuard>
        <motion.div initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: EASE }}>
          <EmptyState
            icon={<IconScale />}
            title="Нужно минимум два варианта"
            description="Отметь две или три программы в подборке — здесь они встанут рядом: цена, стипендия, IELTS и дедлайны. Всё лишнее AXIOM уберёт сам."
            action={
              <Link href="/recommendations" className={buttonStyles("primary", "lg")}>
                К подборке
                <IconArrowRight className="h-4 w-4" />
              </Link>
            }
          />
        </motion.div>
      </StepGuard>
    );
  }

  const budget = getBudget(memories);
  const ielts = getIelts(memories);
  const count = selected.length;
  const matrixKey = selected.map((item) => item.program.id).join("|");

  const rows: RowSpec[] = [
    { key: "score", label: "Соответствие", values: selected.map((item) => item.score), mode: "max" },
    { key: "year", label: "В год", values: selected.map((item) => item.totalPerYearUsd), mode: "min" },
    { key: "total", label: "Вся программа", values: selected.map((item) => item.totalProgramUsd), mode: "min" },
    { key: "ielts", label: "IELTS", values: selected.map((item) => item.program.ieltsMin ?? 0), mode: "min" },
    {
      key: "scholarship",
      label: "Стипендия",
      values: selected.map((item) => SCHOLARSHIP_RANK[item.program.scholarship]),
      mode: "max",
      qualify: (best) => best > 0,
    },
    { key: "deadline", label: "Дедлайн", values: selected.map(() => null), mode: "min" },
    { key: "budget", label: "Бюджет", values: selected.map((item) => item.budgetDeltaUsd), mode: "max" },
  ];

  const rowRenderers: Record<string, (item: Recommendation) => React.ReactNode> = {
    score: (item) => (
      <span className="flex items-center gap-3">
        <FitMeter score={item.score} className="w-[112px] sm:w-[150px]" />
        <span className={cn("text-[11.5px]", scoreTone(item.score).text)}>
          {scoreTone(item.score).label.replace(" соответствие", "")}
        </span>
      </span>
    ),
    year: (item) => (
      <>
        {formatUsd(item.totalPerYearUsd)}
        <span className="ml-1.5 text-[10.5px] text-mist-500">с проживанием</span>
      </>
    ),
    total: (item) => formatUsd(item.totalProgramUsd),
    ielts: (item) =>
      item.program.ieltsMin ? (
        `от ${item.program.ieltsMin.toFixed(1)}`
      ) : (
        <span className="text-teal-300">не требуется</span>
      ),
    scholarship: (item) => scholarshipLabel(item.program.scholarship),
    deadline: (item) => {
      const deadline = item.program.deadlines[0];
      if (!deadline) return "уточняется";
      const info = deadlineRelative(deadline.date);
      return (
        <span className="flex flex-wrap items-baseline gap-x-2">
          {formatDateRu(deadline.date)}
          <span className={cn("text-[10.5px]", info.soon ? "text-amber-200" : "text-mist-500")}>{info.text}</span>
        </span>
      );
    },
    budget: (item) => budgetFitText(item),
  };

  const top = selected.reduce((best, item) => (item.score > best.score ? item : best), selected[0]);
  const topReason = dedupeReasons(top.reasons)[0]?.text ?? top.program.field;

  return (
    <StepGuard>
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div>
          <p className="eyebrow">Сравнение</p>
          <h1 className="mt-3 font-display text-4xl tracking-[-.05em] text-mist-50">Выбор между вариантами</h1>
          <p className="mt-3 max-w-xl text-[13px] leading-[1.7] text-mist-400">
            Лучшее по твоему профилю подсвечивается само — цена, стипендия, IELTS и сроки рядом.
          </p>
          {budget !== null || ielts !== null ? (
            <p className="mt-2 text-[11px] text-mist-600">
              Считаем по профилю
              {budget !== null ? <> · бюджет {formatUsd(budget)} в год</> : null}
              {ielts !== null ? <> · IELTS {ielts.toFixed(1)}</> : null}
            </p>
          ) : null}
        </div>
        <div className="flex items-center gap-5">
          <span className="text-[11px] text-mist-500 tnum">{count} из 3</span>
          <Link href="/recommendations" className="text-[12px] text-violet-300 transition-colors hover:text-violet-100">
            Добавить вариант →
          </Link>
          <button
            type="button"
            onClick={clearCompare}
            className="text-[12px] text-mist-500 transition-colors hover:text-mist-200"
          >
            Очистить
          </button>
        </div>
      </header>

      <motion.section
        initial={reduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE, delay: 0.05 }}
        className="panel-accent mt-7 p-5"
      >
        <div className="flex items-center justify-between gap-4">
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-violet-500/15 text-violet-300">
              <IconSparkles className="h-4 w-4" />
            </span>
            <span className="truncate text-[10px] uppercase tracking-[.18em] text-violet-300/80">
              Топ по твоему профилю
            </span>
          </span>
          <Link
            href={universityHref(top.program)}
            className="shrink-0 text-[12px] text-violet-300 transition-colors hover:text-violet-100"
          >
            Страница вуза →
          </Link>
        </div>
        <p className="mt-3 text-[13.5px] leading-relaxed text-mist-300">
          <span className="text-mist-50">{top.program.university}</span> — {Math.round(top.score)} из 100. {topReason}
        </p>
      </motion.section>

      <motion.div
        key={matrixKey}
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, ease: EASE, delay: 0.1 }}
        className="no-scrollbar -mx-4 mt-6 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0"
      >
        <div
          className="grid grid-cols-[84px_repeat(var(--cols),minmax(0,1fr))] gap-x-3 sm:grid-cols-[112px_repeat(var(--cols),minmax(0,1fr))] sm:gap-x-5"
          style={
            {
              "--cols": count,
              minWidth: LABEL_COL + count * 230 + (count - 1) * 16,
            } as CSSProperties
          }
        >
          <div aria-hidden="true" />

          {selected.map((item, index) => {
            const tone = scoreTone(item.score);
            return (
              <motion.div
                key={`head-${item.program.id}`}
                initial={reduce ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: EASE, delay: 0.12 + index * 0.08 }}
                className="pb-5"
              >
                <div className="group relative overflow-hidden rounded-2xl border border-white/[.08] bg-ink-950 transition-colors hover:border-white/[.18]">
                  <CampusBackdrop
                    programId={item.program.id}
                    priority={index === 0}
                    imageClassName="transition-transform duration-700 ease-out group-hover:scale-[1.04]"
                  />
                  <button
                    type="button"
                    onClick={() => toggleCompare(item.program.id)}
                    aria-label={`Убрать ${item.program.university} из сравнения`}
                    className="absolute right-2.5 top-2.5 z-20 rounded-full border border-white/12 bg-ink-950/45 p-2 text-white/55 backdrop-blur transition-colors hover:border-white/30 hover:text-white"
                  >
                    <IconX className="h-3.5 w-3.5" />
                  </button>
                  <div className="relative z-10 flex min-h-[168px] flex-col justify-end p-4">
                    <p className="text-[9.5px] uppercase tracking-[.16em] text-white/55">
                      {item.program.city}, {item.program.country}
                    </p>
                    <h2 className="mt-2 font-display text-[19px] font-medium leading-[1.05] tracking-[-.04em] text-white sm:text-[22px]">
                      {item.program.university}
                    </h2>
                    <p className="mt-1.5 line-clamp-2 text-[11px] leading-snug text-white/60">
                      {cleanName(item.program.programName)}
                    </p>
                  </div>
                </div>

                <div className="mt-3.5 flex items-center gap-3">
                  <ScoreRing score={item.score} delay={0.35 + index * 0.1} />
                  <span className="min-w-0">
                    <span className={cn("block text-[12px]", tone.text)}>{tone.label}</span>
                    <span className="mt-1 block text-[10.5px] leading-snug text-mist-500">
                      совпадение с фактами, не шанс
                    </span>
                  </span>
                </div>
              </motion.div>
            );
          })}

          {rows.map((row, rowIndex) => {
            const best = pickBest(row.values, row.mode);
            const highlightBest = best !== null && (!row.qualify || row.qualify(best));
            const warn = row.key === "budget" && best !== null && best < 0;
            return (
              <Fragment key={row.key}>
                <div className="border-t border-line-soft py-4 pr-3 text-[10px] uppercase tracking-[.14em] text-mist-500">
                  {row.label}
                </div>
                {selected.map((item, columnIndex) => {
                  const value = row.values[columnIndex];
                  const isBest = highlightBest && value !== null && value === best;
                  return (
                    <div key={`${row.key}-${item.program.id}`} className="border-t border-line-soft py-4">
                      <div className="relative inline-flex items-center gap-2">
                        {isBest ? <BestMark delay={0.4 + rowIndex * 0.07} warn={warn} reduce={reduce} /> : null}
                        {isBest ? (
                          <IconCheck
                            className={cn("relative h-3.5 w-3.5", warn ? "text-amber-300" : "text-teal-300")}
                          />
                        ) : null}
                        <span className="relative text-[13px] leading-snug text-mist-100 tnum">
                          {rowRenderers[row.key]?.(item)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </Fragment>
            );
          })}

          <div aria-hidden="true" className="border-t border-line-soft pt-4" />
          {selected.map((item) => (
            <div key={`actions-${item.program.id}`} className="border-t border-line-soft pt-4">
              <button
                type="button"
                onClick={() => {
                  setTarget(item.program.id);
                  router.push("/roadmap");
                }}
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-mist-50 px-4 py-2.5 text-[12px] font-medium text-ink-950 transition-colors hover:bg-white"
              >
                Выбрать целью
                <IconArrowRight className="h-3.5 w-3.5" />
              </button>
              <Link
                href={universityHref(item.program)}
                className="mt-2.5 flex items-center justify-center gap-1 text-[11.5px] text-mist-400 transition-colors hover:text-mist-100"
              >
                О вузе
                <IconArrowRight className="h-3 w-3" />
              </Link>
            </div>
          ))}
        </div>
      </motion.div>

      <p className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11px] leading-relaxed text-mist-600">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-teal-400" aria-hidden="true" />
          зелёное — вариант выигрывает по твоему профилю
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden="true" />
          жёлтое — ближе всех к бюджету, но всё ещё дороже
        </span>
        <span>Оценка соответствия — совпадение с фактами профиля, а не вероятность поступления.</span>
      </p>
    </StepGuard>
  );
}
