"use client";

import { useMemo } from "react";
import Link from "next/link";
import { StepGuard } from "@/components/shell/step-guard";
import { NextStepBar } from "@/components/shell/next-step-bar";
import { Card, SectionHeading } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar, ScoreRing } from "@/components/ui/progress";
import { InfoNote } from "@/components/ui/note";
import { Button } from "@/components/ui/button";
import {
  IconArrowRight,
  IconCalendar,
  IconCheck,
  IconClock,
  IconCompass,
  IconListChecks,
  IconSparkles,
  IconTarget,
  IconTrophy,
} from "@/components/icons";
import { applyWhatIf, buildRoadmap, formatUsd, recommend, PROGRAMS } from "@/lib/shared/engine";
import type { RoadmapCategory, RoadmapStep } from "@/lib/shared/engine";
import { useAxiomStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const CATEGORY_ORDER: RoadmapCategory[] = ["exam", "documents", "deadline", "activity"];

const CATEGORY_META: Record<RoadmapCategory, { label: string; icon: React.ReactNode }> = {
  exam: { label: "Экзамены", icon: <IconTarget className="h-4 w-4" /> },
  documents: { label: "Документы", icon: <IconListChecks className="h-4 w-4" /> },
  deadline: { label: "Дедлайны", icon: <IconCalendar className="h-4 w-4" /> },
  activity: { label: "Активности", icon: <IconSparkles className="h-4 w-4" /> },
};

function StepRow({
  step,
  done,
  onToggle,
}: {
  step: RoadmapStep;
  done: boolean;
  onToggle: () => void;
}) {
  return (
    <li className="flex gap-3.5 py-3.5">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={done}
        aria-label={done ? `Снять отметку: ${step.title}` : `Отметить выполненным: ${step.title}`}
        className={cn(
          "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border transition-colors",
          done
            ? "border-teal-400/60 bg-teal-400/20 text-teal-300"
            : "border-line bg-white/[0.03] text-transparent hover:border-violet-500/60 hover:text-violet-300/50",
        )}
      >
        <IconCheck className="h-3.5 w-3.5" />
      </button>
      <div className={cn("min-w-0 flex-1 transition-opacity", done && "opacity-55")}>
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("text-[13.5px] font-medium text-mist-100", done && "line-through decoration-mist-500")}>
            {step.title}
          </p>
          <Badge tone="neutral">
            <IconClock className="h-3 w-3" />
            {step.dueMonth}
          </Badge>
        </div>
        <p className="mt-1 text-[12.5px] leading-relaxed text-mist-400">{step.description}</p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-mist-500">Почему: {step.why}</p>
        <p className="mt-0.5 text-[11px] text-mist-600">
          {step.sourceNote.replace(/^Демо-данные\s·\s/, "")}
        </p>
      </div>
    </li>
  );
}

