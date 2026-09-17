import type {
  Gap,
  MemoryFact,
  PriorityKey,
  Program,
  RankDiff,
  Reason,
  RecommendResult,
  Recommendation,
  ScoreWeights,
} from "../types";
import { formatDateRu, formatUsd, parseIso } from "./format";
import {
  getBudget,
  getCountries,
  getGpaPercent,
  getIelts,
  getInterestTags,
  getInterests,
  getIntakeYear,
  getPriority,
} from "./profile";
import programsData from "../data/programs.json";

export const PROGRAMS = programsData as unknown as Program[];

export const DEFAULT_WEIGHTS: ScoreWeights = {
  budget: 0.23,
  country: 0.17,
  ielts: 0.14,
  field: 0.25,
  scholarship: 0.09,
  timing: 0.04,
  gpa: 0.08,
};

export const EUROPE_COUNTRIES = new Set([
  "Германия",
  "Польша",
  "Чехия",
  "Италия",
  "Испания",
  "Нидерланды",
  "Финляндия",
  "Венгрия",
  "Австрия",
  "Великобритания",
  "Швеция",
  "Дания",
  "Норвегия",
  "Бельгия",
  "Португалия",
  "Ирландия",
  "Швейцария",
  "Франция",
]);

/**
 * Приоритет из памяти («стипендия важнее страны») — это не декоративный чип,
 * а множители к весам скоринга. Каждый множитель проверяется self-тестом:
 * см. раздел [8] в backend/src/selftest.ts.
 */
export const PRIORITY_WEIGHT_MULTIPLIERS: Record<PriorityKey, Partial<Record<keyof ScoreWeights, number>>> = {
  // «Важнее страна» — география почти отсекающий критерий, цена отходит на второй план.
  country: { country: 2.6, budget: 0.8, scholarship: 0.7 },
  // «Важнее бюджет» — стоимость решает, стипендия учитывается слабее (её ещё нужно выиграть).
  budget: { budget: 2.4, scholarship: 0.7, country: 0.75 },
  // «Важнее стипендия» — полное покрытие перевешивает страну.
  scholarship: { scholarship: 3.5, country: 0.4, budget: 0.9 },
  // «Важнее рейтинг» — в датасете пока нет поля рейтинга, честно не трогаем веса.
  ranking: {},
};

export const PRIORITY_LABEL_RU: Record<PriorityKey, string> = {
  country: "страна",
  budget: "бюджет",
  scholarship: "стипендия",
  ranking: "рейтинг вуза",
};

export function normalizeWeights(weights: ScoreWeights): ScoreWeights {
  const sum =
    weights.budget +
    weights.country +
    weights.ielts +
    weights.field +
    weights.scholarship +
    weights.timing +
    weights.gpa;
  if (sum <= 0) return { ...DEFAULT_WEIGHTS };
  return {
    budget: weights.budget / sum,
    country: weights.country / sum,
    ielts: weights.ielts / sum,
    field: weights.field / sum,
    scholarship: weights.scholarship / sum,
    timing: weights.timing / sum,
    gpa: weights.gpa / sum,
  };
}

/** Применяет приоритет из памяти к весам и нормализует сумму к 1. */
export function applyPriorityWeights(base: ScoreWeights, priority: PriorityKey | null): ScoreWeights {
  if (!priority) return normalizeWeights(base);
  const multipliers = PRIORITY_WEIGHT_MULTIPLIERS[priority];
  const boosted: ScoreWeights = {
    budget: base.budget * (multipliers.budget ?? 1),
    country: base.country * (multipliers.country ?? 1),
    ielts: base.ielts * (multipliers.ielts ?? 1),
    field: base.field * (multipliers.field ?? 1),
    scholarship: base.scholarship * (multipliers.scholarship ?? 1),
    timing: base.timing * (multipliers.timing ?? 1),
    gpa: base.gpa * (multipliers.gpa ?? 1),
  };
  return normalizeWeights(boosted);
}

