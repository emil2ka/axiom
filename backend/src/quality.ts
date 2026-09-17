/**
 * Измеримое качество рекомендаций.
 *
 * selftest проверяет механику («приоритет меняет веса»), e2e — границу HTTP.
 * Здесь проверяется то, ради чего всё написано: разумен ли ответ для живого
 * абитуриента. Набор профилей сформулирован так, как говорят люди, а ожидания —
 * это то, что любой человек назвал бы очевидным. Регрессия скоринга видна
 * числом, а не на глаз.
 */
import {
  PROGRAMS,
  buildRoadmap,
  extractFacts,
  getConstraints,
  getInterestTags,
  getLanguageNames,
  recommend,
  totalPerYear,
  type MemoryFact,
  type Program,
  type Recommendation,
} from "./shared/engine/index";

const NOW = new Date("2026-09-17T12:00:00Z");
/** Ниже этого порога подборку нельзя показывать жюри. */
const PASS_THRESHOLD = 95;

interface Expectation {
  name: string;
  holds: (top: Recommendation[], all: Recommendation[]) => boolean;
}

interface Profile {
  id: string;
  says: string;
  expectations: Expectation[];
}

// ── Переиспользуемые ожидания ──────────────────────────────────────────────

const topMatchesInterest = (count = 3): Expectation => ({
  name: `топ-${count} по заявленному направлению`,
  holds: (top) => {
    const tags = getInterestTags(memoriesOf(current));
    return top.slice(0, count).every((item) => item.program.tags.some((tag) => tags.includes(tag)));
  },
});

/**
 * Иногда в бюджет не укладывается вообще ничего — например, «Европа за $9k».
 * Требовать от движка невозможного нельзя, а вот молчать о превышении нельзя
 * тем более. Гарантия такая: дороже бюджета — только с явной пометкой.
 */
const budgetIsNeverSilent = (count = 3): Expectation => ({
  name: `в топ-${count} нет молча превышенного бюджета`,
  holds: (top) => {
    const budget = budgetOf(current);
    if (budget === null) return true;
    return top.slice(0, count).every((item) => {
      if (item.program.scholarship === "full") return true;
      if (totalPerYear(item.program) <= budget) return true;
      const mentionsCost = (text: string) => /бюджет|стоимост|дорож|не хватает/i.test(text);
      return item.gaps.some((gap) => mentionsCost(gap.text)) || item.reasons.some((reason) => mentionsCost(reason.text));
    });
  },
});

const topWithinBudget = (count = 3): Expectation => ({
  name: `топ-${count} по карману`,
  holds: (top) => {
    const budget = budgetOf(current);
    if (budget === null) return true;
    return top
      .slice(0, count)
      .every((item) => item.program.scholarship === "full" || totalPerYear(item.program) <= budget * 1.15);
  },
});

const noConstraintViolationsInTop = (count = 5): Expectation => ({
  name: `в топ-${count} нет нарушений названных ограничений`,
  holds: (top) => {
    const memories = memoriesOf(current);
    const constraints = getConstraints(memories);
    const known = getLanguageNames(memories);
    return top.slice(0, count).every((item) => {
      if (constraints.englishOnly && item.program.language !== "Английский" && !known.includes(item.program.language)) {
        return false;
      }
      if (constraints.needsScholarship && item.program.scholarship === "none") return false;
      return true;
    });
  },
});

const everyTopIsExplained = (count = 5): Expectation => ({
  name: `у каждой программы в топ-${count} есть объяснение`,
  holds: (top) => top.slice(0, count).every((item) => item.reasons.length > 0),
});

const expectProgram = (id: string, within = 5): Expectation => ({
  name: `«${PROGRAMS.find((program) => program.id === id)?.university ?? id}» в топ-${within}`,
  holds: (top) => top.slice(0, within).some((item) => item.program.id === id),
});

const expectCountry = (countries: string[], count = 3): Expectation => ({
  name: `топ-${count} из ожидаемых стран (${countries.join(", ")})`,
  holds: (top) => top.slice(0, count).every((item) => countries.includes(item.program.country)),
});

const expectLanguage = (language: string, count = 2): Expectation => ({
  name: `топ-${count} на языке: ${language}`,
  holds: (top) => top.slice(0, count).every((item) => item.program.language === language),
});

