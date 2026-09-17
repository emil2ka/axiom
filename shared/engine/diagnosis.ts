import type { Diagnosis, MemoryFact, Program } from "../types";
import { formatUsd, pluralRu } from "./format";
import {
  CORE_FIELDS,
  fact,
  factValue,
  getBudget,
  getCountries,
  getGpa,
  getConstraints,
  getLanguageNames,
  getGpaPercent,
  getIelts,
  getInterestTags,
  getInterests,
  getIntakeYear,
  getPriority,
} from "./profile";
import { PROGRAMS, describePriorityEffect, relevantPrograms, totalPerYear } from "./recommend";

const PRIORITY_LABEL: Record<string, string> = {
  country: "страна",
  budget: "бюджет",
  scholarship: "стипендия",
  ranking: "рейтинг вуза",
};

export function diagnose(memories: MemoryFact[], programs: Program[] = PROGRAMS): Diagnosis {
  const present = CORE_FIELDS.filter((field) => fact(memories, field) !== undefined);
  const completeness = Math.round((present.length / CORE_FIELDS.length) * 100);

  const budget = getBudget(memories);
  const ielts = getIelts(memories);
  const gpa = getGpa(memories);
  const gpaPercent = getGpaPercent(memories);
  const countries = getCountries(memories);
  const interests = getInterests(memories);
  const intakeYear = getIntakeYear(memories);
  const priority = getPriority(memories);
  const tags = getInterestTags(memories);

  const strengths: string[] = [];
  const constraints: string[] = [];

  // Считаем в рамках того, что человек назвал. «33 из 45» ничего не значит для
  // того, кто хочет медицину: по его направлению программ три.
  const scope = relevantPrograms(memories, programs);
  const pool = scope.programs;
  const where = scope.label;

  /**
   * Покрытие — сильная сторона, только если оно действительно покрывает.
   * «Бюджет покрывает 0 из 3 программ» в разделе сильных сторон читается как
   * издевательство, а не как факт.
   */
  const record = (covered: number, text: string) => {
    if (pool.length > 0 && covered >= Math.ceil(pool.length / 2)) strengths.push(text);
    else constraints.push(text);
  };

  if (budget) {
    const fits = pool.filter((program) => program.scholarship === "full" || totalPerYear(program) <= budget);
    record(fits.length, `Бюджет ${formatUsd(budget)}/год покрывает ${fits.length} из ${pool.length} программ ${where}`);
    const over = pool.length - fits.length;
    if (over > 0) {
      constraints.push(
        `${over} ${pluralRu(over, "программа дороже", "программы дороже", "программ дороже")} бюджета — без стипендии они отсеиваются`,
      );
    }
  } else {
    constraints.push("Бюджет не указан — рекомендации менее точные");
  }

  if (ielts !== null) {
    const ok = pool.filter((program) => program.ieltsMin === null || program.ieltsMin <= ielts);
    record(ok.length, `IELTS ${ielts.toFixed(1)} открывает ${ok.length} из ${pool.length} программ ${where}`);
    const missing = pool.length - ok.length;
    if (missing > 0) {
      constraints.push(`${missing} ${pluralRu(missing, "программа требует", "программы требуют", "программ требуют")} IELTS выше ${ielts.toFixed(1)}`);
    }
  } else {
    constraints.push("IELTS не сдан — программы с языковым порогом пока под вопросом");
  }

  if (gpaPercent !== null) {
    // Сравниваем в процентах от максимума шкалы: 3.9 из 4 и 4.9 из 5 — оба отличники.
    const open = pool.filter((program) => program.gpaMinPercent === null || program.gpaMinPercent <= gpaPercent);
    record(
      open.length,
      gpaPercent >= 85
        ? `Средний балл ${gpa} (${gpaPercent}% от максимума) — сильная база для merit-стипендий, проходит порог ${open.length} из ${pool.length} программ ${where}`
        : `Средний балл ${gpa} (${gpaPercent}%) проходит порог ${open.length} из ${pool.length} программ ${where}`,
    );
    const closed = pool.length - open.length;
    if (closed > 0) {
      constraints.push(
        `${closed} ${pluralRu(closed, "программа требует", "программы требуют", "программ требуют")} средний балл выше ${gpaPercent}%`,
      );
    }
  } else {
    constraints.push("Средний балл не указан — отборные программы оценить нельзя");
  }

  if (tags.length) {
    const matched = programs.filter((program) => program.tags.some((tag) => tags.includes(tag)));
    strengths.push(`Интересы совпадают с ${matched.length} ${pluralRu(matched.length, "программой", "программами", "программами")} в базе`);
  } else {
    constraints.push("Интересы не указаны — сложно подобрать направление");
  }

  // Сколько вариантов реально проходят по всем названным условиям. Если их
  // один-два, человек должен узнать это здесь, а не после подачи документов.
  const viable = pool.filter((program) => {
    const affordable = budget === null || program.scholarship === "full" || totalPerYear(program) <= budget;
    const languageOk = ielts === null || program.ieltsMin === null || program.ieltsMin <= ielts;
    const gradeOk = gpaPercent === null || program.gpaMinPercent === null || program.gpaMinPercent <= gpaPercent;
    return affordable && languageOk && gradeOk;
  });
  // Условий не названо — «проходит по всем условиям» бессмысленно и льстиво.
  const statedConditions = [budget !== null, ielts !== null, gpaPercent !== null].filter(Boolean).length;
  if (!statedConditions) {
    // молчим: считать нечего
  } else if (pool.length && viable.length <= 2) {
    constraints.push(
      viable.length === 0
        ? `По всем твоим условиям сразу не проходит ни одна программа ${where} — что-то придётся смягчить: бюджет, порог или географию`
        : `По всем условиям сразу проходит ${viable.length} ${pluralRu(viable.length, "программа", "программы", "программ")} ${where} — выбор узкий, стоит расширить географию или бюджет`,
    );
  } else if (viable.length >= 3) {
    strengths.push(`По всем твоим условиям сразу проходит ${viable.length} ${pluralRu(viable.length, "программа", "программы", "программ")} ${where}`);
  }

  const languages = getLanguageNames(memories).filter((name) => name !== "Английский");
  for (const language of languages) {
    const open = programs.filter((program) => program.language === language);
    if (open.length) {
      strengths.push(
        `Знаешь ${language.toLowerCase()} — открывается ${open.length} ${pluralRu(open.length, "программа", "программы", "программ")} на этом языке`,
      );
    }
  }

  // Ограничения, названные самим человеком: раньше они нигде не проявлялись.
  const stated = getConstraints(memories);
  for (const phrase of stated.raw) {
    const capitalized = phrase.charAt(0).toUpperCase() + phrase.slice(1);
    constraints.push(`Твоё условие: «${capitalized}» — учтено в подборе`);
  }
  if (stated.englishOnly) {
    const english = programs.filter((program) => program.language === "Английский");
    strengths.push(`Только англоязычные программы: подходит ${english.length} из ${programs.length}`);
  }
  if (stated.needsScholarship) {
    const funded = programs.filter((program) => program.scholarship !== "none");
    strengths.push(`Со стипендией: ${funded.length} из ${programs.length} программ дают частичное или полное покрытие`);
  }

  if (priority) {
    strengths.push(`Приоритет «${PRIORITY_LABEL[priority] ?? priority}»: ${describePriorityEffect(priority)}`);
  } else {
    constraints.push("Главный приоритет не назван — критерии взвешены поровну, выдача менее заточена под тебя");
  }

  const grade = factValue(memories, "grade");
  const goalParts: string[] = [grade ? `${grade} → бакалавриат` : "Бакалавриат"];
  goalParts.push(countries.length ? countries.join(", ") : "регион не выбран");
  goalParts.push(interests.length ? interests.join(", ") : "направление не выбрано");
  goalParts.push(intakeYear ? `старт осень ${intakeYear}` : "срок не указан");
  goalParts.push(budget ? `бюджет до ${formatUsd(budget)}/год` : "бюджет не указан");
  const goal = goalParts.join(" · ");

  // Имя — единственный факт, который намеренно не влияет на рейтинг. Но он
  // должен звучать в ответе: иначе память о человеке остаётся декорацией.
  const name = factValue(memories, "name");
  const greeting = name ? `${name}, ` : "";
  const summary =
    completeness >= 60
      ? `${greeting}профиль заполнен на ${completeness}%. Цель понятна: ${goal}. Ниже — сильные стороны и то, что ограничивает выбор.`
      : `${greeting}профиль заполнен на ${completeness}%. Данных пока мало — ответь ещё на несколько вопросов интервью, и рекомендации станут точнее.`;

  return {
    summary,
    strengths,
    constraints,
    goal,
    completeness,
    knownFacts: present.length,
    totalCoreFacts: CORE_FIELDS.length,
  };
}
