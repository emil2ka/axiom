"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { StepGuard } from "@/components/shell/step-guard";
import { NextStepBar } from "@/components/shell/next-step-bar";
import { Card, SectionHeading } from "@/components/ui/card";
import { RangeSlider } from "@/components/ui/slider";
import { InfoNote } from "@/components/ui/note";
import { Button } from "@/components/ui/button";
import { IconRefresh, IconSparkles } from "@/components/icons";
import { DEFAULT_WHATIF, useAxiomStore } from "@/lib/store";
import { WHATIF_PRESETS, applyWhatIf, formatUsd, getBudget, getIelts } from "@/lib/shared/engine";
import type { RankDiff, WhatIfParams, WhatIfPreset } from "@/lib/shared/engine";
import { cn } from "@/lib/utils";

const WEIGHT_ROWS: { key: "countryWeight" | "budgetWeight" | "scholarshipWeight"; label: string }[] = [
  { key: "countryWeight", label: "Важность страны" },
  { key: "budgetWeight", label: "Важность бюджета" },
  { key: "scholarshipWeight", label: "Важность стипендии" },
];

function weightLabel(value: number): string {
  if (value === 0) return "не важно";
  if (value <= 1) return "стандартно";
  if (value <= 2) return "важно";
  return "критично";
}

function deltaBadge(diff: RankDiff) {
  if (diff.delta > 0) return <span className="text-[11.5px] tabular-nums text-teal-300">▲ +{diff.delta}</span>;
  if (diff.delta < 0) return <span className="text-[11.5px] tabular-nums text-rose-300">▼ {diff.delta}</span>;
  return <span className="text-[11.5px] text-violet-300">+ в топ-5</span>;
}

