"use client";

import { useMemo } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { StepGuard } from "@/components/shell/step-guard";
import { RangeSlider } from "@/components/ui/slider";
import { IconRefresh, IconSparkles } from "@/components/icons";
import { CampusBackdrop } from "@/components/flow/campus-backdrop";
import { applyWhatIf, formatUsd, getBudget, getIelts } from "@/lib/shared/engine";
import { universityHref } from "@/lib/university";
import { DEFAULT_WHATIF, useAxiomStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function WhatIfPage() {
  const memories = useAxiomStore((s) => s.memories); const whatIf = useAxiomStore((s) => s.whatIf); const setWhatIf = useAxiomStore((s) => s.setWhatIf); const reduce = useReducedMotion();
  const budget = whatIf.budget ?? getBudget(memories) ?? 15000; const ielts = whatIf.ielts ?? getIelts(memories) ?? 5.5;
  const result = useMemo(() => applyWhatIf(memories, { budget, ielts, countries: null, countryWeight: whatIf.countryWeight, budgetWeight: whatIf.budgetWeight, scholarshipWeight: whatIf.scholarshipWeight }), [memories, budget, ielts, whatIf]);
  return <StepGuard>
    <main><header className="mb-7 flex items-end justify-between gap-4"><div><h1 className="font-display text-4xl tracking-[-.05em] text-mist-50">А если иначе?</h1></div><button onClick={() => setWhatIf(DEFAULT_WHATIF)} className="inline-flex items-center gap-2 text-[12px] text-mist-500 hover:text-mist-100"><IconRefresh className="h-3.5 w-3.5" />Сбросить</button></header>
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]"><section className="rounded-[22px] border border-white/[.09] bg-ink-900 p-5 lg:sticky lg:top-24 lg:h-fit"><p className="eyebrow">Три изменения</p><div className="mt-6 space-y-7"><RangeSlider label="Бюджет в год" min={5000} max={30000} step={500} value={budget} display={formatUsd(budget)} onChange={(value) => setWhatIf({ budget: value, presetId: "custom" })} /><RangeSlider label="IELTS" min={4} max={8} step={0.5} value={ielts} display={ielts.toFixed(1)} onChange={(value) => setWhatIf({ ielts: value, presetId: "custom" })} /><RangeSlider label="Стипендия важнее" min={0} max={3} step={.5} value={whatIf.scholarshipWeight} display={whatIf.scholarshipWeight >= 2 ? "сильно" : whatIf.scholarshipWeight > 0 ? "учесть" : "не важно"} onChange={(value) => setWhatIf({ scholarshipWeight: value, presetId: "custom" })} /></div></section>
      <section><div className="mb-2 flex items-center gap-3 rounded-2xl border border-violet-400/25 bg-violet-500/[.06] px-4 py-3"><IconSparkles className="h-4 w-4 text-violet-300" /><p className="text-[13px] text-mist-200">{result.summary}</p></div><p className="mb-4 text-[11px] text-mist-600">Если уйти на «Маршрут», цель будет выбрана по этому порядку.</p><p className="mb-4 text-[11px] uppercase tracking-[.16em] text-mist-500">Новый порядок</p><div className="grid gap-3 sm:grid-cols-2">{result.recommendations.slice(0, 6).map((item, index) => <motion.article layout={!reduce} key={item.program.id} initial={reduce ? false : { opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={cn("group relative isolate min-h-[230px] overflow-hidden rounded-[20px] border border-white/[.08] bg-ink-950", index === 0 && "sm:col-span-2 sm:min-h-[320px]")}><CampusBackdrop programId={item.program.id} imageClassName="transition-transform duration-500 group-hover:scale-[1.03]" /><div className="relative flex min-h-[inherit] flex-col justify-between p-4"><span className="w-fit rounded-full border border-white/15 bg-ink-950/40 px-2 py-1 text-[10px] text-white/75">{String(item.rank).padStart(2, "0")}</span><div><h2 className={cn("font-display leading-none text-white", index === 0 ? "text-[31px]" : "text-[20px]")}><Link href={universityHref(item.program)} className="transition-colors hover:text-violet-100">{item.program.university}</Link></h2><p className="mt-2 text-[12px] text-white/70">{item.reasons[0]?.text ?? item.program.field}</p></div></div></motion.article>)}</div></section></div>
    </main>
  </StepGuard>;
}
