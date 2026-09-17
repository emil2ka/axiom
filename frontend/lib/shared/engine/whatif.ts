import type { MemoryFact, ScoreWeights, WhatIfParams, WhatIfResult } from "../types";
import { formatUsd, pluralRu } from "./format";
import { getBudget, getIelts, getPriority } from "./profile";
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
    // Стипендия не понижается, а повышается: полное покрытие — это и есть
    // лучший исход по деньгам. Прежние веса понижали её и противоречили
    // собственному названию, из-за чего пресет почти ничего не менял (2%).
    params: { countryWeight: 0.4, budgetWeight: 3, scholarshipWeight: 1.2 },
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
    language: DEFAULT_WEIGHTS.language,
  };
  return normalizeWeights(base);
}

/**
 * Что именно изменил пользователь. Без этой фразы сводки разных сценариев
 * выглядели одинаково: они описывали следствие, но не называли причину, и
 * «подтяну IELTS до 7.0» читалось так же, как «стипендия важнее страны».
 */
function describeChange(memories: MemoryFact[], params: WhatIfParams): string {
  const parts: string[] = [];

  if (params.budget !== undefined && params.budget !== null) {
    const before = getBudget(memories);
    parts.push(
      before !== null && before !== params.budget
        ? `Бюджет ${formatUsd(before)} → ${formatUsd(params.budget)}`
        : `Бюджет ${formatUsd(params.budget)}`,
    );
  }
  if (params.ielts !== undefined && params.ielts !== null) {
    const before = getIelts(memories);
    parts.push(
      before !== null && before !== params.ielts
        ? `IELTS ${before.toFixed(1)} → ${params.ielts.toFixed(1)}`
        : `IELTS ${params.ielts.toFixed(1)}`,
    );
  }
  if (params.countries && params.countries.length) {
    parts.push(`Страны: ${params.countries.join(", ")}`);
  }

  const weights: string[] = [];
  if ((params.scholarshipWeight ?? 1) > 1.2) weights.push("стипендия важнее");
  if ((params.budgetWeight ?? 1) > 1.2) weights.push("бюджет важнее");
  if ((params.countryWeight ?? 1) < 0.8) weights.push("страна менее важна");
  if ((params.scholarshipWeight ?? 1) < 0.8) weights.push("стипендия менее важна");
  if (weights.length) {
    const phrase = weights.join(", ");
    parts.push(parts.length ? phrase : phrase.charAt(0).toUpperCase() + phrase.slice(1));
  }

  return parts.join("; ");
}

/** Почему сценарий ничего не изменил — на данных, а не отпиской. */
function explainNoChange(memories: MemoryFact[], params: WhatIfParams, top: WhatIfResult["recommendations"]): string {
  const leaders = top.slice(0, 5);
  const allFunded = leaders.length > 0 && leaders.every((item) => item.program.scholarship === "full");
  if ((params.budgetWeight ?? 1) > 1.2 && allFunded) {
    return "Твой топ уже состоит из программ с полным покрытием — по деньгам лучше уже некуда.";
  }
  if ((params.scholarshipWeight ?? 1) > 1.2 && allFunded) {
    return "Все программы в топе и так дают полное покрытие.";
  }
  const memoryPriority = getPriority(memories);
  if (memoryPriority) {
    return `Приоритет «${PRIORITY_LABEL_RU[memoryPriority]}» уже сохранён в памяти и учтён в основной выдаче.`;
  }
  return "Порядок не меняется: по этим критериям программы в топе почти равны.";
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
  const changed = describeChange(memories, params);
  if (changed) summaryParts.push(`${changed}.`);
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
  const describedEffect = summaryParts.length > (changed ? 1 : 0);
  if (!describedEffect) {
    summaryParts.push(explainNoChange(memories, params, adjusted.recommendations));
  }

  return {
    recommendations: adjusted.recommendations,
    engine: "rules",
    diff: { moved, entered, dropped },
    summary: summaryParts.join(" "),
  };
}
