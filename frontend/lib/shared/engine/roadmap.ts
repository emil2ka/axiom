import type { MemoryFact, Program, Roadmap, RoadmapStep } from "../types";
import { shiftMonths, shiftMonthsIso } from "./format";
import { getInterestTags, getIelts, getLanguageNames } from "./profile";
import { PROGRAMS, recommend } from "./recommend";

interface DraftStep extends RoadmapStep {
  dueIso: string;
}

const ACTIVITY_BY_TAG: Record<string, { title: string; description: string }> = {
  it: {
    title: "Pet-проект или олимпиада по программированию",
    description: "Собери проект на GitHub и участвуй в олимпиаде — это усилит мотивационное письмо.",
  },
  data: {
    title: "Мини-исследование на данных",
    description: "Возьми открытый датасет и сделай разбор — покажи результат в портфолио.",
  },
  design: {
    title: "Конкурс дизайна или фриланс-кейс",
    description: "Добавь в портфолио 2–3 реальных работы или участие в конкурсе.",
  },
  business: {
    title: "Кейс-чемпионат или школьный проект",
    description: "Поучаствуй в бизнес-кейс-чемпионате — это ценный пункт заявки.",
  },
  finance: {
    title: "Проект по финансам или экономике",
    description: "Курс, исследование или олимпиада по экономике усилят заявку.",
  },
  engineering: {
    title: "Инженерный проект или робототехника",
    description: "Собери устройство или участвуй в соревновании — покажи инженерный интерес.",
  },
  psychology: {
    title: "Волонтёрский проект с людьми",
    description: "Помощь людям и социальные проекты — важная часть заявки на психологию.",
  },
  medicine: {
    title: "Профильные курсы и волонтёрство",
    description: "Курсы по биологии и помощь в медицинских проектах усилят профиль.",
  },
  architecture: {
    title: "Портфолио архитектурных работ",
    description: "Собери 5–7 эскизов и макетов для творческого портфолио.",
  },
  marketing: {
    title: "Проект по маркетингу или SMM",
    description: "Веди проект или соцсети — покажи измеримый результат.",
  },
  law: {
    title: "Дебатный клуб или правовой проект",
    description: "Дебаты и профильные олимпиады по праву усилят заявку.",
  },
};

