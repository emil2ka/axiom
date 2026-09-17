import type {
  MemoryChange,
  MemoryFact,
  MemoryField,
  MemoryRevision,
  MemorySource,
  MergeResult,
} from "../types";
import { FIELD_LABELS, splitValues } from "./profile";
import { formatUsd } from "./format";

interface Candidate {
  field: MemoryField;
  value: string;
  display: string;
  quote: string;
  confidence: number;
  numeric?: number;
  index: number;
}

export interface ExtractOptions {
  source?: MemorySource;
  now?: Date;
}

const COUNTRY_PATTERNS: { name: string; re: RegExp }[] = [
  { name: "Европа", re: /европ/i },
  { name: "Германия", re: /германи/i },
  { name: "Польша", re: /польш/i },
  { name: "Чехия", re: /чехи|чехии|чехию/i },
  { name: "Италия", re: /итали/i },
  { name: "Испания", re: /испани/i },
  { name: "Нидерланды", re: /нидерланд|голланд/i },
  { name: "Финляндия", re: /финлянд/i },
  { name: "Венгрия", re: /венгр/i },
  { name: "Австрия", re: /австр/i },
  { name: "Великобритания", re: /великобритан|британ|англия|англии|англию|англией/i },
  { name: "США", re: /сша|(^|\s)usa(\s|$)|америк/i },
  { name: "Канада", re: /канад/i },
  { name: "Южная Корея", re: /коре[яюи]/i },
  { name: "Китай", re: /кита[йеюя]/i },
  { name: "Турция", re: /турци/i },
  { name: "ОАЭ", re: /оаэ|эмират|дубай/i },
  { name: "Швейцария", re: /швейцар/i },
  { name: "Франция", re: /франци/i },
  { name: "Португалия", re: /португали/i },
  { name: "Швеция", re: /швеци/i },
  { name: "Дания", re: /дани[яюи]/i },
  { name: "Ирландия", re: /ирланд/i },
  { name: "Норвегия", re: /норвег/i },
  { name: "Бельгия", re: /бельги/i },
];

const COUNTRY_ORDER = COUNTRY_PATTERNS.map((item) => item.name);

const INTEREST_PATTERNS: { label: string; re: RegExp }[] = [
  {
    label: "IT и программирование",
    re: /программиров|информатик|компьютерн|разработк|кодинг|software|веб|web|front[- ]?end|back[- ]?end|python|javascript|мобильн[а-яё]*\s+разраб|(^|[\s,;])(it|айти|ит)(?=[\s,;.]|$)/i,
  },
  {
    label: "Data Science и аналитика",
    re: /data\s*science|аналитик|машинн[а-яё]*\s+обуч|machine\s*learning|нейросет|искусственн[а-яё]*\s+интеллект|(^|[\s,;])ии(?=[\s,;.]|$)|(^|\s)ml(\s|$)/i,
  },
  { label: "Дизайн", re: /дизайн|ui\/?ux|графич|визуальн[а-яё]*\s+коммуник/i },
  { label: "Бизнес и предпринимательство", re: /бизнес|предпринимат|стартап|менеджмент/i },
  { label: "Финансы и экономика", re: /финанс|эконом|бухгалт|банковск/i },
  { label: "Инженерия", re: /инженер|робот|механик|электрот|мехатрон|строител/i },
  { label: "Психология", re: /психолог/i },
  // «право» — самое естественное слово, но легко даёт ложные срабатывания.
  // Берём только однозначные формы: отдельное «право», «права человека», юрист.
  // Множественное «права» отброшено намеренно — это чаще водительские.
  { label: "Право", re: /юриспруденц|юрист|правовед|прав[аоу]\s+человека|(^|[\s,;(])право(?=[\s,;.)]|$)/i },
  { label: "Медицина и биология", re: /медицин|врач|биолог|фармац|стоматолог|хирург|лечебн[а-яё]*\s+дел/i },
  { label: "Архитектура", re: /архитект/i },
  { label: "Маркетинг", re: /маркетинг|реклам|бренд|smm|смм/i },
];