export default function WhatIfPage() {
  const memories = useAxiomStore((state) => state.memories);
  const whatIf = useAxiomStore((state) => state.whatIf);
  const setWhatIf = useAxiomStore((state) => state.setWhatIf);

  const profileBudget = getBudget(memories);
  const profileIelts = getIelts(memories);

  const budgetValue = whatIf.budget ?? profileBudget ?? 15000;
  const ieltsValue = whatIf.ielts ?? profileIelts ?? 5.5;

  const params: WhatIfParams = useMemo(
    () => ({
      budget: whatIf.budget,
      ielts: whatIf.ielts,
      countries: null,
      countryWeight: whatIf.countryWeight,
      budgetWeight: whatIf.budgetWeight,
      scholarshipWeight: whatIf.scholarshipWeight,
    }),
    [whatIf],
  );

  const result = useMemo(() => applyWhatIf(memories, params), [memories, params]);
  const diffById = new Map<string, RankDiff>();
  for (const diff of [...result.diff.moved, ...result.diff.entered]) diffById.set(diff.programId, diff);

  const applyPreset = (preset: WhatIfPreset) => {
    setWhatIf({
      presetId: preset.id,
      budget: preset.params.budget ?? null,
      ielts: preset.params.ielts ?? null,
      countryWeight: preset.params.countryWeight,
      budgetWeight: preset.params.budgetWeight,
      scholarshipWeight: preset.params.scholarshipWeight,
    });
  };

  const isCustom = whatIf.presetId === "custom";

  return (
    <StepGuard>
      <SectionHeading
        eyebrow="Шаг 5 из 6"
        title="What If — а если поменять приоритеты?"
        description="Подвигай бюджет, IELTS и важность критериев — AXIOM мгновенно перестроит рейтинг и объяснит, что изменилось."
        right={
          <Button variant="ghost" size="sm" onClick={() => setWhatIf(DEFAULT_WHATIF)}>
            <IconRefresh className="h-3.5 w-3.5" />
            Сбросить
          </Button>
        }
        className="mb-6"
      />

      <div className="grid items-start gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
        <div className="space-y-5 lg:sticky lg:top-28">
          <Card className="space-y-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist-500">Быстрые сценарии</p>
            <div className="flex flex-wrap gap-2">
              {WHATIF_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className={cn(
                    "rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
                    whatIf.presetId === preset.id
                      ? "border-violet-500/50 bg-violet-500/20 text-violet-200"
                      : "border-line bg-white/[0.03] text-mist-400 hover:bg-white/[0.07] hover:text-mist-200",
                  )}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist-500">Параметры</p>
            <RangeSlider
              label="Бюджет в год"
              min={5000}
              max={30000}
              step={500}
              value={budgetValue}
              display={formatUsd(budgetValue)}
              onChange={(value) => setWhatIf({ budget: value, presetId: "custom" })}
            />
            <RangeSlider
              label="IELTS"
              min={4}
              max={8}
              step={0.5}
              value={ieltsValue}
              display={ieltsValue.toFixed(1)}
              onChange={(value) => setWhatIf({ ielts: value, presetId: "custom" })}
            />
            <div className="space-y-4 border-t border-line-soft pt-4">
              {WEIGHT_ROWS.map((row) => (
                <RangeSlider
                  key={row.key}
                  label={row.label}
                  min={0}
                  max={3}
                  step={0.5}
                  value={whatIf[row.key]}
                  display={weightLabel(whatIf[row.key])}
                  onChange={(value) => {
                    const patch =
                      row.key === "countryWeight"
                        ? { countryWeight: value }
                        : row.key === "budgetWeight"
                          ? { budgetWeight: value }
                          : { scholarshipWeight: value };
                    setWhatIf({ ...patch, presetId: "custom" });
                  }}
                />
              ))}
            </div>
            {profileBudget === null || profileIelts === null ? (
              <p className="text-[11.5px] leading-relaxed text-mist-500">
                В профиле не хватает {profileBudget === null ? "бюджета" : ""}
                {profileBudget === null && profileIelts === null ? " и " : ""}
                {profileIelts === null ? "IELTS" : ""} — слайдеры выше используются как симуляция «а если».
              </p>
            ) : null}
          </Card>
        </div>

        <div className="space-y-4">
          <Card className="border-violet-500/25 bg-violet-500/[0.05]">
            <p className="flex items-center gap-2 text-[13px] font-medium text-violet-200">
              <IconSparkles className="h-4 w-4" />
              {result.summary}
            </p>
            {result.diff.entered.length || result.diff.dropped.length ? (
              <div className="mt-3 space-y-1 border-t border-line-soft pt-3 text-[12.5px] leading-relaxed">
                {result.diff.entered.length ? (
                  <p className="text-mist-400">
                    <span className="text-teal-300">вошли: </span>
                    {result.diff.entered.map((diff) => diff.name).join(", ")}
                  </p>
                ) : null}
                {result.diff.dropped.length ? (
                  <p className="text-mist-400">
                    <span className="text-rose-300">выпали: </span>
                    {result.diff.dropped.map((diff) => diff.name).join(", ")}
                  </p>
                ) : null}
              </div>
            ) : null}
          </Card>

          <ul className="space-y-3">
            {result.recommendations.slice(0, 6).map((item) => {
              const diff = diffById.get(item.program.id);
              return (
                <motion.li
                  key={item.program.id}
                  layout
                  transition={{ type: "spring", stiffness: 340, damping: 30 }}
                  className="card flex flex-wrap items-center justify-between gap-4 p-4 sm:px-5"
                >
                  <div className="flex min-w-0 items-center gap-4">
                    <span className="shrink-0 font-display text-[13px] tabular-nums text-mist-600">
                      {String(item.rank).padStart(2, "0")}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-display text-[13.5px] text-mist-50">{item.program.university}</p>
                      <p className="mt-0.5 text-[11.5px] text-mist-500">
                        {item.program.country}, {item.program.city} · {formatUsd(item.totalPerYearUsd)}/год
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {diff ? deltaBadge(diff) : null}
                    <span className="w-7 text-right font-display text-[15px] tabular-nums text-violet-400">
                      {item.score}
                    </span>
                  </div>
                </motion.li>
              );
            })}
          </ul>

          <InfoNote tone="info">
            Приоритеты сохраняются, и если ты уйдёшь на «Маршрут», целью станет топ-1 по твоим новым приоритетам.
            {isCustom ? " Сейчас активен свой набор приоритетов." : ""}
          </InfoNote>
        </div>
      </div>

      <NextStepBar backHref="/compare" backLabel="К сравнению" nextHref="/roadmap" nextLabel="К маршруту" />
    </StepGuard>
  );
}
