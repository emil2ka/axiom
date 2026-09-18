"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StepGuard } from "@/components/shell/step-guard";
import { NextStepBar } from "@/components/shell/next-step-bar";
import { ProgramCard } from "@/components/flow/program-card";
import { SectionHeading } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";
import { IconX } from "@/components/icons";
import { PROGRAMS, recommend } from "@/lib/shared/engine";
import { useAxiomStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function RecommendationsPage() {
  const memories = useAxiomStore((state) => state.memories);
  const favorites = useAxiomStore((state) => state.favorites);
  const compareIds = useAxiomStore((state) => state.compareIds);
  const toggleFavorite = useAxiomStore((state) => state.toggleFavorite);
  const toggleCompare = useAxiomStore((state) => state.toggleCompare);
  const clearCompare = useAxiomStore((state) => state.clearCompare);
  const setTargetProgram = useAxiomStore((state) => state.setTargetProgram);
  const router = useRouter();

  const [countryFilter, setCountryFilter] = useState<string | null>(null);
  const [scholarshipOnly, setScholarshipOnly] = useState(false);
  const [budgetOnly, setBudgetOnly] = useState(false);

  const recommendations = useMemo(() => recommend(memories).recommendations, [memories]);
  const countries = useMemo(
    () => [...new Set(recommendations.map((item) => item.program.country))],
    [recommendations],
  );

  const filtered = recommendations.filter(
    (item) =>
      (!countryFilter || item.program.country === countryFilter) &&
      (!scholarshipOnly || item.program.scholarship !== "none") &&
      (!budgetOnly || (item.budgetDeltaUsd ?? 0) >= 0 || item.program.scholarship === "full"),
  );

  const filterChip = (active: boolean) =>
    cn(
      "shrink-0 whitespace-nowrap border-b px-1 py-2 text-[12.5px] transition-colors",
      active
        ? "border-white text-white"
        : "border-transparent text-mist-500 hover:text-mist-200",
    );

  return (
    <StepGuard>
      <SectionHeading
        eyebrow="Шаг 3 из 6"
        title="Твои университеты"
        description="Университеты, которые подходят твоему профилю. Начни с первого варианта."
        right={
          <span className="text-[11px] text-mist-600">Демо · {PROGRAMS.length} программ</span>
        }
        className="mb-6"
      />

      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-5">
        <div className="no-scrollbar flex min-w-0 items-center gap-4 overflow-x-auto" aria-label="Фильтр по стране">
          <button type="button" aria-pressed={countryFilter === null} onClick={() => setCountryFilter(null)} className={filterChip(countryFilter === null)}>
            Все страны
          </button>
          {countries.map((country) => (
            <button
              key={country}
              type="button"
              aria-pressed={countryFilter === country}
              onClick={() => setCountryFilter(country === countryFilter ? null : country)}
              className={filterChip(countryFilter === country)}
            >
              {country}
            </button>
          ))}
        </div>
        <div className="flex shrink-0 items-center gap-4 sm:border-l sm:border-white/10 sm:pl-5">
          <button type="button" aria-pressed={scholarshipOnly} onClick={() => setScholarshipOnly((value) => !value)} className={filterChip(scholarshipOnly)}>
            Со стипендией
          </button>
          <button type="button" aria-pressed={budgetOnly} onClick={() => setBudgetOnly((value) => !value)} className={filterChip(budgetOnly)}>
            В моём бюджете
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {filtered[0] ? (
          <ProgramCard
            item={filtered[0]}
            featured
            favorite={favorites.includes(filtered[0].program.id)}
            inCompare={compareIds.includes(filtered[0].program.id)}
            compareDisabled={compareIds.length >= 3}
            compareSelectionCount={compareIds.length}
            onToggleFavorite={toggleFavorite}
            onToggleCompare={toggleCompare}
            onSetTarget={(programId) => {
              setTargetProgram(programId);
              router.push("/roadmap");
            }}
          />
        ) : null}

        {filtered.length > 1 ? (
          <div className="grid gap-5 lg:grid-cols-2">
            {filtered.slice(1).map((item) => (
              <ProgramCard
                key={item.program.id}
                item={item}
                favorite={favorites.includes(item.program.id)}
                inCompare={compareIds.includes(item.program.id)}
                compareDisabled={compareIds.length >= 3}
                compareSelectionCount={compareIds.length}
                onToggleFavorite={toggleFavorite}
                onToggleCompare={toggleCompare}
                onSetTarget={(programId) => {
                  setTargetProgram(programId);
                  router.push("/roadmap");
                }}
              />
            ))}
          </div>
        ) : null}
      </div>

      {filtered.length === 0 ? (
        <div className="card px-6 py-10 text-center text-sm text-mist-400">
          Под выбранные фильтры ничего не попало — попробуй снять часть условий.
        </div>
      ) : null}

      {compareIds.length > 0 ? (
        <div className="sticky bottom-4 z-30 mt-6">
          <div className="card flex flex-wrap items-center justify-between gap-3 border-violet-500/30 px-4 py-3">
            <p className="text-[13px] text-mist-200">
              В сравнении: <span className="font-semibold tabular-nums">{compareIds.length} из 3</span>
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={clearCompare}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[12.5px] text-mist-400 transition-colors hover:bg-white/[0.06] hover:text-mist-100"
              >
                <IconX className="h-3.5 w-3.5" />
                Очистить
              </button>
              <Link
                href="/compare"
                className={buttonStyles(compareIds.length >= 2 ? "primary" : "secondary", "md")}
                aria-disabled={compareIds.length < 2}
              >
                Сравнить
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <NextStepBar
        backHref="/diagnosis"
        backLabel="К диагностике"
        nextHref={compareIds.length >= 2 ? "/compare" : undefined}
        nextLabel="К сравнению"
        disabledReason={compareIds.length < 2 ? "Выбери минимум 2 программы для сравнения" : undefined}
      />
    </StepGuard>
  );
}
