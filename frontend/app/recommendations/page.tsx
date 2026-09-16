"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StepGuard } from "@/components/shell/step-guard";
import { NextStepBar } from "@/components/shell/next-step-bar";
import { ProgramCard } from "@/components/flow/program-card";
import { SectionHeading } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { InfoNote } from "@/components/ui/note";
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
      "rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
      active
        ? "border-violet-500/50 bg-violet-500/20 text-violet-200"
        : "border-line bg-white/[0.03] text-mist-400 hover:bg-white/[0.07] hover:text-mist-200",
    );

  return (
    <StepGuard>
      <SectionHeading
        eyebrow="Шаг 3 из 6"
        title="Персональные рекомендации"
        description="Каждая программа объясняется через твою память: бюджет, интересы, IELTS и приоритет. Меняй факты — список перестроится."
        right={
          <Badge tone="amber" dot>
            Демо-данные · {PROGRAMS.length} программ в базе
          </Badge>
        }
        className="mb-6"
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setCountryFilter(null)} className={filterChip(countryFilter === null)}>
          Все страны
        </button>
        {countries.map((country) => (
          <button
            key={country}
            type="button"
            onClick={() => setCountryFilter(country === countryFilter ? null : country)}
            className={filterChip(countryFilter === country)}
          >
            {country}
          </button>
        ))}
        <span className="mx-1 hidden h-5 w-px bg-line sm:block" />
        <button type="button" onClick={() => setScholarshipOnly((value) => !value)} className={filterChip(scholarshipOnly)}>
          Со стипендией
        </button>
        <button type="button" onClick={() => setBudgetOnly((value) => !value)} className={filterChip(budgetOnly)}>
          В моём бюджете
        </button>
      </div>

      <div className="space-y-4">
        {filtered.map((item) => (
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

      {filtered.length === 0 ? (
        <div className="card px-6 py-10 text-center text-sm text-mist-400">
          Под выбранные фильтры ничего не попало — попробуй снять часть условий.
        </div>
      ) : null}

      <InfoNote tone="info" className="mt-6">
        Оценка соответствия рассчитывается детерминированным правилами движком по твоим фактам. «Почему подходит» и
        «чего не хватает» ссылаются на память — ничего не выдаётся без причины.
      </InfoNote>

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
