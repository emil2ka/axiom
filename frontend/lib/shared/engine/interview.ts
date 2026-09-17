import type {
  InterviewProgress,
  InterviewQuestion,
  InterviewTurn,
  MemoryConflict,
  MemoryFact,
  MemoryField,
  Program,
  Recommendation,
} from "../types";
import { describeFacts, mergeFacts } from "./extract";
import { formatUsd } from "./format";
import {
  CORE_FIELDS,
  FIELD_LABELS,
  INTEREST_LABEL_TO_TAGS,
  fact,
  getBudget,
  getCountries,
  getIelts,
  getInterestTags,
  getIntakeYear,
  splitValues,
} from "./profile";
import { EUROPE_COUNTRIES, PROGRAMS, recommend, totalPerYear } from "./recommend";

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: "intro",
    text: "Привет! Я AXIOM — AI-наставник по поступлению. За несколько минут соберу твой профиль и построю личный маршрут. Для начала: как тебя зовут и в каком ты классе?",
    placeholder: "Например: Меня зовут Алия, 11 класс",
    quickReplies: [],
    core: false,
    fields: ["name", "grade"],
    opener: true,
  },
  {
    id: "country",
    text: "Куда хочешь поступить — есть страна или регион, который рассматриваешь?",
    placeholder: "Например: Европа, Германия или пока не решил",
    quickReplies: ["Европа", "Германия", "Польша", "Чехия", "Ещё не решил"],
    core: true,
    fields: ["country"],
  },
  {
    id: "budget",
    text: "Какой бюджет на год рассматриваешь — включая обучение и проживание?",
    placeholder: "Например: до $15k в год",
    quickReplies: ["До $8k", "До $12k", "До $15k", "До $25k", "Нужна стипендия"],
    core: true,
    fields: ["budget"],
  },
  {
    id: "ielts",
    text: "Что с IELTS — уже сдавал или ещё в планах?",
    placeholder: "Например: IELTS 6.0 или ещё не сдавал",
    quickReplies: ["IELTS 6.0", "IELTS 6.5", "Ещё не сдавал", "Планирую сдать"],
    core: true,
    fields: ["ielts"],
  },
  {
    id: "gpa",
    text: "Какая у тебя успеваемость? Напиши средний балл или GPA.",
    placeholder: "Например: 4.5 из 5",
    quickReplies: ["4.5 из 5", "4.0 из 5", "GPA 3.8"],
    core: false,
    fields: ["gpa"],
  },
  {
    id: "interests",
    text: "Что интересно по направлению — IT, дизайн, бизнес, инженерия, психология?",
    placeholder: "Например: IT и программирование, дизайн",
    quickReplies: ["IT и программирование", "Дизайн", "Бизнес и предпринимательство", "Психология", "Инженерия"],
    core: true,
    fields: ["interests"],
  },
  {
    id: "priority",
    text: "Когда планируешь старт и что важнее всего: страна, бюджет или стипендия?",
    placeholder: "Например: осень 2027, стипендия важнее страны",
    quickReplies: ["Осень 2027, важнее стипендия", "Важнее страна", "Важнее бюджет", "Пока не думал"],
    core: false,
    fields: ["priority", "intake"],
  },
  {
    id: "constraints",
    text: "Последний вопрос: есть ограничения, которые важно учесть? Например, не готов учить новый язык или не хочешь уезжать далеко.",
    placeholder: "Например: не хочу учить новый язык",
    quickReplies: ["Не хочу учить новый язык", "Ограничений нет", "Нужна только Европа"],
    core: false,
    fields: ["constraints", "language"],
  },
];

// ────────────────────────────────────────────────────────────────────────────
// Ожидаемая польза вопроса
//
// AXIOM спрашивает не по списку, а то, чей ответ сильнее всего меняет выдачу.
// Для каждого незаполненного поля подставляем несколько правдоподобных ответов
// и смотрим, насколько переставится топ-5. Поле, которое не влияет ни на что
// (например, GPA — он пока не участвует в скоринге), честно получает 0.
// ────────────────────────────────────────────────────────────────────────────

