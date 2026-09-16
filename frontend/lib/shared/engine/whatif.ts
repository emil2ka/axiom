import type { MemoryFact, RankDiff, RecommendResult, ScoreWeights, WhatIfParams, WhatIfResult } from "../types";
import { pluralRu } from "./format";
import { DEFAULT_WEIGHTS, recommend } from "./recommend";

export interface WhatIfPreset {
  id: string;
  label: string;
  params: WhatIfParams;
}

export const WHATIF_PRESETS: WhatIfPreset[] = [
  {
    id: "balanced",
    label: "Сбалансировано",
    params: { countryWeight: 1, budgetWeight: 1, scholarshipWeight: 1 },
  },
  {
    id: "scholarship-first",
    label: "Стипендия важнее страны",
    params: { countryWeight: 0.35, budgetWeight: 1, scholarshipWeight: 3.5 },
  },
  {
    id: "budget-first",
    label: "Бюджет важнее всего",
    params: { countryWeight: 1, budgetWeight: 2.2, scholarshipWeight: 0.6 },
  },
  {
    id: "budget-10k",
    label: "Бюджет до $10k",
    params: { budget: 10000, countryWeight: 1, budgetWeight: 1, scholarshipWeight: 1 },
  },
  {
    id: "ielts-7",
    label: "Подтяну IELTS до 7.0",
    params: { ielts: 7, countryWeight: 1, budgetWeight: 1, scholarshipWeight: 1 },
  },
];

export function buildWeights(params: WhatIfParams): ScoreWeights {
  const base: ScoreWeights = {
    budget: DEFAULT_WEIGHTS.budget * (params.budgetWeight ?? 1),
    country: DEFAULT_WEIGHTS.country * (params.countryWeight ?? 1),
    ielts: DEFAULT_WEIGHTS.ielts,
    field: DEFAULT_WEIGHTS.field,
    scholarship: DEFAULT_WEIGHTS.scholarship * (params.scholarshipWeight ?? 1),
    timing: DEFAULT_WEIGHTS.timing,
  };
  const sum = base.budget + base.country + base.ielts + base.field + base.scholarship + base.timing || 1;
  return {
    budget: base.budget / sum,
    country: base.country / sum,
    ielts: base.ielts / sum,
    field: base.field / sum,
    scholarship: base.scholarship / sum,
    timing: base.timing / sum,
  };
}

function rankMap(result: RecommendResult, topN?: number): Map<string, number> {
  const map = new Map<string, number>();
  const list = topN ? result.recommendations.slice(0, topN) : result.recommendations;
  for (const item of list) map.set(item.program.id, item.rank);
  return map;
}

export function applyWhatIf(memories: MemoryFact[], params: WhatIfParams): WhatIfResult {
  const base = recommend(memories);
  const weights = buildWeights(params);

  const overrides: { budget?: number | null; ielts?: number | null; countries?: string[] | null } = {};
  if (params.budget !== undefined) overrides.budget = params.budget;
  if (params.ielts !== undefined) overrides.ielts = params.ielts;
  if (params.countries !== undefined) overrides.countries = params.countries;

  const adjusted = recommend(memories, { weights, overrides });

  const baseTop = rankMap(base, 5);
  const newTop = rankMap(adjusted, 5);

  const moved: RankDiff[] = [];
  const entered: RankDiff[] = [];
  const dropped: RankDiff[] = [];

  for (const item of adjusted.recommendations.slice(0, 5)) {
    const id = item.program.id;
    const name = `${item.program.university} — ${item.program.city}`;
    const before = baseTop.get(id);
    if (before === undefined) {
      entered.push({ programId: id, name, baseRank: 0, newRank: item.rank, delta: 0 });
      continue;
    }
    const delta = before - item.rank;
    if (delta !== 0) moved.push({ programId: id, name, baseRank: before, newRank: item.rank, delta });
  }

  for (const item of base.recommendations.slice(0, 5)) {
    if (!newTop.has(item.program.id)) {
      dropped.push({
        programId: item.program.id,
        name: `${item.program.university} — ${item.program.city}`,
        baseRank: item.rank,
        newRank: 0,
        delta: 0,
      });
    }
  }

  const baseOut = base.recommendations.filter((item) => item.budgetDeltaUsd !== null && item.budgetDeltaUsd < 0).length;
  const newOut = adjusted.recommendations.filter((item) => item.budgetDeltaUsd !== null && item.budgetDeltaUsd < 0).length;

  const summaryParts: string[] = [];
  const topMover = [...moved].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  if (topMover) {
    const direction = topMover.delta > 0 ? "поднялся" : "опустился";
    const places = Math.abs(topMover.delta);
    summaryParts.push(
      `«${topMover.name}» ${direction} на ${places} ${pluralRu(places, "позицию", "позиции", "позиций")} в топ-5.`,
    );
  }
  if (entered.length) {
    summaryParts.push(`В топ-5 вошёл «${entered[0].name}»${entered.length > 1 ? ` и ещё ${entered.length - 1}` : ""}.`);
  }
  if (dropped.length && !entered.length) {
    summaryParts.push(`Из топ-5 выпал «${dropped[0].name}».`);
  }
  if (newOut !== baseOut) {
    summaryParts.push(`Программ вне бюджета: ${baseOut} → ${newOut}.`);
  }
  if (!summaryParts.length) summaryParts.push("Рейтинг стабилен — при текущих приоритетах порядок не меняется.");

  return {
    recommendations: adjusted.recommendations,
    engine: "rules",
    diff: { moved, entered, dropped },
    summary: summaryParts.join(" "),
  };
}
