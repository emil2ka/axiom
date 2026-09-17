import type { MemoryFact, MemoryField } from "../types";
import { knownCountryNames, knownInterestLabels, knownLanguageNames } from "./extract";
import { normalizeNumerals } from "./numerals";
import { fact, splitValues } from "./profile";

/**
 * Примирение фактов LLM с фактами правил.
 *
 * Заявленный принцип продукта — «правила ядро, LLM только обогащение», но
 * mergeFacts(ruleFacts, llmFacts) ставил ответ модели последним, и для бюджета,
 * IELTS, среднего балла и имени модель молча переписывала надёжно извлечённое.
 * Галлюцинация проходила zod-схему и попадала в память как факт о человеке.
 *
 * Здесь LLM разрешено ровно одно: добавить то, чего правила не нашли.
 */

export type EnrichmentRejection =
  | "правила уже знают этот факт"
  | "цитаты нет в реплике"
  | "значения нет в реплике"
  | "число вне допустимого диапазона"
  | "значение дублирует уже известное"
  | "движок не знает такого значения";

export interface EnrichmentResult {
  facts: MemoryFact[];
  /** Что именно добавила модель — для честной пометки «AI-обогащение» в ответе. */
  added: MemoryFact[];
  /** Что отклонено и почему — видно в логах и в тестах. */
  rejected: { field: MemoryField; value: string; reason: EnrichmentRejection }[];
}

/** Поля, где несколько значений складываются; остальные заменяются целиком. */
const MULTI_VALUE = new Set<MemoryField>(["country", "interests", "language", "constraints"]);

/**
 * Для полей со словарём модель может добавить только то, что движок понимает.
 * Незнакомая страна или направление не участвуют в скоринге, то есть в лучшем
 * случае бесполезны, а в худшем выглядят как подтверждённый факт о человеке.
 */
const VOCABULARY: Partial<Record<MemoryField, () => string[]>> = {
  country: knownCountryNames,
  interests: knownInterestLabels,
  language: knownLanguageNames,
};

/** Допустимые диапазоны — модель любит возвращать правдоподобные, но неверные числа. */
const NUMERIC_RANGES: Partial<Record<MemoryField, [number, number]>> = {
  budget: [100, 500000],
  ielts: [4, 9],
  gpa: [0.1, 100],
};

function normalize(value: string): string {
  return normalizeNumerals(value)
    .toLowerCase()
    .replace(/[«»"'`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Цитата должна действительно встречаться в реплике: по ней строится подсветка. */
function quotedInText(quote: string, normalizedText: string): boolean {
  const cleaned = normalize(quote.replace(/^…+|…+$/g, ""));
  if (cleaned.length < 3) return false;
  return normalizedText.includes(cleaned);
}

export function reconcileEnrichment(
  ruleFacts: MemoryFact[],
  llmFacts: MemoryFact[],
  sourceText: string,
): EnrichmentResult {
  const normalizedText = normalize(sourceText);
  const facts = [...ruleFacts];
  const added: MemoryFact[] = [];
  const rejected: EnrichmentResult["rejected"] = [];

  const reject = (item: MemoryFact, reason: EnrichmentRejection) => {
    rejected.push({ field: item.field, value: item.value, reason });
  };

  for (const candidate of llmFacts) {
    const known = fact(facts, candidate.field);

    // Правила победили: их результат детерминирован и проверяем тестами.
    if (known && !MULTI_VALUE.has(candidate.field)) {
      reject(candidate, "правила уже знают этот факт");
      continue;
    }

    // Защита от выдумок: и цитата, и само значение должны быть в реплике.
    const quoteOk = quotedInText(candidate.quote ?? "", normalizedText);
    const valueOk = normalizedText.includes(normalize(candidate.value));
    if (!quoteOk && !valueOk) {
      reject(candidate, candidate.quote ? "цитаты нет в реплике" : "значения нет в реплике");
      continue;
    }

    const vocabulary = VOCABULARY[candidate.field];
    if (vocabulary) {
      const allowed = vocabulary();
      const unknown = splitValues(candidate.value).filter((value) => !allowed.includes(value));
      if (unknown.length) {
        reject(candidate, "движок не знает такого значения");
        continue;
      }
    }

    const range = NUMERIC_RANGES[candidate.field];
    if (range && typeof candidate.numeric === "number") {
      if (candidate.numeric < range[0] || candidate.numeric > range[1]) {
        reject(candidate, "число вне допустимого диапазона");
        continue;
      }
    }

    if (known && MULTI_VALUE.has(candidate.field)) {
      const existing = splitValues(known.value);
      const fresh = splitValues(candidate.value).filter((value) => !existing.includes(value));
      if (!fresh.length) {
        reject(candidate, "значение дублирует уже известное");
        continue;
      }
      const value = [...existing, ...fresh].join("; ");
      const index = facts.findIndex((item) => item.field === candidate.field);
      facts[index] = { ...known, value, display: value };
      added.push({ ...candidate, value: fresh.join("; "), display: fresh.join("; ") });
      continue;
    }

    // Уверенность модели ограничиваем: она не проверяется так, как правила.
    const enriched: MemoryFact = { ...candidate, confidence: Math.min(candidate.confidence, 0.75) };
    facts.push(enriched);
    added.push(enriched);
  }

  return { facts, added, rejected };
}
