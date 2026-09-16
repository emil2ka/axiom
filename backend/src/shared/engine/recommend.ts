import type { Gap, MemoryFact, Program, Reason, RecommendResult, Recommendation, ScoreWeights } from "../types";
import { formatDateRu, formatUsd, parseIso } from "./format";
import { getBudget, getCountries, getIelts, getInterestTags, getInterests, getIntakeYear, getPriority } from "./profile";
import programsData from "../data/programs.json";

export const PROGRAMS = programsData as unknown as Program[];

export const DEFAULT_WEIGHTS: ScoreWeights = {
  budget: 0.25,
  country: 0.18,
  ielts: 0.15,
  field: 0.27,
  scholarship: 0.1,
  timing: 0.05,
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

export interface ScoreOverrides {
  budget?: number | null;
  ielts?: number | null;
  countries?: string[] | null;
}

export interface ScoreContext {
  budget: number | null;
  countries: string[];
  ielts: number | null;
  interestTags: string[];
  interestLabels: string[];
  priority: string | null;
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
  return {
    budget,
    countries,
    ielts,
    interestTags: getInterestTags(memories),
    interestLabels: getInterests(memories),
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

  return {
    components: {
      budget: budgetComponent,
      country: countryComponent,
      ielts: ieltsComponent,
      field: fieldComponent,
      scholarship: scholarshipComponent,
      timing: timingComponent,
    },
    reasons,
    gaps,
  };
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
    components.timing * weights.timing;
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
  weights?: ScoreWeights;
  overrides?: ScoreOverrides;
  programs?: Program[];
}

export function recommend(memories: MemoryFact[], options: RecommendOptions = {}): RecommendResult {
  const programs = options.programs ?? PROGRAMS;
  const ctx = buildContext(memories, options.weights ?? DEFAULT_WEIGHTS, options.overrides ?? {});
  const scored = programs.map((program) => scoreProgram(program, ctx));
  scored.sort((a, b) => b.score - a.score || a.totalPerYearUsd - b.totalPerYearUsd);
  const limited = options.limit ? scored.slice(0, options.limit) : scored;
  const recommendations: Recommendation[] = limited.map((item, index) => ({ ...item, rank: index + 1 }));
  return { recommendations, engine: "rules" };
}
