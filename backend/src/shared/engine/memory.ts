import type { MemoryChange, MemoryFact, MemoryImpact, Program, Recommendation } from "../types";
import { describeMemoryChanges, mergeFactsWithDiff } from "./extract";
import { pluralRu } from "./format";
import { countOverBudget, diffRankings, recommend } from "./recommend";

export interface ExplainOptions {
  programs?: Program[];
  topN?: number;
}

/**
 * Собирает объяснение правки памяти: что изменилось в фактах и что из-за этого
 * произошло с рекомендациями. Это ответ на вопрос «почему выдача другая» —
 * пользователь видит причинно-следственную связь, а не просто новый список.
 */
export function explainMemoryUpdate(
  before: MemoryFact[],
  incoming: MemoryFact[],
  options: ExplainOptions = {},
): MemoryImpact & { memories: MemoryFact[] } {
  const topN = options.topN ?? 5;
  const merged = mergeFactsWithDiff(before, incoming);

  const baseline = recommend(before, { programs: options.programs }).recommendations;
  const updated = recommend(merged.memories, { programs: options.programs }).recommendations;

  const diff = diffRankings(baseline, updated, topN);
  const overBudget = { before: countOverBudget(baseline), after: countOverBudget(updated) };

  return {
    memories: merged.memories,
    changes: merged.changes,
    diff,
    overBudget,
    summary: summarize(merged.changes, diff, overBudget, topN, biggestScoreShift(baseline, updated, topN)),
  };
}

interface ScoreShift {
  name: string;
  before: number;
  after: number;
}

/**
 * Самое заметное изменение оценки среди топ-N. Нужно для случая, когда порядок
 * не поменялся, но пересчёт всё равно произошёл: «ничего не изменилось» было бы
 * неправдой, а молчание выглядит как будто движок не сработал.
 */
function biggestScoreShift(base: Recommendation[], next: Recommendation[], topN: number): ScoreShift | null {
  const before = new Map(base.map((item) => [item.program.id, item]));
  let best: ScoreShift | null = null;
  for (const item of next.slice(0, topN)) {
    const previous = before.get(item.program.id);
    if (!previous || previous.score === item.score) continue;
    const shift = {
      name: `${item.program.university} — ${item.program.city}`,
      before: previous.score,
      after: item.score,
    };
    if (!best || Math.abs(shift.after - shift.before) > Math.abs(best.after - best.before)) best = shift;
  }
  return best;
}

function summarize(
  changes: MemoryChange[],
  diff: MemoryImpact["diff"],
  overBudget: MemoryImpact["overBudget"],
  topN: number,
  scoreShift: ScoreShift | null,
): string {
  const what = describeMemoryChanges(changes);
  if (!what) return "Ничего нового — эти факты уже были в памяти.";

  const parts = [`${what}.`];

  if (overBudget.after !== overBudget.before) {
    const delta = Math.abs(overBudget.after - overBudget.before);
    const verb = overBudget.after > overBudget.before ? "вышло за бюджет" : "вернулось в бюджет";
    parts.push(`${delta} ${pluralRu(delta, "программа", "программы", "программ")} ${verb} (${overBudget.before} → ${overBudget.after}).`);
  }

  const topMover = [...diff.moved].sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))[0];
  if (topMover) {
    const places = Math.abs(topMover.delta);
    const direction = topMover.delta > 0 ? "поднялся" : "опустился";
    parts.push(
      `«${topMover.name}» ${direction} на ${places} ${pluralRu(places, "позицию", "позиции", "позиций")}.`,
    );
  }

  if (diff.entered.length) {
    const extra = diff.entered.length > 1 ? ` и ещё ${diff.entered.length - 1}` : "";
    parts.push(`В топ-${topN} вошёл «${diff.entered[0].name}»${extra}.`);
  }

  if (diff.dropped.length) {
    const extra = diff.dropped.length > 1 ? ` и ещё ${diff.dropped.length - 1}` : "";
    parts.push(`Из топ-${topN} выпал «${diff.dropped[0].name}»${extra}.`);
  }

  if (parts.length === 1) {
    parts.push(
      scoreShift
        ? `Порядок топ-${topN} прежний, но оценки пересчитаны: «${scoreShift.name}» ${scoreShift.before} → ${scoreShift.after}.`
        : "На рекомендации это не повлияло.",
    );
  }
  return parts.join(" ");
}

/** История одного факта: текущее значение и всё, что было до него. */
export function factTimeline(fact: MemoryFact): { display: string; at: number; current: boolean }[] {
  const past = (fact.history ?? []).map((revision) => ({
    display: revision.display,
    at: revision.at,
    current: false,
  }));
  return [{ display: fact.display, at: fact.createdAt, current: true }, ...past];
}

/** Сколько раз факт переписывали — для подписи «менялось N раз» в чипе памяти. */
export function revisionCount(fact: MemoryFact): number {
  return fact.history?.length ?? 0;
}