const LANGUAGE_PATTERNS: { label: string; re: RegExp }[] = [
  { label: "Английский", re: /английск/i },
  { label: "Немецкий", re: /немецк/i },
  { label: "Французский", re: /французск/i },
  { label: "Корейский", re: /корейск/i },
  { label: "Китайский", re: /китайск/i },
  { label: "Казахский", re: /казахск/i },
  { label: "Турецкий", re: /турецк/i },
  { label: "Испанский", re: /испанск/i },
  { label: "Итальянский", re: /итальянск/i },
  { label: "Польский", re: /польск/i },
  { label: "Чешский", re: /чешск/i },
  { label: "Венгерский", re: /венгерск/i },
  { label: "Португальский", re: /португальск/i },
];

const CURRENCY_RATE: Record<string, number> = { usd: 1, eur: 1.08, kzt: 1 / 470 };

function currencyFromToken(token: string): string {
  const lower = token.toLowerCase();
  if (token.includes("$") || lower.includes("долл") || lower.includes("бакс") || lower.includes("usd")) return "usd";
  if (token.includes("€") || lower.includes("евро") || lower.includes("eur")) return "eur";
  return "kzt";
}

function parseNumber(raw: string): number | null {
  let value = raw.replace(/\s/g, "");
  if (/^\d{1,3}([.,]\d{3})+$/.test(value)) value = value.replace(/[.,]/g, "");
  else value = value.replace(",", ".");
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

interface MoneyMatch {
  amountUsd: number;
  quote: string;
  index: number;
}

function findMoney(text: string): MoneyMatch | null {
  const currency = "(\\$|€|₸|долл\\w*|доллар\\w*|бакс\\w*|usd|евро|eur|тенге|тг|kzt)";
  const suffix = "(к|k|тыс(?:яч\\w*)?)";

  const tryMatch = (
    regex: RegExp,
    map: (match: RegExpExecArray) => { numberRaw: string; suffix?: string; currencyToken: string } | null,
  ): MoneyMatch | null => {
    const match = regex.exec(text);
    if (!match) return null;
    const parts = map(match);
    if (!parts) return null;
    const parsed = parseNumber(parts.numberRaw);
    if (parsed === null) return null;
    const magnitude = parts.suffix ? 1000 : 1;
    const code = parts.currencyToken ? currencyFromToken(parts.currencyToken) : "usd";
    const amountUsd = Math.round(parsed * magnitude * (CURRENCY_RATE[code] ?? 1));
    if (amountUsd < 100 || amountUsd > 500000) return null;
    return { amountUsd, quote: clipQuote(text, match.index, match[0].length), index: match.index };
  };

  return (
    tryMatch(
      new RegExp(`(\\d[\\d\\s.,]*)\\s*(?:[-–—]|до)\\s*(\\d[\\d\\s.,]*)\\s*${suffix}?\\s*${currency}`, "i"),
      (m) => ({ numberRaw: m[2], suffix: m[3], currencyToken: m[4] }),
    ) ??
    tryMatch(new RegExp(`${currency}\\s*(\\d[\\d\\s.,]*)\\s*${suffix}?`, "i"), (m) => ({
      numberRaw: m[2],
      suffix: m[3],
      currencyToken: m[1],
    })) ??
    tryMatch(new RegExp(`(\\d[\\d\\s.,]*)\\s*${suffix}?\\s*${currency}`, "i"), (m) => ({
      numberRaw: m[1],
      suffix: m[2],
      currencyToken: m[3],
    })) ??
    tryMatch(new RegExp(`(?:до|бюджет\\w*[^\\d]{0,15})\\s*(\\d[\\d\\s.,]*)\\s*${suffix}(?!\\w)`, "i"), (m) => ({
      numberRaw: m[1],
      suffix: m[2],
      currencyToken: "",
    }))
  );
}

interface IeltsMatch {
  value: string;
  display: string;
  numeric: number | null;
  quote: string;
  index: number;
  confidence: number;
}

function findIelts(text: string): IeltsMatch | null {
  const word = /ielts|айелтс|айлтс/i.exec(text);
  const without = /без\s+(?:ielts|айелтс|айлтс)/i.exec(text);
  if (!word && !without) return null;
  const anchor = word ?? without;
  if (!anchor) return null;

  const window = text.slice(anchor.index, anchor.index + 70);
  const numMatch = /(\d(?:[.,]\d)?)/.exec(window);
  if (numMatch) {
    const parsed = parseNumber(numMatch[1]);
    if (parsed !== null && parsed >= 4 && parsed <= 9) {
      return {
        value: parsed.toFixed(1),
        display: parsed.toFixed(1),
        numeric: parsed,
        quote: clipQuote(text, anchor.index, numMatch[0].length + 8),
        index: anchor.index,
        confidence: 0.92,
      };
    }
  }

  const context = text.slice(Math.max(0, anchor.index - 40), anchor.index + 70);
  if (/без\s+(?:ielts|айелтс)/i.test(context)) {
    return {
      value: "Не сдан",
      display: "Не сдан",
      numeric: null,
      quote: clipQuote(text, anchor.index, anchor[0].length + 6),
      index: anchor.index,
      confidence: 0.85,
    };
  }
  if (/не\s*сда\w*|ещё не|еще не|пока не|нет\b|планиру|буду сда|готовл|потом|в планах/i.test(context)) {
    return {
      value: "Не сдан (в планах)",
      display: "Не сдан (в планах)",
      numeric: null,
      quote: clipQuote(text, anchor.index, anchor[0].length + 14),
      index: anchor.index,
      confidence: 0.75,
    };
  }
  return null;
}

interface GpaMatch {
  value: string;
  display: string;
  numeric: number;
  quote: string;
  index: number;
}

/**
 * Шкала оценки не всегда названа вслух, но без неё факт бессмыслен:
 * 3.8 GPA — это отличник по 4-балльной шкале, а 3.8 из 5 — середняк.
 * Если шкалу не сказали, выводим её из формулировки: «GPA» — международная
 * 4-балльная, «средний балл»/«аттестат» — постсоветская 5-балльная.
 */
function inferGpaScale(keyword: string, numeric: number): number {
  const isGpaWord = /gpa/i.test(keyword);
  if (isGpaWord) return numeric > 4 ? 5 : 4;
  return numeric > 5 ? 10 : 5;
}

function findGpa(text: string): GpaMatch | null {
  const contextual =
    /(gpa|средн[а-яё]*\s*балл|аттестат[а-яё]*|успеваемост[а-яё]*|оценк[а-яё]*)[^\d]{0,14}(\d(?:[.,]\d{1,2})?)(?:\s*(?:\/|из)\s*(4|5|10|12|100))?/i.exec(
      text,
    );
  const standalone = /(\d(?:[.,]\d{1,2})?)\s*(?:\/|из)\s*(4|5|10|12|100)(?!\d)/i.exec(text);

  const raw = contextual ? contextual[2] : standalone?.[1];
  const explicitScale = contextual ? contextual[3] : standalone?.[2];
  const match = contextual ?? standalone;
  if (!match || !raw) return null;

  const numeric = parseNumber(raw);
  if (numeric === null) return null;

  const scale = explicitScale ? Number(explicitScale) : inferGpaScale(contextual ? contextual[1] : "", numeric);
  if (numeric <= 0 || numeric > scale) return null;

  return {
    value: `${numeric}/${scale}`,
    display: `${raw.replace(",", ".")} из ${scale}`,
    numeric,
    quote: clipQuote(text, match.index, match[0].length),
    index: match.index,
  };
}

function findPriority(text: string): { value: string; quote: string; index: number; confidence: number } | null {
  const subject =
    /(стипенди[а-яё]*|грант[а-яё]*|бюджет[а-яё]*|стран[а-яё]*|рейтинг[а-яё]*)\s+(?:теперь\s+)?(?:важн[а-яё]*|важнее|главн[а-яё]*)/i.exec(text);
  const object =
    /(?:важн[а-яё]*|важнее|главн[а-яё]*)\s+(?:чем\s+)?(стипенди[а-яё]*|грант[а-яё]*|бюджет[а-яё]*|стран[а-яё]*|рейтинг[а-яё]*)/i.exec(text);

  const toLabel = (token: string): string => {
    const lower = token.toLowerCase();
    if (lower.startsWith("стипенд") || lower.startsWith("грант")) return "Стипендия";
    if (lower.startsWith("бюджет")) return "Бюджет";
    if (lower.startsWith("стран")) return "Страна";
    return "Рейтинг";
  };

  if (subject) {
    return {
      value: toLabel(subject[1]),
      quote: clipQuote(text, subject.index, subject[0].length),
      index: subject.index,
      confidence: 0.9,
    };
  }
  if (object) {
    return {
      value: toLabel(object[1]),
      quote: clipQuote(text, object.index, object[0].length),
      index: object.index,
      confidence: 0.8,
    };
  }
  return null;
}

function findIntake(text: string, now: Date): { value: string; quote: string; index: number } | null {
  const yearRegex = /(20\d\d)/g;
  let yearMatch: RegExpExecArray | null;
  while ((yearMatch = yearRegex.exec(text)) !== null) {
    const before = text.slice(Math.max(0, yearMatch.index - 28), yearMatch.index);
    if (/поступ|старт|осень|сентябр|начну|планиру|учебн|intake|заканчива/i.test(before)) {
      return {
        value: `Осень ${yearMatch[1]}`,
        quote: clipQuote(text, yearMatch.index, yearMatch[0].length),
        index: yearMatch.index,
      };
    }
  }
  const afterSchool = /после\s+(?:11|12)?\s*класса|после\s+школы|заканчиваю\s+школу|выпускник/i.exec(text);
  if (afterSchool) {
    const year = now.getUTCFullYear() + (now.getUTCMonth() >= 5 ? 1 : 0);
    return {
      value: `Осень ${year}`,
      quote: clipQuote(text, afterSchool.index, afterSchool[0].length),
      index: afterSchool.index,
    };
  }
  return null;
}

function findGrade(text: string): { value: string; quote: string; index: number } | null {
  const klass = /(\d{1,2})\s*[- ]?(?:й|ый|ий)?\s*класс/i.exec(text);
  if (klass) {
    return {
      value: `${klass[1]} класс`,
      quote: clipQuote(text, klass.index, klass[0].length),
      index: klass.index,
    };
  }
  const graduate = /выпускник\w*|заканчиваю\s+школу|окончил\w*\s+школ/i.exec(text);
  if (graduate) {
    return {
      value: "Выпускник школы",
      quote: clipQuote(text, graduate.index, graduate[0].length),
      index: graduate.index,
    };
  }
  return null;
}

function findName(text: string): { value: string; quote: string; index: number } | null {
  const match = /(?:меня\s+зовут|моё\s+имя|мое\s+имя)\s+([А-ЯЁA-Z][а-яёa-z-]{1,})/i.exec(text);
  if (!match) return null;
  const name = match[1].charAt(0).toUpperCase() + match[1].slice(1);
  return { value: name, quote: clipQuote(text, match.index, match[0].length), index: match.index };
}

function findConstraints(text: string): { value: string; quote: string; index: number }[] {
  const results: { value: string; quote: string; index: number }[] = [];
  const pattern = /(?:не\s+(?:хочу|могу|готов[а-яё]*|буду|планирую|рассматриваю)|не\s+готов[а-яё]*)\s+[^.!?]{3,90}/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const value = match[0].trim().replace(/\s+/g, " ");
    results.push({ value, quote: clipQuote(text, match.index, match[0].length), index: match.index });
  }
  return results;
}