interface Probe {
  value: string;
  display?: string;
  numeric?: number;
}

const IMPACT_PROBES: Partial<Record<MemoryField, Probe[]>> = {
  country: [{ value: "Германия" }, { value: "Польша" }, { value: "Нидерланды" }, { value: "Финляндия" }],
  budget: [
    { value: "$8 000", display: "до $8 000", numeric: 8000 },
    { value: "$15 000", display: "до $15 000", numeric: 15000 },
    { value: "$30 000", display: "до $30 000", numeric: 30000 },
  ],
  ielts: [
    { value: "5.5", numeric: 5.5 },
    { value: "6.5", numeric: 6.5 },
    { value: "7.5", numeric: 7.5 },
  ],
  interests: [
    { value: "IT и программирование" },
    { value: "Дизайн" },
    { value: "Бизнес и предпринимательство" },
    { value: "Психология" },
  ],
  intake: [{ value: "Осень 2027" }, { value: "Осень 2028" }],
  priority: [{ value: "Стипендия" }, { value: "Бюджет" }, { value: "Страна" }],
  gpa: [
    { value: "3.5/5", display: "3.5 из 5", numeric: 3.5 },
    { value: "4.8/5", display: "4.8 из 5", numeric: 4.8 },
  ],
  language: [{ value: "Английский" }, { value: "Немецкий" }],
  constraints: [{ value: "не хочу учить новый язык" }],
  grade: [{ value: "11 класс" }],
  name: [{ value: "Алия" }],
};

function probeFact(field: MemoryField, probe: Probe): MemoryFact {
  return {
    id: `probe-${field}`,
    field,
    label: FIELD_LABELS[field],
    value: probe.value,
    display: probe.display ?? probe.value,
    quote: "",
    confidence: 0.5,
    numeric: probe.numeric,
    source: "manual",
    createdAt: 0,
  };
}

const TOP_N = 5;

/** Насколько два рейтинга расходятся в топ-5: 0 — идентичны, 1 — полностью разные. */
export function rankingChurn(before: Recommendation[], after: Recommendation[], topN = TOP_N): number {
  const beforeIds = before.slice(0, topN).map((item) => item.program.id);
  const afterIds = after.slice(0, topN).map((item) => item.program.id);
  if (!beforeIds.length || !afterIds.length) return 0;

  const beforeSet = new Set(beforeIds);
  const newcomers = afterIds.filter((id) => !beforeSet.has(id)).length;

  let displacement = 0;
  afterIds.forEach((id, index) => {
    const previous = beforeIds.indexOf(id);
    if (previous >= 0) displacement += Math.abs(previous - index);
  });
  const maxDisplacement = (topN * topN) / 2;

  const membership = newcomers / topN;
  const reorder = Math.min(1, displacement / maxDisplacement);
  return Math.min(1, membership * 0.7 + reorder * 0.3);
}

/** Ожидаемое влияние ответа на поле: среднее расхождение топ-5 по всем пробам. */
export function estimateImpact(
  memories: MemoryFact[],
  field: MemoryField,
  programs: Program[] = PROGRAMS,
): number {
  const probes = IMPACT_PROBES[field];
  if (!probes || !probes.length) return 0;
  const current = recommend(memories, { programs }).recommendations;
  const scores = probes.map((probe) => {
    const probed = recommend(mergeFacts(memories, [probeFact(field, probe)]), { programs }).recommendations;
    return rankingChurn(current, probed);
  });
  return scores.reduce((acc, value) => acc + value, 0) / scores.length;
}

// ────────────────────────────────────────────────────────────────────────────
// Противоречия в памяти
//
// Считаются на реальном датасете, а не на «ощущениях»: если в выбранной стране
// при названном бюджете нет ни одной программы — это факт, а не догадка.
// ────────────────────────────────────────────────────────────────────────────