export function buildRoadmap(memories: MemoryFact[], program: Program | null, programs: Program[] = PROGRAMS): Roadmap {
  const target = program ?? recommend(memories, { programs }).recommendations[0]?.program ?? null;
  if (!target) return { targetProgram: null, steps: [] };

  const ielts = getIelts(memories);
  const languages = getLanguageNames(memories);
  const req = target.ieltsMin;
  const deadlineIso = target.deadlines[0]?.date ?? "2027-07-01";
  const deadlineLabel = target.deadlines[0]?.label ?? "Подача заявки";
  const userTags = getInterestTags(memories);
  const focusTags = userTags.length ? userTags : target.tags;
  const sourceLabel = target.sources[0]?.label ?? "источник вуза";
  const drafts: DraftStep[] = [];

  const push = (step: Omit<DraftStep, "dueMonth">) => {
    drafts.push({ ...step, dueMonth: shiftMonths(step.dueIso, 0) });
  };

  if (ielts === null) {
    push({
      id: `${target.id}-ielts-diagnostic`,
      category: "exam",
      title: "Пробный тест IELTS",
      description: "Определи стартовый уровень, чтобы понять, сколько нужно подготовки.",
      dueIso: shiftMonthsIso(deadlineIso, -6),
      why: "Без понимания стартового уровня нельзя спланировать подготовку к порогу программы.",
      sourceNote: "Рекомендация AXIOM",
    });
    push({
      id: `${target.id}-ielts-prep`,
      category: "exam",
      title: `Подготовка к IELTS до ${(req ?? 6.0).toFixed(1)}`,
      description: "Курс или самостоятельная подготовка 3–4 раза в неделю, тренировочные тесты каждые 2 недели.",
      dueIso: shiftMonthsIso(deadlineIso, -4),
      why: `Для поступления в ${target.university} нужен IELTS от ${(req ?? 6.0).toFixed(1)}.`,
      sourceNote: "Демо-данные · требования программы",
    });
    push({
      id: `${target.id}-ielts-exam`,
      category: "exam",
      title: `Сдать IELTS (цель ${((req ?? 6.0) + 0.5).toFixed(1)}+)`,
      description: "Запишись на экзамен с запасом: результат действует 2 года, пересдача возможна.",
      dueIso: shiftMonthsIso(deadlineIso, -3),
      why: "Сертификат нужен до подачи заявки.",
      sourceNote: "Демо-данные · требования программы",
    });
  } else if (req !== null && ielts < req) {
    push({
      id: `${target.id}-ielts-up`,
      category: "exam",
      title: `Поднять IELTS с ${ielts.toFixed(1)} до ${req.toFixed(1)}`,
      description: `Не хватает ${(req - ielts).toFixed(1)} балла — фокус на слабых модулях (обычно writing и speaking).`,
      dueIso: shiftMonthsIso(deadlineIso, -4),
      why: `Порог программы — ${req.toFixed(1)}, у тебя ${ielts.toFixed(1)}.`,
      sourceNote: "Демо-данные · требования программы",
    });
    push({
      id: `${target.id}-ielts-retake`,
      category: "exam",
      title: "Пересдать IELTS",
      description: "Забронируй дату пересдачи минимум за 2 месяца до дедлайна подачи.",
      dueIso: shiftMonthsIso(deadlineIso, -3),
      why: "Нужен сертификат с достаточным баллом до подачи.",
      sourceNote: "Рекомендация AXIOM",
    });
  }

  if (target.language !== "Английский" && !languages.includes(target.language)) {
    push({
      id: `${target.id}-language`,
      category: "exam",
      title: `Подтвердить ${target.language} на уровень B2`,
      description: `Программа преподаётся на языке: ${target.language}. Запишись на курсы и сдай экзамен (например, Goethe-Zertifikat).`,
      dueIso: shiftMonthsIso(deadlineIso, -5),
      why: "Языковой сертификат — обязательное условие для этой программы.",
      sourceNote: "Демо-данные · требования программы",
    });
  }

  push({
    id: `${target.id}-transcript`,
    category: "documents",
    title: "Транскрипт с апостилем",
    description: "Закажи заверенный перевод транскрипта и апостиль — оформление занимает до 2 месяцев.",
    dueIso: shiftMonthsIso(deadlineIso, -6),
    why: "Апостиль оформляется долго, а без него документы не примут.",
    sourceNote: "Демо-данные · общие требования",
  });
  push({
    id: `${target.id}-recommendations`,
    category: "documents",
    title: "Рекомендательные письма ×2",
    description: "Попроси двух преподавателей — дай им своё CV и дедлайн.",
    dueIso: shiftMonthsIso(deadlineIso, -4),
    why: "Стандартный пакет заявки в европейские вузы.",
    sourceNote: "Демо-данные · общие требования",
  });
  push({
    id: `${target.id}-motivation`,
    category: "documents",
    title: `Мотивационное письмо для ${target.university}`,
    description: `Свяжи свои интересы с программой «${target.programName}» — используй факты из профиля.`,
    dueIso: shiftMonthsIso(deadlineIso, -3),
    why: "Ключевой документ: именно письмо объясняет, почему ты подходишь.",
    sourceNote: "Демо-данные · общие требования",
  });
  push({
    id: `${target.id}-cv-passport`,
    category: "documents",
    title: "CV и скан паспорта",
    description: "Обнови CV на английском и проверь срок действия паспорта (нужен запас 1,5+ года).",
    dueIso: shiftMonthsIso(deadlineIso, -5),
    why: "Паспорт с коротким сроком может заблокировать визу.",
    sourceNote: "Демо-данные · общие требования",
  });
  if (focusTags.includes("design") || target.tags.includes("design")) {
    push({
      id: `${target.id}-portfolio`,
      category: "documents",
      title: "Портфолио из 5–7 работ",
      description: "Оформи работы в PDF или Behance — это заменяет вступительные экзамены.",
      dueIso: shiftMonthsIso(deadlineIso, -3),
      why: "Для творческих направлений портфолио — главный критерий отбора.",
      sourceNote: "Демо-данные · требования программы",
    });
  }

  if (target.scholarship !== "none") {
    push({
      id: `${target.id}-scholarship`,
      category: "deadline",
      title: `Подача на стипендию: ${target.scholarship === "full" ? "полное покрытие" : "частичное покрытие"}`,
      description: target.scholarshipNote,
      dueIso: shiftMonthsIso(deadlineIso, -2),
      why: "Стипендиальные дедлайны обычно раньше обычных — не пропусти.",
      sourceNote: `Демо-данные · ${sourceLabel}`,
    });
  }

  push({
    id: `${target.id}-apply`,
    category: "deadline",
    title: `Подать заявку: ${target.university}`,
    description: deadlineLabel,
    dueIso: deadlineIso,
    why: "Основной дедлайн программы.",
    sourceNote: `Демо-данные · ${sourceLabel}`,
  });
  push({
    id: `${target.id}-housing`,
    category: "deadline",
    title: "Подача на общежитие или жильё",
    description: "Заявка на кампусное жильё открывается после подачи документов — места ограничены.",
    dueIso: shiftMonthsIso(deadlineIso, 1),
    why: "Жильё в студенческих городах разбирают быстро.",
    sourceNote: "Рекомендация AXIOM",
  });
  push({
    id: `${target.id}-visa`,
    category: "deadline",
    title: "Виза и медицинская страховка",
    description: "После зачисления — виза, страховка и подтверждение финансов.",
    dueIso: shiftMonthsIso(deadlineIso, 2),
    why: "Финальный шаг перед переездом, требует подтверждения зачисления.",
    sourceNote: "Демо-данные · общие требования",
  });

  const activity = ACTIVITY_BY_TAG[focusTags[0]] ?? {
    title: "Волонтёрство или профильная олимпиада",
    description: "Любая профильная активность усилит мотивационное письмо.",
  };
  push({
    id: `${target.id}-activity`,
    category: "activity",
    title: activity.title,
    description: activity.description,
    dueIso: shiftMonthsIso(deadlineIso, -2),
    why: "Активности показывают интерес к направлению лучше оценок.",
    sourceNote: "Рекомендация AXIOM",
  });

  const sorted = drafts.sort((a, b) => a.dueIso.localeCompare(b.dueIso));
  const steps: RoadmapStep[] = sorted.map(({ dueIso: _dueIso, ...step }) => step);
  return { targetProgram: target, steps };
}