function clipQuote(text: string, index: number, length: number, max = 140): string {
  const before = Math.max(0, index - 24);
  const after = Math.min(text.length, index + length + 24);
  let quote = text.slice(before, after).trim();
  if (before > 0) quote = `…${quote}`;
  if (after < text.length) quote = `${quote}…`;
  if (quote.length > max) quote = `${quote.slice(0, max - 1).trimEnd()}…`;
  return quote;
}

function makeId(field: MemoryField): string {
  return `f-${field}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

export function extractFacts(text: string, options: ExtractOptions = {}): MemoryFact[] {
  const source: MemorySource = options.source ?? "text";
  const now = options.now ?? new Date();
  const candidates: Candidate[] = [];

  const add = (
    field: MemoryField,
    value: string,
    display: string,
    quote: string,
    confidence: number,
    index: number,
    numeric?: number,
  ) => {
    candidates.push({ field, value, display, quote, confidence, index, numeric });
  };

  for (const { name, re } of COUNTRY_PATTERNS) {
    const match = re.exec(text);
    if (match) {
      add("country", name, name, clipQuote(text, match.index, match[0].length), 0.85, match.index);
    }
  }

  const money = findMoney(text);
  if (money) {
    add("budget", formatUsd(money.amountUsd), `до ${formatUsd(money.amountUsd)}`, money.quote, 0.9, money.index, money.amountUsd);
  }

  const ielts = findIelts(text);
  if (ielts) {
    add("ielts", ielts.value, ielts.display, ielts.quote, ielts.confidence, ielts.index, ielts.numeric ?? undefined);
  }

  const gpa = findGpa(text);
  if (gpa) add("gpa", gpa.value, gpa.display, gpa.quote, 0.85, gpa.index, gpa.numeric);

  for (const { label, re } of INTEREST_PATTERNS) {
    const match = re.exec(text);
    if (match) add("interests", label, label, clipQuote(text, match.index, match[0].length), 0.8, match.index);
  }

  for (const { label, re } of LANGUAGE_PATTERNS) {
    const match = re.exec(text);
    if (match) add("language", label, label, clipQuote(text, match.index, match[0].length), 0.75, match.index);
  }

  const priority = findPriority(text);
  if (priority) add("priority", priority.value, priority.value, priority.quote, priority.confidence, priority.index);

  const intake = findIntake(text, now);
  if (intake) add("intake", intake.value, intake.value, intake.quote, 0.8, intake.index);

  const grade = findGrade(text);
  if (grade) add("grade", grade.value, grade.value, grade.quote, 0.85, grade.index);

  const name = findName(text);
  if (name) add("name", name.value, name.value, name.quote, 0.9, name.index);

  for (const constraint of findConstraints(text)) {
    add("constraints", constraint.value, constraint.value, constraint.quote, 0.7, constraint.index);
  }

  return assembleFacts(candidates, source).map((item) => ({ ...item, id: makeId(item.field) }));
}

function assembleFacts(candidates: Candidate[], source: MemorySource): Omit<MemoryFact, "id">[] {
  const multiFields = new Set<MemoryField>(["country", "interests", "language", "constraints"]);
  const grouped = new Map<MemoryField, Candidate[]>();

  for (const candidate of candidates) {
    const list = grouped.get(candidate.field) ?? [];
    list.push(candidate);
    grouped.set(candidate.field, list);
  }

  const facts: (Omit<MemoryFact, "id"> & { order: number })[] = [];

  for (const [field, list] of grouped) {
    const sorted = [...list].sort((a, b) => a.index - b.index);
    if (multiFields.has(field)) {
      const unique: Candidate[] = [];
      for (const candidate of sorted) {
        if (!unique.some((item) => item.value === candidate.value)) unique.push(candidate);
      }
      const value = unique.map((item) => item.value).join("; ");
      const first = unique[0];
      facts.push({
        field,
        label: FIELD_LABELS[field],
        value,
        display: value,
        quote: first.quote,
        confidence: Math.max(...unique.map((item) => item.confidence)),
        source,
        createdAt: Date.now(),
        order: first.index,
      });
    } else {
      const best = sorted.reduce((acc, item) => (item.confidence > acc.confidence ? item : acc), sorted[0]);
      facts.push({
        field,
        label: FIELD_LABELS[field],
        value: best.value,
        display: best.display,
        quote: best.quote,
        confidence: best.confidence,
        numeric: best.numeric,
        source,
        createdAt: Date.now(),
        order: best.index,
      });
    }
  }

  facts.sort((a, b) => a.order - b.order);
  return facts.map(({ order: _order, ...rest }) => rest);
}

const HISTORY_LIMIT = 6;

function snapshot(item: MemoryFact): MemoryRevision {
  return {
    value: item.value,
    display: item.display,
    numeric: item.numeric,
    source: item.source,
    at: item.createdAt,
  };
}

function withHistory(previous: MemoryFact, next: Omit<MemoryFact, "history">): MemoryFact {
  return {
    ...next,
    // Идентичность факта в памяти — это поле, а не id: пользователь редактирует
    // «Бюджет», а не конкретную запись. Поэтому id сохраняем, чтобы чип не «прыгал».
    id: previous.id,
    history: [snapshot(previous), ...(previous.history ?? [])].slice(0, HISTORY_LIMIT),
  };
}

/**
 * Сливает новые факты в память и рассказывает, что именно изменилось.
 * Прежние значения не теряются — они уходят в history, поэтому память может
 * ответить на вопрос «а что ты говорил раньше».
 */
export function mergeFactsWithDiff(existing: MemoryFact[], incoming: MemoryFact[]): MergeResult {
  const result = [...existing];
  const changes: MemoryChange[] = [];
  const mergeable = new Set<MemoryField>(["interests", "country", "constraints", "language"]);

  for (const fresh of incoming) {
    const index = result.findIndex((item) => item.field === fresh.field);

    if (index === -1) {
      result.push(fresh);
      changes.push({
        field: fresh.field,
        label: fresh.label,
        kind: "added",
        after: fresh.display,
        quote: fresh.quote,
        at: fresh.createdAt,
      });
      continue;
    }

    const previous = result[index];

    if (mergeable.has(fresh.field)) {
      const known = splitValues(previous.value);
      const added = splitValues(fresh.value).filter((value) => !known.includes(value));
      if (!added.length) {
        changes.push({
          field: fresh.field,
          label: fresh.label,
          kind: "unchanged",
          before: previous.display,
          after: previous.display,
          quote: fresh.quote || previous.quote,
          at: fresh.createdAt,
        });
        continue;
      }
      const value = [...known, ...added].join("; ");
      result[index] = withHistory(previous, {
        ...previous,
        value,
        display: value,
        quote: fresh.quote || previous.quote,
        confidence: Math.max(previous.confidence, fresh.confidence),
        source: fresh.source,
        createdAt: fresh.createdAt,
      });
      changes.push({
        field: fresh.field,
        label: fresh.label,
        kind: "extended",
        before: previous.display,
        after: value,
        quote: fresh.quote || previous.quote,
        at: fresh.createdAt,
      });
      continue;
    }

    if (previous.value === fresh.value) {
      changes.push({
        field: fresh.field,
        label: fresh.label,
        kind: "unchanged",
        before: previous.display,
        after: fresh.display,
        quote: fresh.quote || previous.quote,
        at: fresh.createdAt,
      });
      continue;
    }

    result[index] = withHistory(previous, { ...fresh, id: previous.id });
    changes.push({
      field: fresh.field,
      label: fresh.label,
      kind: "updated",
      before: previous.display,
      after: fresh.display,
      quote: fresh.quote,
      at: fresh.createdAt,
    });
  }

  return { memories: result, changes };
}

/** Совместимая обёртка: та же память, без описания изменений. */
export function mergeFacts(existing: MemoryFact[], incoming: MemoryFact[]): MemoryFact[] {
  return mergeFactsWithDiff(existing, incoming).memories;
}

/** «Бюджет: до $15 000 → до $10 000; Страна: добавилась Финляндия» */
export function describeMemoryChanges(changes: MemoryChange[]): string {
  const meaningful = changes.filter((change) => change.kind !== "unchanged");
  if (!meaningful.length) return "";
  return meaningful
    .map((change) => {
      if (change.kind === "added") return `${change.label}: ${change.after}`;
      if (change.kind === "extended") return `${change.label}: добавилось «${change.after.split("; ").slice(-1)[0]}»`;
      return `${change.label}: ${change.before} → ${change.after}`;
    })
    .join("; ");
}

export function describeFacts(facts: MemoryFact[]): string {
  if (!facts.length) return "";
  return facts.map((item) => `${item.label} — ${item.display}`).join(", ");
}

export function knownCountryNames(): string[] {
  return COUNTRY_ORDER;
}