/**
 * Показать амбициозную программу первой с честной пометкой «отборная» —
 * нормально. Оставить человека вообще без достижимого варианта — нет.
 */
const hasReachableOption = (count = 5): Expectation => ({
  name: `в топ-${count} есть хотя бы один достижимый вариант`,
  holds: (top) => top.slice(0, count).some((item) => !item.gaps.some((gap) => gap.severity === "high")),
});

const reachableBeatsUnreachable: Expectation = {
  name: "достижимые программы не ниже недостижимых с тем же профилем",
  holds: (top) => {
    const scored = top.slice(0, 10);
    const reachable = scored.filter((item) => !item.gaps.some((gap) => gap.severity === "high"));
    const unreachable = scored.filter((item) => item.gaps.some((gap) => gap.severity === "high"));
    if (!reachable.length || !unreachable.length) return true;
    // Достижимая программа должна быть хотя бы одна выше половины недостижимых.
    const bestReachable = Math.min(...reachable.map((item) => item.rank));
    return bestReachable <= Math.ceil(unreachable.length / 2) + 1;
  },
};

// ── Набор профилей ─────────────────────────────────────────────────────────

const PROFILES: Profile[] = [
  {
    id: "classic-it",
    says: "Меня зовут Алия, 11 класс. Хочу в Европу, бюджет до $15k в год, IELTS 6.0, средний балл 4.5. Интересуюсь IT и программированием. Стипендия важнее страны.",
    expectations: [topMatchesInterest(3), topWithinBudget(3), budgetIsNeverSilent(5), everyTopIsExplained(5), hasReachableOption(5)],
  },
  {
    id: "tight-budget",
    says: "Хочу учиться в Европе на программиста, но бюджет очень маленький — до $7k в год. IELTS 6.0.",
    expectations: [topMatchesInterest(3), topWithinBudget(3), budgetIsNeverSilent(5), everyTopIsExplained(5)],
  },
  {
    id: "medicine",
    says: "Хочу стать врачом, учиться в Европе. Бюджет до $25k, IELTS 6.5, средний балл 4.8.",
    expectations: [topMatchesInterest(2), topWithinBudget(2), everyTopIsExplained(5), expectProgram("cuni-med", 3)],
  },
  {
    id: "law",
    says: "Интересует право, хочу в Европу. Бюджет до $35k, IELTS 7.0, средний балл 4.7.",
    expectations: [topMatchesInterest(2), everyTopIsExplained(5)],
  },
  {
    id: "design-portfolio",
    says: "Хочу на дизайн, у меня есть портфолио. Европа, бюджет до $14k, IELTS 6.0.",
    expectations: [topMatchesInterest(2), topWithinBudget(2), everyTopIsExplained(5)],
  },
  {
    id: "knows-german",
    says: "Хочу в Германию на инженерию, знаю немецкий. Бюджет до $12k, средний балл 4.6.",
    expectations: [expectLanguage("Немецкий", 2), expectCountry(["Германия"], 2), topMatchesInterest(2)],
  },
  {
    id: "english-only",
    says: "Хочу в Германию на инженерию, но новый язык учить не хочу. Бюджет до $20k, IELTS 6.5, средний балл 4.5.",
    expectations: [noConstraintViolationsInTop(5), expectLanguage("Английский", 3), everyTopIsExplained(5)],
  },
  {
    id: "needs-scholarship",
    says: "Интересует бизнес и менеджмент, Европа. Без стипендии не потяну. IELTS 6.5, средний балл 4.7.",
    expectations: [noConstraintViolationsInTop(5), topMatchesInterest(3), everyTopIsExplained(5)],
  },
  {
    id: "weak-profile",
    says: "Хочу в Европу на IT, но IELTS всего 5.5 и средний балл 3.2. Бюджет до $9k.",
    expectations: [budgetIsNeverSilent(3), hasReachableOption(5), reachableBeatsUnreachable, everyTopIsExplained(5)],
  },
  {
    id: "strong-profile",
    says: "Хочу в Европу на Data Science. IELTS 7.5, средний балл 4.9, бюджет до $40k. Рейтинг вуза важнее бюджета.",
    expectations: [topMatchesInterest(3), everyTopIsExplained(5), hasReachableOption(3)],
  },
  {
    id: "turkey-cheap",
    says: "Рассматриваю Турцию, интересует бизнес. Бюджет до $8k в год, IELTS 6.0.",
    expectations: [expectCountry(["Турция"], 1), topWithinBudget(2), topMatchesInterest(2)],
  },
  {
    // Так реплика приходит из Web Speech: строчными и без пунктуации.
    id: "voice-input",
    says: "хочу поступить в европу бюджет до пятнадцати тысяч долларов в год айлтс шесть с половиной интересует программирование",
    expectations: [topMatchesInterest(3), budgetIsNeverSilent(5), everyTopIsExplained(5), hasReachableOption(5)],
  },
  {
    id: "architecture",
    says: "Хочу на архитектуру, Европа, бюджет до $13k, IELTS 6.0, средний балл 4.4.",
    expectations: [topMatchesInterest(2), topWithinBudget(2), everyTopIsExplained(5)],
  },
];