function countriesToPrograms(countries: string[], programs: Program[]): Program[] {
  if (!countries.length) return programs;
  const wantsEurope = countries.includes("Европа");
  return programs.filter(
    (program) => countries.includes(program.country) || (wantsEurope && EUROPE_COUNTRIES.has(program.country)),
  );
}

function affordable(program: Program, budget: number): boolean {
  return program.scholarship === "full" || totalPerYear(program) <= budget;
}

export function detectConflicts(
  memories: MemoryFact[],
  programs: Program[] = PROGRAMS,
  now: Date = new Date(),
): MemoryConflict[] {
  const conflicts: MemoryConflict[] = [];
  const countries = getCountries(memories);
  const budget = getBudget(memories);
  const ielts = getIelts(memories);
  const tags = getInterestTags(memories);
  const intakeYear = getIntakeYear(memories);
  const inRegion = countriesToPrograms(countries, programs);
  const regionLabel = countries.join(", ");

  // 1. Бюджет не покрывает ни одной программы в выбранной географии.
  if (budget !== null && countries.length && inRegion.length) {
    const fits = inRegion.filter((program) => affordable(program, budget));
    if (!fits.length) {
      const cheapest = [...inRegion].sort((a, b) => totalPerYear(a) - totalPerYear(b))[0];
      conflicts.push({
        id: "budget-vs-country",
        fields: ["budget", "country"],
        text: `Регион «${regionLabel}»: в базе нет ни одной программы дешевле ${formatUsd(budget)}/год — минимум это ${formatUsd(totalPerYear(cheapest))} (${cheapest.university}).`,
        question: `Ты назвал бюджет ${formatUsd(budget)} в год и регион «${regionLabel}» — вместе они пока не сходятся: дешевле ${formatUsd(totalPerYear(cheapest))} там ничего нет. Что двигаем — бюджет, страну, или ищем варианты с полной стипендией?`,
        quickReplies: ["Готов поднять бюджет", "Важнее страна", "Ищем полную стипендию"],
        severity: "high",
      });
    }
  }

  // 2. IELTS ниже порога всех программ по интересам.
  if (ielts !== null) {
    const relevant = tags.length
      ? inRegion.filter((program) => program.tags.some((tag) => tags.includes(tag)))
      : inRegion;
    const passing = relevant.filter((program) => program.ieltsMin === null || program.ieltsMin <= ielts);
    if (relevant.length && !passing.length) {
      const lowest = Math.min(...relevant.map((program) => program.ieltsMin ?? 0));
      conflicts.push({
        id: "ielts-vs-programs",
        fields: ["ielts"],
        text: `Твой IELTS ${ielts.toFixed(1)} ниже порога всех подходящих программ — минимальный требуемый балл ${lowest.toFixed(1)}.`,
        question: `С IELTS ${ielts.toFixed(1)} ни одна программа по твоим интересам пока не проходит: минимум там ${lowest.toFixed(1)}. Планируешь пересдать или расширим поиск?`,
        quickReplies: ["Буду пересдавать", "Расширить поиск", "Рассмотрю другие страны"],
        severity: "high",
      });
    }
  }

  // 3. «Не хочу учить новый язык» при выборе страны, где обучение не на английском.
  const constraintValues = splitValues(fact(memories, "constraints")?.value ?? null).join(" ").toLowerCase();
  const refusesLanguage = /не\s+(?:хочу|готов|буду|планирую)[^.]*язы/.test(constraintValues);
  if (refusesLanguage && countries.length && inRegion.length) {
    // Смотрим только на программы по интересам: в Германии есть англоязычный IT,
    // но нет англоязычного права — противоречие зависит от направления.
    const relevantForLanguage = tags.length
      ? inRegion.filter((program) => program.tags.some((tag) => tags.includes(tag)))
      : inRegion;
    const english = relevantForLanguage.filter((program) => program.language === "Английский");
    if (relevantForLanguage.length && !english.length) {
      conflicts.push({
        id: "language-vs-country",
        fields: ["constraints", "country"],
        text: `Ты не готов учить новый язык, но в выбранном регионе («${regionLabel}») все программы в базе идут не на английском.`,
        question: `Ты сказал, что новый язык учить не хочешь — а в выбранном регионе («${regionLabel}») англоязычных программ в базе нет. Добавим страну с обучением на английском?`,
        quickReplies: ["Добавить другие страны", "Готов учить язык", "Только английский"],
        severity: "high",
      });
    }
  }

  // 4. Интересы не представлены в выбранной географии.
  if (tags.length && countries.length && inRegion.length) {
    const matched = inRegion.filter((program) => program.tags.some((tag) => tags.includes(tag)));
    if (!matched.length) {
      const elsewhere = programs.filter((program) => program.tags.some((tag) => tags.includes(tag)));
      const where = [...new Set(elsewhere.map((program) => program.country))].slice(0, 3).join(", ");
      conflicts.push({
        id: "interests-vs-country",
        fields: ["interests", "country"],
        text: `По твоему направлению в выбранном регионе («${regionLabel}») программ в базе нет${where ? `, зато есть в других странах: ${where}` : ""}.`,
        question: `В выбранном регионе («${regionLabel}») подходящих тебе по направлению программ пока нет${where ? `, а вот в ${where} — есть` : ""}. Расширим географию или меняем направление?`,
        quickReplies: where ? [`Рассмотрю ${where.split(", ")[0]}`, "Важнее страна", "Расширить поиск"] : ["Расширить поиск", "Важнее страна"],
        severity: "medium",
      });
    }
  }

  // 5. Планируемый старт раньше ближайшего дедлайна подачи.
  if (intakeYear !== null && intakeYear < now.getUTCFullYear()) {
    conflicts.push({
      id: "intake-in-past",
      fields: ["intake"],
      text: `Указан старт «осень ${intakeYear}», а сейчас уже ${now.getUTCFullYear()} год.`,
      question: `Ты указал старт осенью ${intakeYear}, но этот набор уже прошёл. На какой год планируем поступление?`,
      quickReplies: [`Осень ${now.getUTCFullYear() + 1}`, `Осень ${now.getUTCFullYear() + 2}`],
      severity: "medium",
    });
  }

  const severityOrder: Record<MemoryConflict["severity"], number> = { high: 0, medium: 1 };
  return conflicts.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);
}

