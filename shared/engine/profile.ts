import type { MemoryFact, MemoryField, PriorityKey } from "../types";

export const FIELD_LABELS: Record<MemoryField, string> = {
  name: "Имя",
  grade: "Класс",
  country: "Страна",
  budget: "Бюджет в год",
  ielts: "IELTS",
  gpa: "Успеваемость",
  interests: "Интересы",
  intake: "Старт обучения",
  priority: "Главный приоритет",
  language: "Языки",
  constraints: "Ограничения",
};

export const CORE_FIELDS: MemoryField[] = [
  "country",
  "budget",
  "ielts",
  "interests",
  "intake",
  "grade",
];

export const INTEREST_LABEL_TO_TAGS: Record<string, string[]> = {
  "IT и программирование": ["it"],
  "Data Science и аналитика": ["data", "it"],
  "Дизайн": ["design"],
  "Бизнес и предпринимательство": ["business"],
  "Финансы и экономика": ["finance", "business"],
  "Инженерия": ["engineering"],
  "Психология": ["psychology"],
  "Право": ["law"],
  "Медицина и биология": ["medicine", "biology"],
  "Архитектура": ["architecture"],
  "Маркетинг": ["marketing", "business"],
};

export function fact(memories: MemoryFact[], field: MemoryField): MemoryFact | undefined {
  return memories.find((item) => item.field === field);
}

export function factValue(memories: MemoryFact[], field: MemoryField): string | null {
  const item = fact(memories, field);
  return item ? item.value : null;
}

export function numeric(memories: MemoryFact[], field: MemoryField): number | null {
  const item = fact(memories, field);
  if (!item || typeof item.numeric !== "number") return null;
  return item.numeric;
}

export function getBudget(memories: MemoryFact[]): number | null {
  return numeric(memories, "budget");
}

export function getIelts(memories: MemoryFact[]): number | null {
  return numeric(memories, "ielts");
}

export function getGpa(memories: MemoryFact[]): number | null {
  return numeric(memories, "gpa");
}

/** Шкала оценки, в которой записан факт GPA («4.5/5» → 5). По умолчанию 5. */
export function getGpaScale(memories: MemoryFact[]): number {
  const value = factValue(memories, "gpa");
  const match = value ? /\/(\d{1,3})/.exec(value) : null;
  const scale = match ? Number(match[1]) : 5;
  return scale > 0 ? scale : 5;
}

/**
 * Единственная сравнимая форма GPA: доля от максимума шкалы, 0..100.
 * Без неё 3.9 из 4 (отличник) выглядит слабее, чем 4.0 из 5 (середняк).
 */
export function getGpaPercent(memories: MemoryFact[]): number | null {
  const raw = getGpa(memories);
  if (raw === null) return null;
  const scale = getGpaScale(memories);
  return Math.round(Math.min(100, Math.max(0, (raw / scale) * 100)));
}

export function splitValues(value: string | null): string[] {
  if (!value) return [];
  return value
    .split(/[;,]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

export function getCountries(memories: MemoryFact[]): string[] {
  return splitValues(factValue(memories, "country"));
}

export function getInterests(memories: MemoryFact[]): string[] {
  return splitValues(factValue(memories, "interests"));
}

export function getInterestTags(memories: MemoryFact[]): string[] {
  const tags = new Set<string>();
  for (const label of getInterests(memories)) {
    for (const tag of INTEREST_LABEL_TO_TAGS[label] ?? []) tags.add(tag);
  }
  return [...tags];
}

export function getIntakeYear(memories: MemoryFact[]): number | null {
  const value = factValue(memories, "intake");
  if (!value) return null;
  const match = /(20\d\d)/.exec(value);
  return match ? Number(match[1]) : null;
}

export function getPriority(memories: MemoryFact[]): PriorityKey | null {
  const value = factValue(memories, "priority");
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes("стипенд") || lower.includes("грант")) return "scholarship";
  if (lower.includes("бюджет")) return "budget";
  if (lower.includes("стран")) return "country";
  if (lower.includes("рейтинг")) return "ranking";
  return null;
}

export function getLanguageNames(memories: MemoryFact[]): string[] {
  return splitValues(factValue(memories, "language"));
}
