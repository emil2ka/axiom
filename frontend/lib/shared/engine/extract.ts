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
import { normalizeNumerals } from "./numerals";

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
  // «Евроапа», «Еврпоа» — перестановка букв при быстром наборе очень частая.
  { name: "Европа", re: /европ|евроап|еврпо|евопр/i },
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
    re: /программиров|программист|информатик|компьютерн|разработк|разработчик|кодинг|software|веб|web|front[- ]?end|back[- ]?end|python|javascript|мобильн[а-яё]*\s+разраб|(^|[\s,;])(it|айти|ит)(?=[\s,;.]|$)/i,
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
    })) ??
    // «бюджет 15000» без валюты: в контексте поступления это доллары в год.
    // Порог в 3000 отсекает случайные числа вроде года или балла.
    tryMatch(new RegExp(`бюджет\\w*[^\\d]{0,15}(\\d{4,6})(?!\\s*(?:год|класс))`, "i"), (m) =>
      Number(m[1]) >= 3000 ? { numberRaw: m[1], currencyToken: "usd" } : null,
    )
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
  // «айлст», «илтс» — те же перестановки, что и в «Европе».
  const word = /ielts|ietls|айелтс|айэлтс|айлтс|аелтс|айлст|илтс/i.exec(text);
  const without = /без\s+(?:ielts|айелтс|айэлтс|айлтс)/i.exec(text);
  if (!word && !without) return null;
  const anchor = word ?? without;
  if (!anchor) return null;

  const window = text.slice(anchor.index, anchor.index + 70);
  // «айлтс шесть ноль» после нормализации даёт «айлтс 6 0» — это 6.0, а не 6.
  const splitScore = /(\d)\s+(\d)(?!\d)/.exec(window);
  const numMatch = /(\d(?:[.,]\d)?)/.exec(window);
  if (splitScore && Number(splitScore[1]) >= 4 && Number(splitScore[1]) <= 9 && Number(splitScore[2]) <= 9) {
    const combined = Number(`${splitScore[1]}.${splitScore[2]}`);
    if (combined >= 4 && combined <= 9) {
      return {
        value: combined.toFixed(1),
        display: combined.toFixed(1),
        numeric: combined,
        quote: clipQuote(text, anchor.index, splitScore.index + splitScore[0].length),
        index: anchor.index,
        confidence: 0.88,
      };
    }
  }
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

/**
 * Ограничения звучат по-разному: «не хочу…», «без стипендии не потяну»,
 * «только на английском», «нужна стипендия». Ловим все формы — иначе
 * ограничение молча теряется и рекомендации его не учитывают.
 */
const CONSTRAINT_PATTERNS: { re: RegExp; group: number }[] = [
  { re: /(?:не\s+(?:хочу|могу|буду|планирую|рассматриваю|готов[а-яё]*))\s+[^.!?;,]{3,70}/gi, group: 0 },
  // Обратный порядок слов: «новый язык учить не хочу», «далеко ехать не готов».
  // Начало привязано к запятой или союзу, иначе фраза съедает всё предложение,
  // а её показывают пользователю как его собственные слова.
  {
    re: /(?:^|[,;—–]\s*|\bно\s+|\bа\s+|\bи\s+)([а-яёa-z][^.!?;,]{2,50}?\s+не\s+(?:хочу|могу|буду|планирую|готов[а-яё]*))(?=[\s.,;!?]|$)/gi,
    group: 1,
  },
  { re: /без\s+(?:стипенди[а-яё]*|гранта)[^.!?;,]{0,50}/gi, group: 0 },
  { re: /(?:нужна|нужен|только\s+с)\s+(?:полн[а-яё]*\s+)?(?:стипенди[а-яё]*|грант)[^.!?;,]{0,40}/gi, group: 0 },
  { re: /только\s+(?:на\s+)?английск[а-яё]*[^.!?;,]{0,30}/gi, group: 0 },
  { re: /(?:финансово\s+)?не\s+потян[а-яё]*[^.!?;,]{0,40}/gi, group: 0 },
];

function findConstraints(text: string): { value: string; quote: string; index: number }[] {
  const results: { value: string; quote: string; index: number }[] = [];
  for (const { re, group } of CONSTRAINT_PATTERNS) {
    re.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text)) !== null) {
      const captured = match[group] ?? match[0];
      const value = captured.trim().replace(/\s+/g, " ");
      if (value.length < 4) continue;
      // Одна фраза может подойти под два шаблона — не дублируем.
      if (results.some((item) => item.value.includes(value) || value.includes(item.value))) continue;
      const index = match.index + match[0].indexOf(captured);
      results.push({ value, quote: clipQuote(text, index, captured.length), index });
    }
  }
  return results.sort((a, b) => a.index - b.index);
}

// ────────────────────────────────────────────────────────────────────────────
// Намерение: дополнить или заменить
//
// Разговор — это в том числе способ передумать. «Ещё рассматриваю Финляндию»
// дополняет память, а «хочу только Германию, а не всю Европу» заменяет её.
// Без этого различия сервис копил противоположное сказанному: три уточнения
// подряд превращались в «Европа; Германия; Польша».
// ────────────────────────────────────────────────────────────────────────────

/** Слова, после которых прежнее значение поля больше не действует. */
const REPLACE_MARKERS = /только|теперь|передума\w*|на самом деле|больше не|уже не|вместо|исключительно|определилс\w*|решил\w*\s+(?:всё\s+же\s+)?(?:в|на|поехать)/i;