/** Объясняет пользователю, что именно приоритет из памяти сделал с рейтингом. */
export function describePriorityEffect(priority: PriorityKey | null): string {
  if (!priority) return "Приоритет не задан — критерии взвешены сбалансированно.";
  if (priority === "ranking") {
    return "Приоритет «рейтинг вуза» сохранён в памяти, но в демо-датасете нет поля рейтинга — ранжирование им пока не меняется.";
  }
  const multipliers = PRIORITY_WEIGHT_MULTIPLIERS[priority];
  const raised = Object.entries(multipliers)
    .filter(([, value]) => (value ?? 1) > 1)
    .map(([key]) => FIELD_WEIGHT_LABEL[key as keyof ScoreWeights]);
  const lowered = Object.entries(multipliers)
    .filter(([, value]) => (value ?? 1) < 1)
    .map(([key]) => FIELD_WEIGHT_LABEL[key as keyof ScoreWeights]);
  const parts = [`Из памяти взят приоритет «${PRIORITY_LABEL_RU[priority]}».`];
  if (raised.length) parts.push(`Вес критерия ${raised.join(", ")} повышен.`);
  if (lowered.length) parts.push(`Вес критерия ${lowered.join(", ")} понижен.`);
  return parts.join(" ");
}

const FIELD_WEIGHT_LABEL: Record<keyof ScoreWeights, string> = {
  budget: "«бюджет»",
  country: "«страна»",
  ielts: "«IELTS»",
  field: "«направление»",
  scholarship: "«стипендия»",
  timing: "«сроки»",
  gpa: "«успеваемость»",
};

export interface ScoreOverrides {
  budget?: number | null;
  ielts?: number | null;
  countries?: string[] | null;
  gpaPercent?: number | null;
}

export interface ScoreContext {
  budget: number | null;
  countries: string[];
  ielts: number | null;
  interestTags: string[];
  interestLabels: string[];
  gpaPercent: number | null;
  priority: PriorityKey | null;
  intakeYear: number | null;
  weights: ScoreWeights;
}

export function buildContext(
  memories: MemoryFact[],
  weights: ScoreWeights = DEFAULT_WEIGHTS,
  overrides: ScoreOverrides = {},
): ScoreContext {
  const budget = overrides.budget !== undefined ? overrides.budget : getBudget(memories);
  const ielts = overrides.ielts !== undefined ? overrides.ielts : getIelts(memories);
  const countries = overrides.countries !== undefined && overrides.countries !== null ? overrides.countries : getCountries(memories);
  const gpaPercent = overrides.gpaPercent !== undefined ? overrides.gpaPercent : getGpaPercent(memories);
  return {
    budget,
    countries,
    ielts,
    interestTags: getInterestTags(memories),
    interestLabels: getInterests(memories),
    gpaPercent,
    priority: getPriority(memories),
    intakeYear: getIntakeYear(memories),
    weights,
  };
}

export function totalPerYear(program: Program): number {
  return program.tuitionPerYearUsd + program.livingPerYearUsd;
}

export function fitLabel(score: number): Recommendation["fitLabel"] {
  if (score >= 78) return "Отличное соответствие";
  if (score >= 62) return "Хорошее соответствие";
  if (score >= 45) return "Умеренное соответствие";
  return "Слабое соответствие";
}

interface ScoredParts {
  components: Record<keyof ScoreWeights, number>;
  reasons: Reason[];
  gaps: Gap[];
}

