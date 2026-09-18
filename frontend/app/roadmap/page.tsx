"use client";

import { useMemo } from "react";
import Link from "next/link";
import { StepGuard } from "@/components/shell/step-guard";
import { IconArrowRight, IconCheck, IconClock, IconTarget } from "@/components/icons";
import { CampusBackdrop } from "@/components/flow/campus-backdrop";
import { PROGRAMS, applyWhatIf, buildRoadmap, formatUsd, recommend } from "@/lib/shared/engine";
import { universityHref } from "@/lib/university";
import { DEFAULT_WHATIF, useAxiomStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function RoadmapPage() {
  const memories = useAxiomStore((s) => s.memories); const targetId = useAxiomStore((s) => s.targetProgramId); const done = useAxiomStore((s) => s.roadmapDone); const toggle = useAxiomStore((s) => s.toggleRoadmapStep); const whatIf = useAxiomStore((s) => s.whatIf);
  const fromWhatIf = targetId === null && whatIf.presetId !== DEFAULT_WHATIF.presetId;
  const target = useMemo(() => {
    if (targetId) return PROGRAMS.find((x) => x.id === targetId) ?? null;
    const list = fromWhatIf
      ? applyWhatIf(memories, { budget: whatIf.budget, ielts: whatIf.ielts, countries: null, countryWeight: whatIf.countryWeight, budgetWeight: whatIf.budgetWeight, scholarshipWeight: whatIf.scholarshipWeight }).recommendations
      : recommend(memories).recommendations;
    return list[0]?.program ?? null;
  }, [memories, targetId, whatIf, fromWhatIf]);
  const roadmap = useMemo(() => buildRoadmap(memories, target), [memories, target]); const next = roadmap.steps.find((step) => !done[step.id]);
  return <StepGuard>
    <main><header className="mb-7"><h1 className="font-display text-4xl tracking-[-.05em] text-mist-50">Маршрут</h1></header>
    {target ? <section className="relative isolate overflow-hidden rounded-[25px] border border-white/[.09] bg-ink-950 p-6 sm:p-8"><CampusBackdrop programId={target.id} /><div className="relative z-10"><p className="eyebrow">Твоя цель</p><h2 className="mt-2 max-w-xl font-display text-4xl leading-[.95] tracking-[-.05em] text-white"><Link href={universityHref(target)} className="transition-colors hover:text-violet-100">{target.university}</Link></h2><p className="mt-3 text-[13px] text-white/70">{target.programName.replace(/\s*\(на английском\)/i, "")} · {formatUsd(target.tuitionPerYearUsd * target.durationYears + target.livingPerYearUsd * target.durationYears)}</p><div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2"><Link href="/recommendations" className="text-[12px] text-violet-300 hover:text-violet-100">Сменить цель →</Link><Link href={universityHref(target)} className="text-[12px] text-mist-400 hover:text-mist-200">О вузе →</Link>{fromWhatIf ? <Link href="/whatif" className="text-[12px] text-mist-400 hover:text-mist-200">выбрано по приоритетам «А если иначе?»</Link> : null}</div></div></section> : null}
    {next ? <section className="mt-6 rounded-[24px] border border-violet-400/30 bg-violet-500/[.07] p-6 sm:p-8"><p className="flex items-center gap-2 text-[11px] uppercase tracking-[.16em] text-violet-300"><IconArrowRight className="h-3.5 w-3.5" />Следующее действие</p><div className="mt-4 flex flex-wrap items-end justify-between gap-5"><div><h2 className="font-display text-3xl tracking-[-.04em] text-mist-50">{next.title}</h2><p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-mist-300">{next.description}</p><p className={cn("mt-3 inline-flex items-center gap-1.5 text-[11px]", next.overdue ? "text-rose-300" : "text-mist-500")}><IconClock className="h-3.5 w-3.5" />{next.dueMonth}{next.overdue ? " · срок по спокойному графику уже прошёл" : ""}</p>{roadmap.pace !== "comfortable" && roadmap.paceNote ? <p className={cn("mt-2 max-w-2xl text-[12px] leading-relaxed", roadmap.pace === "urgent" ? "text-rose-200/90" : "text-amber-200/90")}>{roadmap.paceNote}</p> : null}</div><button onClick={() => toggle(next.id)} className="rounded-full bg-mist-50 px-4 py-3 text-[12px] font-medium text-ink-950"><IconCheck className="mr-1.5 inline h-3.5 w-3.5" />Готово</button></div></section> : <p className="mt-6 text-mist-300">Все шаги выполнены.</p>}
    <section className="mt-8"><p className="eyebrow">Временная линия</p><ol className="mt-5 space-y-0">{roadmap.steps.map((step, index) => <li key={step.id} className="relative flex gap-5 pb-6 last:pb-0"><span className={cn("z-10 mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-full border", done[step.id] ? "border-violet-400 bg-violet-400 text-ink-950" : step.overdue ? "border-rose-400/50 bg-ink-900 text-rose-300" : "border-line bg-ink-900 text-mist-500")}><button onClick={() => toggle(step.id)} aria-label={done[step.id] ? `Снять отметку ${step.title}` : `Отметить ${step.title}`}><IconCheck className="h-3.5 w-3.5" /></button></span>{index < roadmap.steps.length - 1 ? <span className="absolute left-[13px] top-8 h-[calc(100%-18px)] w-px bg-line-soft" /> : null}<div className={cn("pt-1", done[step.id] && "opacity-45")}><p className={cn("text-[10px] uppercase tracking-[.14em]", step.overdue && !done[step.id] ? "text-rose-300" : "text-mist-500")}>{step.dueMonth}</p><h3 className="mt-1 text-[15px] text-mist-100">{step.title}</h3><details className="mt-1 text-[12px] text-mist-500"><summary className="cursor-pointer hover:text-mist-200">Подробнее</summary><p className="mt-2 max-w-xl leading-relaxed">{step.description}</p><p className="mt-2 text-mist-400">{step.why}</p></details></div></li>)}</ol></section>
    </main>
  </StepGuard>;
}
