import type { Diagnosis, MemoryFact, Program } from "../types";
import { formatUsd, pluralRu } from "./format";
import {
  CORE_FIELDS,
  fact,
  getBudget,
  getCountries,
  getGpa,
  getIelts,
  getInterestTags,
  getInterests,
  getIntakeYear,
  getPriority,
} from "./profile";
import { PROGRAMS, totalPerYear } from "./recommend";

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
  const countries = getCountries(memories);
  const interests = getInterests(memories);
  const intakeYear = getIntakeYear(memories);
  const priority = getPriority(memories);
  const tags = getInterestTags(memories);

  const strengths: string[] = [];
  const constraints: string[] = [];

  if (budget) {
    const fits = programs.filter((program) => program.scholarship === "full" || totalPerYear(program) <= budget);
    strengths.push(`Бюджет ${formatUsd(budget)}/год покрывает ${fits.length} из ${programs.length} программ в базе`);
    const over = programs.length - fits.length;
    if (over > 0) {
      constraints.push(
        `${over} ${pluralRu(over, "программа дороже", "программы дороже", "программ дороже")} бюджета — без стипендии они отсеиваются`,
      );
    }
  } else {
    constraints.push("Бюджет не указан — рекомендации менее точные");
  }

  if (ielts !== null) {
    const ok = programs.filter((program) => program.ieltsMin === null || program.ieltsMin <= ielts);
    strengths.push(`IELTS ${ielts.toFixed(1)} открывает ${ok.length} из ${programs.length} программ`);
    const missing = programs.length - ok.length;
    if (missing > 0) {
      constraints.push(`${missing} ${pluralRu(missing, "программа требует", "программы требуют", "программ требуют")} IELTS выше ${ielts.toFixed(1)}`);
    }
  } else {
    constraints.push("IELTS не сдан — программы с языковым порогом пока под вопросом");
  }

  if (gpa !== null && gpa >= 4.2) {
    strengths.push(`Средний балл ${gpa} — хорошая база для merit-стипендий`);
  }

  if (tags.length) {
    const matched = programs.filter((program) => program.tags.some((tag) => tags.includes(tag)));
    strengths.push(`Интересы совпадают с ${matched.length} ${pluralRu(matched.length, "программой", "программами", "программами")} в базе`);
  } else {
    constraints.push("Интересы не указаны — сложно подобрать направление");
  }

  if (priority) {
    strengths.push(`Приоритет зафиксирован: ${PRIORITY_LABEL[priority] ?? priority} — учтён в ранжировании`);
  }

  const goalParts: string[] = ["Бакалавриат"];
  goalParts.push(countries.length ? countries.join(", ") : "регион не выбран");
  goalParts.push(interests.length ? interests.join(", ") : "направление не выбрано");
  goalParts.push(intakeYear ? `старт осень ${intakeYear}` : "срок не указан");
  goalParts.push(budget ? `бюджет до ${formatUsd(budget)}/год` : "бюджет не указан");
  const goal = goalParts.join(" · ");

  const summary =
    completeness >= 60
      ? `Профиль заполнен на ${completeness}%. Цель понятна: ${goal}. Ниже — сильные стороны и то, что ограничивает выбор.`
      : `Профиль заполнен на ${completeness}%. Данных пока мало — ответь ещё на несколько вопросов интервью, и рекомендации станут точнее.`;

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