function scoreComponents(program: Program, ctx: ScoreContext): ScoredParts {
  const reasons: Reason[] = [];
  const gaps: Gap[] = [];
  const total = totalPerYear(program);
  const w = ctx.weights;

  let budgetComponent = 0.55;
  const effectiveCost = program.scholarship === "full" ? total * 0.15 : total;
  if (ctx.budget && ctx.budget > 0) {
    const ratio = effectiveCost / ctx.budget;
    budgetComponent = ratio <= 1 ? 1 : ratio <= 1.15 ? 0.75 : ratio <= 1.3 ? 0.45 : ratio <= 1.5 ? 0.2 : 0.05;
    if (program.scholarship === "full") {
      reasons.push({
        text: `Стипендия покрывает обучение и проживание — стоимость почти не расходует бюджет`,
        weight: w.budget * budgetComponent,
        field: "program",
      });
    } else if (ctx.budget - total >= 0) {
      reasons.push({
        text: `Полная стоимость ${formatUsd(total)}/год укладывается в бюджет — запас ${formatUsd(ctx.budget - total)}`,
        weight: w.budget * budgetComponent,
        field: "budget",
      });
    } else if (budgetComponent >= 0.2) {
      reasons.push({
        text: `Стоимость ${formatUsd(total)}/год чуть выше бюджета — не хватает ${formatUsd(total - ctx.budget)}`,
        weight: w.budget * budgetComponent,
        field: "budget",
      });
    } else {
      gaps.push({
        text: `Превышает бюджет на ${formatUsd(total - ctx.budget)} в год`,
        severity: ratio > 1.5 ? "high" : "medium",
      });
    }
  }

  let countryComponent = 0.55;
  if (ctx.countries.length) {
    if (ctx.countries.includes(program.country)) {
      countryComponent = 1;
      reasons.push({ text: `Страна из твоего списка: ${program.country}`, weight: w.country, field: "country" });
    } else if (ctx.countries.includes("Европа") && EUROPE_COUNTRIES.has(program.country)) {
      countryComponent = 1;
      reasons.push({
        text: `Европа — твой регион, ${program.country} подходит по географии`,
        weight: w.country,
        field: "country",
      });
    } else if (ctx.countries.includes("Европа")) {
      countryComponent = 0.1;
      gaps.push({ text: `Страна вне выбранного региона (${program.country})`, severity: "medium" });
    } else {
      countryComponent = 0.3;
      gaps.push({ text: `Страна не совпадает с твоим запросом (${program.country})`, severity: "medium" });
    }
  }

  let ieltsComponent = 1;
  if (program.ieltsMin !== null) {
    if (ctx.ielts === null) {
      ieltsComponent = 0.5;
      gaps.push({
        text: `Нужен IELTS от ${program.ieltsMin.toFixed(1)} — ты пока не сдавал`,
        severity: "medium",
      });
    } else if (ctx.ielts >= program.ieltsMin) {
      ieltsComponent = 1;
      reasons.push({
        text: `Твой IELTS ${ctx.ielts.toFixed(1)} покрывает минимум ${program.ieltsMin.toFixed(1)}`,
        weight: w.ielts,
        field: "ielts",
      });
    } else if (ctx.ielts >= program.ieltsMin - 0.5) {
      ieltsComponent = 0.45;
      gaps.push({
        text: `Не хватает ${(program.ieltsMin - ctx.ielts).toFixed(1)} балла IELTS до порога ${program.ieltsMin.toFixed(1)}`,
        severity: "medium",
      });
    } else {
      ieltsComponent = 0.1;
      gaps.push({
        text: `Порог IELTS ${program.ieltsMin.toFixed(1)}, у тебя ${ctx.ielts.toFixed(1)} — нужна серьёзная подготовка`,
        severity: "high",
      });
    }
  }

  let fieldComponent = 0.6;
  if (ctx.interestTags.length) {
    const matched = program.tags.filter((tag) => ctx.interestTags.includes(tag));
    if (matched.length) {
      fieldComponent = 1;
      reasons.push({
        text: `Направление «${program.field}» совпадает с твоими интересами`,
        weight: w.field,
        field: "interests",
      });
    } else {
      fieldComponent = 0.15;
      gaps.push({ text: `Направление «${program.field}» не совпадает с интересами`, severity: "medium" });
    }
  }

  const scholarshipComponent = program.scholarship === "full" ? 1 : program.scholarship === "partial" ? 0.7 : 0.35;
  if (program.scholarship !== "none") {
    reasons.push({
      text: `Поддержка: ${program.scholarshipNote}`,
      weight: w.scholarship * scholarshipComponent,
      field: "program",
    });
  }

  const firstDeadline = program.deadlines[0];
  const deadlineDate = firstDeadline ? parseIso(firstDeadline.date) : null;
  let timingComponent = 1;
  if (ctx.intakeYear && deadlineDate && deadlineDate.getUTCFullYear() > ctx.intakeYear) {
    timingComponent = 0.6;
    gaps.push({ text: `Ближайший дедлайн уже после твоего планируемого старта`, severity: "low" });
  } else if (firstDeadline) {
    reasons.push({
      text: `Дедлайн ${formatDateRu(firstDeadline.date)} успевает к старту`,
      weight: w.timing,
      field: "program",
    });
  }

  if (program.language !== "Английский") {
    gaps.push({
      text: `Обучение на языке: ${program.language} — потребуется подтверждение уровня B2`,
      severity: "medium",
    });
  }

  let gpaComponent = 0.6;
  if (program.gpaMinPercent !== null) {
    if (ctx.gpaPercent === null) {
      gpaComponent = 0.5;
      gaps.push({
        text: `Нужен средний балл от ${program.gpaMinPercent}% — ты не указал успеваемость`,
        severity: "low",
      });
    } else if (ctx.gpaPercent >= program.gpaMinPercent) {
      gpaComponent = 1;
      // Чем выше планка, тем ценнее как объяснение то, что ты её прошёл:
      // пройти 88% — сильный сигнал, пройти 70% — почти ничего не значит.
      const selectivity = 1 + Math.max(0, (program.gpaMinPercent - 70) / 20);
      reasons.push({
        text: `Твой средний балл ${ctx.gpaPercent}% проходит порог ${program.gpaMinPercent}%`,
        weight: w.gpa * selectivity,
        field: "gpa",
      });
    } else if (ctx.gpaPercent >= program.gpaMinPercent - 5) {
      gpaComponent = 0.5;
      gaps.push({
        text: `До порога по среднему баллу не хватает ${program.gpaMinPercent - ctx.gpaPercent} п.п. (нужно ${program.gpaMinPercent}%)`,
        severity: "medium",
      });
    } else {
      gpaComponent = 0.15;
      gaps.push({
        text: `Порог по среднему баллу ${program.gpaMinPercent}%, у тебя ${ctx.gpaPercent}% — программа отборная`,
        severity: "high",
      });
    }
  } else if (ctx.gpaPercent !== null) {
    // Порога нет — успеваемость не мешает и не помогает, оценку не искажаем.
    gpaComponent = 1;
  }

  // Приоритет из памяти — не просто вес, а видимое объяснение в карточке программы.
  const priorityReason = buildPriorityReason(program, ctx, { budgetComponent, countryComponent });
  if (priorityReason) reasons.push(priorityReason);

  return {
    components: {
      budget: budgetComponent,
      country: countryComponent,
      ielts: ieltsComponent,
      field: fieldComponent,
      scholarship: scholarshipComponent,
      timing: timingComponent,
      gpa: gpaComponent,
    },
    reasons,
    gaps,
  };
}