function conflictToQuestion(conflict: MemoryConflict): InterviewQuestion {
  return {
    id: `conflict-${conflict.id}`,
    text: conflict.question,
    placeholder: "Ответь своими словами — я перепишу память",
    quickReplies: conflict.quickReplies,
    core: true,
    fields: conflict.fields,
  };
}

export function interviewProgress(memories: MemoryFact[], askedIds: string[]): InterviewProgress {
  const answered = INTERVIEW_QUESTIONS.filter((question) => askedIds.includes(question.id)).length;
  const known = CORE_FIELDS.filter((field) => fact(memories, field) !== undefined).length;
  return {
    answered,
    total: INTERVIEW_QUESTIONS.length,
    completeness: Math.round((known / CORE_FIELDS.length) * 100),
  };
}

export interface SelectOptions {
  programs?: Program[];
  now?: Date;
  /** Не задавать уточняющие вопросы по противоречиям. */
  skipConflicts?: boolean;
  /** Противоречия, которые пользователь уже проговорил. */
  resolvedConflictIds?: string[];
}

/**
 * Выбирает следующий вопрос: сначала знакомство, затем противоречия в памяти,
 * затем самый полезный пробел. Возвращает и причину выбора — её видно в API,
 * поэтому поведение интервью можно проверить, а не поверить на слово.
 */
