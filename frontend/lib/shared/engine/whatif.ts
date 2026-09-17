import type { MemoryFact, ScoreWeights, WhatIfParams, WhatIfResult } from "../types";
import { pluralRu } from "./format";
import { getPriority } from "./profile";
import {
  DEFAULT_WEIGHTS,
  PRIORITY_LABEL_RU,
  countOverBudget,
  diffRankings,
  normalizeWeights,
  recommend,
} from "./recommend";

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
    gpa: DEFAULT_WEIGHTS.gpa,
  };
  return normalizeWeights(base);
}

export function applyWhatIf(memories: MemoryFact[], params: WhatIfParams): WhatIfResult {
  const base = recommend(memories);
  const weights = buildWeights(params);

  const overrides: { budget?: number | null; ielts?: number | null; countries?: string[] | null } = {};
  if (params.budget !== undefined) overrides.budget = params.budget;
  if (params.ielts !== undefined) overrides.ielts = params.ielts;
  if (params.countries !== undefined) overrides.countries = params.countries;

  const adjusted = recommend(memories, { weights, overrides });

  const { moved, entered, dropped } = diffRankings(base.recommendations, adjusted.recommendations, 5);
  const baseOut = countOverBudget(base.recommendations);
  const newOut = countOverBudget(adjusted.recommendations);

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
  if (!summaryParts.length) {
    const memoryPriority = getPriority(memories);
    summaryParts.push(
      memoryPriority
        ? `Рейтинг не изменился: приоритет «${PRIORITY_LABEL_RU[memoryPriority]}» уже сохранён в памяти и учтён в основной выдаче.`
        : "Рейтинг стабилен — при текущих приоритетах порядок не меняется.",
    );
  }

  return {
    recommendations: adjusted.recommendations,
    engine: "rules",
    diff: { moved, entered, dropped },
    summary: summaryParts.join(" "),
  };
}
