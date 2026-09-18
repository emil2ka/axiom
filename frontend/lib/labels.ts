import { formatUsd, parseIso, pluralRu } from "@/lib/shared/engine";
import type { MemorySource, Recommendation, ScholarshipLevel } from "@/lib/shared/engine";

export const SOURCE_LABELS: Record<MemorySource, string> = {
  voice: "из голоса",
  text: "из текста",
  manual: "вручную",
  demo: "из демо-профиля",
};

/** «16 сен» — компактная дата для истории факта и дедлайнов. */
export function formatMoment(ts: number): string {
  return new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short" }).format(new Date(ts));
}

export function durationLabel(years: number): string {
  if (Number.isInteger(years)) return `${years} ${pluralRu(years, "год", "года", "лет")}`;
  return `${years.toString().replace(".", ",")} года`;
}

export function durationShort(years: number): string {
  if (Number.isInteger(years)) return `${years} ${pluralRu(years, "год", "года", "лет")}`;
  return `${years.toString().replace(".", ",")} г.`;
}

/** Насколько близко дедлайн: «через 4 мес.» / «меньше месяца» / «срок прошёл». */
export function deadlineRelative(dateIso: string, now: Date = new Date()): { text: string; soon: boolean; passed: boolean } {
  const date = parseIso(dateIso);
  if (!date) return { text: "дата уточняется", soon: false, passed: false };
  const days = Math.round((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 0) return { text: "срок прошёл", soon: true, passed: true };
  if (days < 31) return { text: "меньше месяца", soon: true, passed: false };
  const months = Math.round(days / 30.44);
  if (months < 12) return { text: `через ${months} ${pluralRu(months, "месяц", "месяца", "месяцев")}`, soon: days < 92, passed: false };
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const text = rest
    ? `через ${years} ${pluralRu(years, "год", "года", "лет")} ${rest} ${pluralRu(rest, "месяц", "месяца", "месяцев")}`
    : `через ${years} ${pluralRu(years, "год", "года", "лет")}`;
  return { text, soon: false, passed: false };
}

export function scholarshipTone(level: ScholarshipLevel): "lime" | "teal" | "neutral" {
  if (level === "full") return "lime";
  if (level === "partial") return "teal";
  return "neutral";
}

export function scholarshipLabel(level: ScholarshipLevel): string {
  if (level === "full") return "Полная стипендия";
  if (level === "partial") return "Частичная стипендия";
  return "Без стипендии";
}

export function budgetFitText(item: Recommendation): string {
  if (item.budgetDeltaUsd === null) return "Бюджет не указан";
  if (item.program.scholarship === "full") return "Стипендия покрывает расходы";
  if (item.budgetDeltaUsd >= 0) return `Да, запас ${formatUsd(item.budgetDeltaUsd)}`;
  return `Нет, не хватает ${formatUsd(Math.abs(item.budgetDeltaUsd))}`;
}

export function ieltsStatusText(item: Recommendation, myIelts: number | null): string {
  const required = item.program.ieltsMin;
  if (required === null) return `Не требуется (${item.program.language})`;
  if (myIelts === null) return `Нужен от ${required.toFixed(1)} · у тебя не сдан`;
  if (myIelts >= required) return `Нужен от ${required.toFixed(1)} · у тебя ${myIelts.toFixed(1)} ✓`;
  return `Нужен от ${required.toFixed(1)} · у тебя ${myIelts.toFixed(1)} — не хватает ${(required - myIelts).toFixed(1)}`;
}