export function selectNextQuestion(
  memories: MemoryFact[],
  askedIds: string[] = [],
  options: SelectOptions = {},
): InterviewTurn {
  const programs = options.programs ?? PROGRAMS;
  const now = options.now ?? new Date();
  const progress = interviewProgress(memories, askedIds);
  const conflicts = options.skipConflicts ? [] : detectConflicts(memories, programs, now);

  const opener = INTERVIEW_QUESTIONS.find((question) => question.opener);
  if (opener && !askedIds.includes(opener.id) && !memories.length) {
    return {
      question: opener,
      kind: "opener",
      reason: "Начинаем со знакомства — память пока пустая.",
      expectedImpact: 0,
      conflicts,
      progress,
    };
  }

  const resolved = new Set(options.resolvedConflictIds ?? []);
  const pending = conflicts.filter(
    (conflict) => !resolved.has(conflict.id) && !askedIds.includes(`conflict-${conflict.id}`),
  );
  if (pending.length) {
    const conflict = pending[0];
    return {
      question: conflictToQuestion(conflict),
      kind: "conflict",
      reason: `Противоречие в памяти: ${conflict.text}`,
      expectedImpact: 1,
      conflicts,
      progress,
    };
  }

  const candidates = INTERVIEW_QUESTIONS.filter((question) => {
    if (askedIds.includes(question.id)) return false;
    const fields = question.fields ?? [];
    if (!fields.length) return true;
    return fields.some((field) => fact(memories, field) === undefined);
  });

  if (!candidates.length) {
    // Вопросы кончились — это не то же самое, что «профиль собран». На «не знаю»
    // факт не появляется, и заявлять обратное значит врать в глаза человеку,
    // который видит рядом полноту профиля 33%.
    const missing = CORE_FIELDS.filter((field) => fact(memories, field) === undefined);
    return {
      question: null,
      kind: "done",
      reason: missing.length
        ? `Вопросы закончились, но профиль заполнен на ${progress.completeness}%. Не хватает: ${missing
            // IELTS — аббревиатура, её нельзя опускать в строчные наравне со словами.
            .map((field) => (FIELD_LABELS[field] === FIELD_LABELS[field].toUpperCase() ? FIELD_LABELS[field] : FIELD_LABELS[field].toLowerCase()))
            .join(", ")}. Скажи об этом в любой момент — я пересоберу подбор.`
        : "Все ключевые факты собраны — профиль готов к диагностике.",
      expectedImpact: 0,
      conflicts,
      progress,
    };
  }

  const ranked = candidates
    .map((question) => {
      const unknown = (question.fields ?? []).filter((field) => fact(memories, field) === undefined);
      const impact = unknown.length
        ? Math.max(...unknown.map((field) => estimateImpact(memories, field, programs)))
        : 0;
      return { question, impact, unknown };
    })
    // При равной пользе вперёд идут ключевые вопросы, затем исходный порядок.
    .sort((a, b) => b.impact - a.impact || Number(b.question.core) - Number(a.question.core));

  const best = ranked[0];
  const labels = best.unknown.map((field) => FIELD_LABELS[field]).join(" и ");
  const reason = best.impact > 0.01
    ? `Ответ про «${labels}» сильнее всего меняет топ-5: ожидаемое расхождение ${Math.round(best.impact * 100)}%.`
    : `Осталось уточнить «${labels}» — на рейтинг это не влияет, но нужно для маршрута.`;

  return {
    question: best.question,
    kind: "gap",
    reason,
    expectedImpact: Number(best.impact.toFixed(3)),
    conflicts,
    progress,
  };
}

// Расчёт пользы прогоняет скоринг несколько раз, а фронт зовёт nextQuestion
// на каждый рендер (в том числе на каждое нажатие клавиши). Кэшируем результат
// по состоянию памяти: пока память не изменилась, ответ тот же.
const TURN_CACHE_LIMIT = 40;
const turnCache = new Map<string, InterviewTurn>();