/**
 * Формирует причину, привязанную к факту «Главный приоритет» из памяти.
 * Вес намеренно высокий, чтобы объяснение попало в топ-4 причин карточки —
 * пользователь должен видеть, что его собственная фраза изменила выдачу.
 */
function buildPriorityReason(
  program: Program,
  ctx: ScoreContext,
  components: { budgetComponent: number; countryComponent: number },
): Reason | null {
  if (!ctx.priority) return null;
  const boost = ctx.weights[ctx.priority === "ranking" ? "field" : ctx.priority] ?? 0;

  if (ctx.priority === "scholarship") {
    if (program.scholarship === "full") {
      return {
        text: `Приоритет «стипендия» из твоей памяти: здесь полное покрытие — ${program.scholarshipNote}`,
        weight: boost * 1.2,
        field: "priority",
      };
    }
    if (program.scholarship === "partial") {
      return {
        text: `Приоритет «стипендия»: частичное покрытие — ${program.scholarshipNote}`,
        weight: boost * 0.8,
        field: "priority",
      };
    }
    return null;
  }

  if (ctx.priority === "budget" && components.budgetComponent >= 0.75 && ctx.budget) {
    return {
      text: `Приоритет «бюджет» из твоей памяти: ${formatUsd(totalPerYear(program))}/год укладывается в ${formatUsd(ctx.budget)}`,
      weight: boost * 1.2,
      field: "priority",
    };
  }

  if (ctx.priority === "country" && components.countryComponent >= 1) {
    return {
      text: `Приоритет «страна» из твоей памяти: ${program.country} — ровно твой регион`,
      weight: boost * 1.2,
      field: "priority",
    };
  }

  return null;
}

