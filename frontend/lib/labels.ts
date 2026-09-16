import { formatUsd, pluralRu } from "@/lib/shared/engine";
import type { Recommendation, ScholarshipLevel } from "@/lib/shared/engine";

export function durationLabel(years: number): string {
  if (Number.isInteger(years)) return `${years} ${pluralRu(years, "год", "года", "лет")}`;
  return `${years.toString().replace(".", ",")} года`;
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