function cachedTurn(memories: MemoryFact[], askedIds: string[]): InterviewTurn {
  const key = interviewCacheKey(memories, askedIds);
  const hit = turnCache.get(key);
  if (hit) return hit;
  const turn = selectNextQuestion(memories, askedIds);
  if (turnCache.size >= TURN_CACHE_LIMIT) {
    const oldest = turnCache.keys().next().value;
    if (oldest !== undefined) turnCache.delete(oldest);
  }
  turnCache.set(key, turn);
  return turn;
}

/**
 * Совместимая обёртка. Без памяти ведёт себя как раньше — идёт по списку;
 * с памятью включает адаптивный выбор.
 */
export function nextQuestion(askedIds: string[], memories: MemoryFact[] = []): InterviewQuestion | null {
  if (!memories.length) {
    return INTERVIEW_QUESTIONS.find((question) => !askedIds.includes(question.id)) ?? null;
  }
  return cachedTurn(memories, askedIds).question;
}

export function composeAcknowledgment(facts: MemoryFact[]): string {
  if (!facts.length) return "";
  const visible = facts.slice(0, 3);
  const tail = facts.length > 3 ? ` и ещё ${facts.length - 3}` : "";
  const templates = ["Записал: {list}{tail}.", "Сохранил в память: {list}{tail}.", "Понял — {list}{tail}."];
  const template = templates[facts.length % templates.length];
  return template.replace("{list}", describeFacts(visible)).replace("{tail}", tail);
}

/** «Не знаю», «хз», «пока не решил» — это ответ, и его надо признать. */
const UNSURE = /не\s*знаю|хз|пока\s+не\s+(?:решил|определ|дума)|не\s+уверен|без\s+понятия|попозже|потом/i;

/**
 * «Ограничений нет», «всё подходит» — тоже осмысленный ответ, а не пустота.
 * Окончания перечислены как [а-яё]*: \w в JavaScript не включает кириллицу,
 * поэтому «ограничен\w*» не покрывает «ограничений».
 */
const NOTHING_TO_ADD =
  /(?:ограничен[а-яё]*|услови[а-яё]*|пожелани[а-яё]*)\s+нет|нет\s+(?:ограничен[а-яё]*|услови[а-яё]*)|вс[её]\s+(?:подход|устраива|норм)|ничего\s+так[а-яё]*|не\s+важно/i;

/**
 * Реплика, из которой ничего не извлеклось, не должна оставаться без ответа:
 * иначе AXIOM просто выстреливает следующий вопрос, и человек видит, что его
 * не услышали — в продукте, который обещает обратное.
 */
function composeMiss(userText: string): string {
  if (NOTHING_TO_ADD.test(userText)) return "Понял — ограничений нет, учту.";
  if (UNSURE.test(userText)) return "Хорошо, пропустим — вернёмся к этому, когда решишь.";
  return "Ничего конкретного не уловил в этой фразе — её всегда можно сказать иначе или добавить факт позже.";
}

export function composeAgentReply(
  facts: MemoryFact[],
  next: InterviewQuestion | null,
  userText = "",
): string {
  const acknowledgment = facts.length ? composeAcknowledgment(facts) : userText ? composeMiss(userText) : "";
  if (!next) {
    const outro = "Профиль собран — я сформировал память о тебе. Проверь факты и переходи к диагностике.";
    return acknowledgment ? `${acknowledgment}\n\n${outro}` : outro;
  }
  return acknowledgment ? `${acknowledgment}\n\n${next.text}` : next.text;
}

/** Ключ, по которому фронт может кэшировать решение интервью между рендерами. */
export function interviewCacheKey(memories: MemoryFact[], askedIds: string[]): string {
  const memoryKey = memories
    .map((item) => `${item.field}=${item.numeric ?? item.value}`)
    .sort()
    .join("|");
  return `${askedIds.slice().sort().join(",")}#${memoryKey}`;
}

export const INTEREST_OPTIONS = Object.keys(INTEREST_LABEL_TO_TAGS);