export function scoreProgram(program: Program, ctx: ScoreContext): Omit<Recommendation, "rank"> {
  const { components, reasons, gaps } = scoreComponents(program, ctx);
  const weights = ctx.weights;
  const weightSum = Object.values(weights).reduce((acc, value) => acc + value, 0) || 1;
  const weighted =
    components.budget * weights.budget +
    components.country * weights.country +
    components.ielts * weights.ielts +
    components.field * weights.field +
    components.scholarship * weights.scholarship +
    components.timing * weights.timing +
    components.gpa * weights.gpa;
  const score = Math.round((weighted / weightSum) * 100);
  const budgetDelta = ctx.budget ? ctx.budget - totalPerYear(program) : null;

  const severityOrder: Record<Gap["severity"], number> = { high: 0, medium: 1, low: 2 };

  return {
    program,
    score,
    fitLabel: fitLabel(score),
    breakdown: components,
    reasons: [...reasons].sort((a, b) => b.weight - a.weight).slice(0, 4),
    gaps: [...gaps].sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]),
    totalPerYearUsd: totalPerYear(program),
    budgetDeltaUsd: budgetDelta,
  };
}

export interface RecommendOptions {
  limit?: number;
  /** Явные веса (What If). Если заданы — приоритет из памяти к ним НЕ применяется. */
  weights?: ScoreWeights;
  overrides?: ScoreOverrides;
  programs?: Program[];
  /** Отключить влияние приоритета из памяти — нужно для честного сравнения «до/после». */
  ignorePriority?: boolean;
}

export function recommend(memories: MemoryFact[], options: RecommendOptions = {}): RecommendResult {
  const programs = options.programs ?? PROGRAMS;
  const memoryPriority = options.ignorePriority ? null : getPriority(memories);

  // Явные веса (слайдеры What If) всегда побеждают приоритет из памяти:
  // пользователь в этот момент осознанно перевешивает критерии руками.
  const weights = options.weights ?? applyPriorityWeights(DEFAULT_WEIGHTS, memoryPriority);

  const ctx = buildContext(memories, weights, options.overrides ?? {});
  if (options.ignorePriority) ctx.priority = null;

  const scored = programs.map((program) => scoreProgram(program, ctx));
  scored.sort((a, b) => b.score - a.score || a.totalPerYearUsd - b.totalPerYearUsd);
  const limited = options.limit ? scored.slice(0, options.limit) : scored;
  const recommendations: Recommendation[] = limited.map((item, index) => ({ ...item, rank: index + 1 }));

  const appliedPriority = options.weights ? null : memoryPriority;
  return {
    recommendations,
    engine: "rules",
    weights,
    appliedPriority,
    priorityNote: describePriorityEffect(appliedPriority),
  };
}

export interface RankingDiff {
  moved: RankDiff[];
  entered: RankDiff[];
  dropped: RankDiff[];
}

const programLabel = (item: Recommendation): string => `${item.program.university} — ${item.program.city}`;

/**
 * Сравнивает два рейтинга по топ-N: кто сдвинулся, кто вошёл, кто выпал.
 * Одна реализация на What If и на объяснение правок памяти — раньше логика
 * была продублирована и могла разойтись.
 */
export function diffRankings(base: Recommendation[], next: Recommendation[], topN = 5): RankingDiff {
  const baseTop = new Map(base.slice(0, topN).map((item) => [item.program.id, item.rank]));
  const nextTop = new Map(next.slice(0, topN).map((item) => [item.program.id, item.rank]));

  const moved: RankDiff[] = [];
  const entered: RankDiff[] = [];
  const dropped: RankDiff[] = [];

  for (const item of next.slice(0, topN)) {
    const before = baseTop.get(item.program.id);
    if (before === undefined) {
      entered.push({ programId: item.program.id, name: programLabel(item), baseRank: 0, newRank: item.rank, delta: 0 });
      continue;
    }
    const delta = before - item.rank;
    if (delta !== 0) {
      moved.push({ programId: item.program.id, name: programLabel(item), baseRank: before, newRank: item.rank, delta });
    }
  }

  for (const item of base.slice(0, topN)) {
    if (!nextTop.has(item.program.id)) {
      dropped.push({ programId: item.program.id, name: programLabel(item), baseRank: item.rank, newRank: 0, delta: 0 });
    }
  }

  return { moved, entered, dropped };
}

/** Сколько программ не укладывается в бюджет профиля. */
export function countOverBudget(recommendations: Recommendation[]): number {
  return recommendations.filter((item) => item.budgetDeltaUsd !== null && item.budgetDeltaUsd < 0).length;
}