// Ожидания читают профиль, который сейчас проверяется.
let current: Profile = PROFILES[0];
const memoryCache = new Map<string, MemoryFact[]>();

function memoriesOf(profile: Profile): MemoryFact[] {
  const cached = memoryCache.get(profile.id);
  if (cached) return cached;
  const facts = extractFacts(profile.says, { now: NOW });
  memoryCache.set(profile.id, facts);
  return facts;
}

function budgetOf(profile: Profile): number | null {
  const fact = memoriesOf(profile).find((item) => item.field === "budget");
  return typeof fact?.numeric === "number" ? fact.numeric : null;
}

function fieldPrecisionAt5(profile: Profile, top: Recommendation[]): number | null {
  const tags = getInterestTags(memoriesOf(profile));
  if (!tags.length) return null;
  const hits = top.slice(0, 5).filter((item) => item.program.tags.some((tag) => tags.includes(tag))).length;
  return hits / 5;
}

function main(): void {
  let met = 0;
  let total = 0;
  const failures: string[] = [];
  const precisions: number[] = [];
  const emptyRoadmaps: string[] = [];

  console.log("\nКачество рекомендаций на живых профилях\n");
  console.log("профиль              ожиданий  топ-1");
  console.log("─".repeat(78));

  for (const profile of PROFILES) {
    current = profile;
    const memories = memoriesOf(profile);
    const result = recommend(memories);
    const top = result.recommendations;

    let profileMet = 0;
    for (const expectation of profile.expectations) {
      total += 1;
      if (expectation.holds(top, result.recommendations)) {
        met += 1;
        profileMet += 1;
      } else {
        failures.push(`${profile.id}: ${expectation.name}`);
      }
    }

    const precision = fieldPrecisionAt5(profile, top);
    if (precision !== null) precisions.push(precision);

    // Маршрут должен строиться для любого профиля — пустой план это провал пути.
    const roadmap = buildRoadmap(memories, null);
    if (!roadmap.targetProgram || roadmap.steps.length < 6) emptyRoadmaps.push(profile.id);

    const mark = profileMet === profile.expectations.length ? "ok  " : "FAIL";
    const leader: Program = top[0].program;
    console.log(
      `${mark} ${profile.id.padEnd(18)} ${String(profileMet)}/${profile.expectations.length}      ` +
        `${leader.university.slice(0, 30).padEnd(32)} ${leader.field.slice(0, 22)}`,
    );
  }

  const score = Math.round((met / total) * 100);
  const avgPrecision = precisions.length
    ? Math.round((precisions.reduce((acc, value) => acc + value, 0) / precisions.length) * 100)
    : 0;

  console.log("─".repeat(78));
  console.log(`\nОжиданий выполнено:        ${met}/${total} (${score}%)`);
  console.log(`Точность направления в топ-5: ${avgPrecision}% (доля программ по заявленному интересу)`);
  console.log(`Маршрут построен:          ${PROFILES.length - emptyRoadmaps.length}/${PROFILES.length}`);

  if (failures.length) {
    console.log("\nНе выполнено:");
    for (const failure of failures) console.log(`  · ${failure}`);
  }
  if (emptyRoadmaps.length) {
    console.log(`\nПустой или короткий маршрут: ${emptyRoadmaps.join(", ")}`);
  }

  const ok = score >= PASS_THRESHOLD && emptyRoadmaps.length === 0;
  console.log(`\n${ok ? "Порог пройден" : "НИЖЕ ПОРОГА"}: ${score}% при минимуме ${PASS_THRESHOLD}%\n`);
  if (!ok) process.exit(1);
}

main();