/**
 * Отрицание конкретного значения: «а не в США», «не рассматриваю Германию»,
 * «кроме медицины». Между отрицанием и значением допускается только предлог и
 * один глагол из списка — любое слово растягивало отрицание на соседнее
 * значение, и «вместо Европы рассматриваю Турцию» теряло Турцию.
 */
const EXCLUDE_MARKERS =
  /(?:^|[\s,])(?:а\s+не|но\s+не|кроме|вместо|не)\s+(?:(?:рассматриваю|хочу|планирую|поеду|еду|буду|готов\w*|интересует|нравит\w*)\s+)?(?:(?:в|во|на|из|со|с|по)\s+)?(?:вс[ею]\w*\s+)?$/i;

/** «не только IT» — это включение, а не исключение и не замена. */
const INCLUSIVE_NOT = /не\s+только/i;

function isExcluded(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 28), index);
  if (INCLUSIVE_NOT.test(before)) return false;
  return EXCLUDE_MARKERS.test(before);
}

function hasReplaceIntent(text: string, index: number): boolean {
  // Смотрим на фразу вокруг значения, а не на всю реплику: «только» в одной
  // части предложения не должно перечёркивать поле из другой части.
  const window = text.slice(Math.max(0, index - 45), Math.min(text.length, index + 25));
  // «не только IT, но и дизайн» — перечисление, а не отказ от прежнего.
  if (INCLUSIVE_NOT.test(window)) return false;
  return REPLACE_MARKERS.test(window);
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

export function extractFacts(rawText: string, options: ExtractOptions = {}): MemoryFact[] {
  const source: MemorySource = options.source ?? "text";
  const now = options.now ?? new Date();
  // Голосовой ввод отдаёт числа словами: «пятнадцать тысяч», «шесть с половиной».
  // Нормализуем один раз, дальше все правила работают с привычными цифрами.
  const text = normalizeNumerals(rawText);
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

  // Значение, названное с отрицанием («а не всю Европу»), в память не попадает.
  const kept = candidates.filter((candidate) => !isExcluded(text, candidate.index));

  return assembleFacts(kept, source, text).map((item) => ({ ...item, id: makeId(item.field) }));
}

function assembleFacts(candidates: Candidate[], source: MemorySource, text = ""): Omit<MemoryFact, "id">[] {
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
        intent: unique.some((item) => hasReplaceIntent(text, item.index)) ? "replace" : "add",
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

    if (mergeable.has(fresh.field) && fresh.intent !== "replace") {
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

export function knownLanguageNames(): string[] {
  return LANGUAGE_PATTERNS.map((item) => item.label);
}

export function knownInterestLabels(): string[] {
  return INTEREST_PATTERNS.map((item) => item.label);
}

/**
 * Разбор значения, введённого руками при правке чипа памяти.
 *
 * Фронт использовал для этого свой примитивный парсер: он выдирал все цифры
 * подряд, поэтому «10к» превращалось в бюджет $10, «до 10 000 в год 2027» —
 * в $100 002 027, а IELTS можно было выставить 15. Правка чипа — это шаг
 * демо-сценария, и мусор туда попадает в первую очередь.
 *
 * Здесь работают те же правила, что и для речи, плюс границы допустимого:
 * один разбор на оба пути, без расхождений.
 */
export function reparseFactValue(
  field: MemoryField,
  raw: string,
): { value: string; display: string; numeric?: number } | null {
  const text = normalizeNumerals(raw.trim());
  if (!text) return null;

  if (field === "budget") {
    // «10к» само по себе не содержит ни валюты, ни слова «бюджет», поэтому
    // правила его не видят. Даём им недостающий контекст — это самый вероятный
    // ввод при правке чипа, и он не должен превращаться в бюджет $10.
    const money = findMoney(text) ?? findMoney(`бюджет до ${text}`);
    if (money) {
      return { value: formatUsd(money.amountUsd), display: `до ${formatUsd(money.amountUsd)}`, numeric: money.amountUsd };
    }
    // Голое число без валюты: в контексте поступления это доллары в год.
    const bare = /(\d[\d\s]*)/.exec(text);
    const amount = bare ? Number(bare[1].replace(/\s/g, "")) : NaN;
    if (Number.isFinite(amount) && amount >= 100 && amount <= 500000) {
      return { value: formatUsd(amount), display: `до ${formatUsd(amount)}`, numeric: amount };
    }
    return { value: raw.trim(), display: raw.trim() };
  }

  if (field === "ielts") {
    const match = /(\d(?:[.,]\d)?)/.exec(text);
    const score = match ? parseNumber(match[1]) : null;
    if (score !== null && score >= 4 && score <= 9) {
      return { value: score.toFixed(1), display: score.toFixed(1), numeric: score };
    }
    // Балл вне шкалы — это не балл. Сохраняем как текст, но без числа,
    // иначе скоринг посчитает несуществующий уровень языка.
    return { value: raw.trim(), display: raw.trim() };
  }

  if (field === "gpa") {
    const gpa = findGpa(text) ?? findGpa(`средний балл ${text}`);
    // «100» разбиралось как «1 из 5»: шаблон брал первую цифру длинного числа.
    // Считаем разбор верным, только если он совпал с числом в самой строке.
    const written = /(\d+(?:[.,]\d+)?)/.exec(text);
    const writtenValue = written ? parseNumber(written[1]) : null;
    if (gpa && (writtenValue === null || Math.abs(writtenValue - gpa.numeric) < 0.001)) {
      return { value: gpa.value, display: gpa.display, numeric: gpa.numeric };
    }
    return { value: raw.trim(), display: raw.trim() };
  }

  const cleaned = raw.trim();
  return { value: cleaned, display: cleaned };
}
