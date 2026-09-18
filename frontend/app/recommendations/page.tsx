"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ProgramCard } from "@/components/flow/program-card";
import { StepGuard } from "@/components/shell/step-guard";
import { IconScale, IconX } from "@/components/icons";
import { recommend } from "@/lib/shared/engine";
import { useAxiomStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function RecommendationsPage() {
  const memories = useAxiomStore((s) => s.memories); const favorites = useAxiomStore((s) => s.favorites); const compareIds = useAxiomStore((s) => s.compareIds); const toggleFavorite = useAxiomStore((s) => s.toggleFavorite); const toggleCompare = useAxiomStore((s) => s.toggleCompare); const clearCompare = useAxiomStore((s) => s.clearCompare); const setTarget = useAxiomStore((s) => s.setTargetProgram); const router = useRouter();
  const [country, setCountry] = useState<string | null>(null); const [scholarship, setScholarship] = useState(false); const [budget, setBudget] = useState(false);
  const results = useMemo(() => recommend(memories).recommendations, [memories]); const countries = useMemo(() => [...new Set(results.map((x) => x.program.country))], [results]);
  const visible = results.filter((x) => (!country || x.program.country === country) && (!scholarship || x.program.scholarship !== "none") && (!budget || x.program.scholarship === "full" || (x.budgetDeltaUsd ?? -1) >= 0));
  const choose = (id: string) => { setTarget(id); router.push("/roadmap"); };
  const chip = (active: boolean) => cn("shrink-0 rounded-full border px-3 py-1.5 text-[11px] transition-colors", active ? "border-violet-400/50 bg-violet-500/15 text-mist-50" : "border-line text-mist-500 hover:text-mist-100");
  return <StepGuard><header className="mb-6 flex flex-wrap items-end justify-between gap-4"><div><h1 className="font-display text-4xl tracking-[-.05em] text-mist-50">Твои университеты</h1></div><p className="text-[11px] text-mist-500">{visible.length} вариантов</p></header>
    <div className="no-scrollbar mb-6 flex gap-2 overflow-x-auto pb-1"><button className={chip(country === null)} onClick={() => setCountry(null)}>Все</button>{countries.map((name) => <button key={name} className={chip(country === name)} onClick={() => setCountry(country === name ? null : name)}>{name}</button>)}<span className="mx-1 h-7 w-px bg-line" /><button className={chip(scholarship)} onClick={() => setScholarship(!scholarship)}>Стипендия</button><button className={chip(budget)} onClick={() => setBudget(!budget)}>В бюджете</button></div>
    {visible.length ? <div className="space-y-5"><ProgramCard item={visible[0]} featured favorite={favorites.includes(visible[0].program.id)} inCompare={compareIds.includes(visible[0].program.id)} compareDisabled={compareIds.length >= 3} compareSelectionCount={compareIds.length} onToggleFavorite={toggleFavorite} onToggleCompare={toggleCompare} onSetTarget={choose} /><div className="grid gap-5 lg:grid-cols-2">{visible.slice(1).map((item) => <ProgramCard key={item.program.id} item={item} favorite={favorites.includes(item.program.id)} inCompare={compareIds.includes(item.program.id)} compareDisabled={compareIds.length >= 3} compareSelectionCount={compareIds.length} onToggleFavorite={toggleFavorite} onToggleCompare={toggleCompare} onSetTarget={choose} />)}</div></div> : <p className="py-16 text-center text-mist-500">Измени фильтры, чтобы увидеть варианты.</p>}
    {visible.length ? <p className="mt-7 text-[11px] leading-relaxed text-mist-600">Оценка соответствия — совпадение с твоими фактами, а не вероятность поступления. Стоимость, стипендия и сроки — внутри карточки.</p> : null}
    {compareIds.length ? <div className="sticky bottom-5 z-20 mt-6 flex items-center justify-between rounded-full border border-violet-400/30 bg-ink-900/90 px-4 py-3 shadow-xl backdrop-blur"><span className="inline-flex items-center gap-2 text-[12px] text-mist-200"><IconScale className="h-4 w-4 text-violet-300" />{compareIds.length} в сравнении</span><span className="flex gap-3"><button onClick={clearCompare} className="text-[11px] text-mist-500 hover:text-mist-100"><IconX className="inline h-3 w-3" /> очистить</button><Link href="/compare" className="text-[12px] text-violet-300 hover:text-violet-100">Сравнить →</Link></span></div> : null}
  </StepGuard>;
}