export default function RoadmapPage() {
  const memories = useAxiomStore((state) => state.memories);
  const whatIf = useAxiomStore((state) => state.whatIf);
  const targetProgramId = useAxiomStore((state) => state.targetProgramId);
  const roadmapDone = useAxiomStore((state) => state.roadmapDone);
  const toggleRoadmapStep = useAxiomStore((state) => state.toggleRoadmapStep);
  const clearRoadmapProgress = useAxiomStore((state) => state.clearRoadmapProgress);

  const target = useMemo(() => {
    if (targetProgramId) return PROGRAMS.find((item) => item.id === targetProgramId) ?? null;
    const custom = whatIf.presetId !== "balanced";
    const list = custom
      ? applyWhatIf(memories, {
          budget: whatIf.budget,
          ielts: whatIf.ielts,
          countries: null,
          countryWeight: whatIf.countryWeight,
          budgetWeight: whatIf.budgetWeight,
          scholarshipWeight: whatIf.scholarshipWeight,
        }).recommendations
      : recommend(memories).recommendations;
    return list[0]?.program ?? null;
  }, [targetProgramId, whatIf, memories]);

  const roadmap = useMemo(() => buildRoadmap(memories, target), [memories, target]);

  const doneCount = roadmap.steps.filter((step) => roadmapDone[step.id]).length;
  const progress = roadmap.steps.length ? (doneCount / roadmap.steps.length) * 100 : 0;
  const nextStep = roadmap.steps.find((step) => !roadmapDone[step.id]) ?? null;
  const targetFromWhatIf = targetProgramId === null && whatIf.presetId !== "balanced";

  const grouped = CATEGORY_ORDER.map((category) => ({
    category,
    steps: roadmap.steps.filter((step) => step.category === category),
  })).filter((group) => group.steps.length > 0);

  return (
    <StepGuard>
      <SectionHeading
        eyebrow="Шаг 6 из 6"
        title="Маршрут поступления"
        description="План из экзаменов, документов, дедлайнов и активностей — под цель, которую ты выбрал."
        right={
          <Button variant="ghost" size="sm" onClick={clearRoadmapProgress} disabled={doneCount === 0}>
            Сбросить прогресс
          </Button>
        }
        className="mb-6"
      />

      {target ? (
        <Card className="mb-6 border-violet-500/25 bg-violet-500/[0.05]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-300">
                <IconCompass className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-300">Цель маршрута</p>
                <p className="mt-1 font-display text-[15px] font-semibold text-mist-50">{target.university}</p>
                <p className="mt-0.5 text-[12.5px] text-mist-400">
                  {target.programName} · {target.country}, {target.city} · {formatUsd(target.tuitionPerYearUsd + target.livingPerYearUsd)}/год
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {targetFromWhatIf ? <Badge tone="violet">выбрано по приоритетам What If</Badge> : null}
              <Link href="/recommendations" className="text-[12.5px] text-violet-300 transition-colors hover:text-violet-200">
                Сменить цель →
              </Link>
            </div>
          </div>
        </Card>
      ) : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {nextStep ? (
            <Card className="border-violet-500/30 bg-violet-500/[0.05]">
              <p className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-violet-300">
                <IconArrowRight className="h-3.5 w-3.5" />
                Твой следующий шаг
              </p>
              <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-xl">
                  <p className="font-display text-lg font-semibold text-mist-50">{nextStep.title}</p>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-mist-300">{nextStep.description}</p>
                  <p className="mt-2 text-[12px] text-mist-500">
                    Срок: {nextStep.dueMonth} · {nextStep.sourceNote}
                  </p>
                  {/* Запас времени до подачи: без этой строки человек не знает,
                      что дедлайн ближе, чем требует спокойный график. */}
                  <p
                    className={cn(
                      "mt-1.5 text-[12px]",
                      roadmap.pace === "urgent"
                        ? "text-rose-300"
                        : roadmap.pace === "tight"
                          ? "text-amber-300"
                          : "text-mist-500",
                    )}
                  >
                    {roadmap.paceNote}
                  </p>
                </div>
                <Button size="lg" onClick={() => toggleRoadmapStep(nextStep.id)}>
                  <IconCheck className="h-4 w-4" />
                  Отметить выполненным
                </Button>
              </div>
            </Card>
          ) : (
            <Card className="border-lime-400/30 bg-lime-400/[0.06]">
              <p className="flex items-center gap-2 font-display text-base font-semibold text-mist-50">
                <IconTrophy className="h-4.5 w-4.5 text-lime-400" />
                Все шаги маршрута выполнены
              </p>
              <p className="mt-1.5 text-[13px] text-mist-300">
                Ты прошёл план до конца. Проверь финальные дедлайны на сайтах вузов и подай документы.
              </p>
            </Card>
          )}

          {grouped.map((group) => (
            <Card key={group.category} className="px-4 py-3 sm:px-5">
              <h3 className="flex items-center gap-2 border-b border-line-soft pb-3 pt-1 font-display text-[13.5px] font-semibold text-mist-100">
                <span className="text-violet-300">{CATEGORY_META[group.category].icon}</span>
                {CATEGORY_META[group.category].label}
                <span className="ml-auto text-[11.5px] font-normal tabular-nums text-mist-500">
                  {group.steps.filter((step) => roadmapDone[step.id]).length}/{group.steps.length}
                </span>
              </h3>
              <ul className="divide-y divide-line-soft">
                {group.steps.map((step) => (
                  <StepRow
                    key={step.id}
                    step={step}
                    done={Boolean(roadmapDone[step.id])}
                    onToggle={() => toggleRoadmapStep(step.id)}
                  />
                ))}
              </ul>
            </Card>
          ))}
        </div>

        <div className="space-y-4 lg:sticky lg:top-28">
          <Card>
            <div className="flex items-center gap-5">
              <ScoreRing value={progress} size={82} label="готово" />
              <div>
                <p className="font-display text-sm font-semibold text-mist-50">Прогресс маршрута</p>
                <p className="mt-1 text-[12.5px] text-mist-400">
                  {doneCount} из {roadmap.steps.length} шагов выполнено
                </p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {grouped.map((group) => {
                const done = group.steps.filter((step) => roadmapDone[step.id]).length;
                const value = (done / group.steps.length) * 100;
                return (
                  <div key={group.category} className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11.5px] text-mist-400">
                      <span>{CATEGORY_META[group.category].label}</span>
                      <span className="tabular-nums">
                        {done}/{group.steps.length}
                      </span>
                    </div>
                    <ProgressBar value={value} size="sm" tone={value === 100 ? "teal" : "violet"} />
                  </div>
                );
              })}
            </div>
          </Card>

          <InfoNote tone="data">
            Шаги и дедлайны построены на демо-данных программы «{target?.university ?? "—"}» и общих требованиях
            европейских вузов. Перед подачей сверься с официальным сайтом.
          </InfoNote>
        </div>
      </div>

      <NextStepBar backHref="/whatif" backLabel="К What If">
        <Link href="/compare" className="text-[12.5px] text-mist-400 transition-colors hover:text-mist-200">
          Вернуться к сравнению
        </Link>
      </NextStepBar>
    </StepGuard>
  );
}
