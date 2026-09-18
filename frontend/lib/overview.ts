import {
  DEFAULT_JOURNEY_WHATIF,
  PROGRAMS,
  applyWhatIf,
  buildRoadmap,
  diagnose,
  parseIso,
  recommend,
  type Diagnosis,
  type JourneyWhatIf,
  type MemoryFact,
  type Program,
  type Roadmap,
  type RoadmapStep,
} from "@/lib/shared/engine";

export interface DeadlineItem {
  program: Program;
  label: string;
  intake: string;
  date: string;
}

export interface Overview {
  diagnosis: Diagnosis;
  target: Program | null;
  roadmap: Roadmap;
  doneSteps: number;
  totalSteps: number;
  nextStep: RoadmapStep | null;
  deadlines: DeadlineItem[];
  revisions: number;
  action: { href: string; title: string; text: string };
}

/** Общий расчёт витрин: дашборд и экран прогресса считают одно и то же. */
export function buildOverview(
  memories: MemoryFact[],
  targetId: string | null,
  roadmapDone: Record<string, boolean>,
  whatIf: JourneyWhatIf,
  options: { now?: number } = {},
): Overview {
  const now = options.now ?? Date.now();
  const diagnosis = diagnose(memories);

  const target = targetId
    ? PROGRAMS.find((program) => program.id === targetId) ?? null
    : (whatIf.presetId !== DEFAULT_JOURNEY_WHATIF.presetId
        ? applyWhatIf(memories, {
            budget: whatIf.budget,
            ielts: whatIf.ielts,
            countries: null,
            countryWeight: whatIf.countryWeight,
            budgetWeight: whatIf.budgetWeight,
            scholarshipWeight: whatIf.scholarshipWeight,
          }).recommendations
        : recommend(memories).recommendations
      )[0]?.program ?? null;

  const roadmap = buildRoadmap(memories, target);
  const totalSteps = roadmap.steps.length;
  const doneSteps = roadmap.steps.filter((step) => roadmapDone[step.id]).length;
  const nextStep = roadmap.steps.find((step) => !roadmapDone[step.id]) ?? null;
  const revisions = memories.reduce((sum, fact) => sum + (fact.history?.length ?? 0), 0);

  const source = target
    ? [target]
    : recommend(memories).recommendations.slice(0, 3).map((item) => item.program);
  const deadlines = source
    .flatMap((program) => program.deadlines.map((deadline) => ({ program, ...deadline })))
    .filter(({ date }) => {
      const parsed = parseIso(date);
      return parsed ? parsed.getTime() >= now - 24 * 60 * 60 * 1000 : false;
    })
    .sort((a, b) => (parseIso(a.date)?.getTime() ?? 0) - (parseIso(b.date)?.getTime() ?? 0))
    .slice(0, 3);

  const action =
    memories.length < 3
      ? { href: "/interview", title: "Продолжить интервью", text: "AXIOM задаст следующий вопрос о тебе" }
      : targetId === null
        ? { href: "/recommendations", title: "Выбрать цель", text: "Рекомендации готовы — закрепи программу" }
        : nextStep
          ? { href: "/roadmap", title: nextStep.title, text: nextStep.dueMonth }
          : { href: "/roadmap", title: "Маршрут пройден", text: "Все шаги отмечены — посмотри, что дальше" };

  return { diagnosis, target, roadmap, doneSteps, totalSteps, nextStep, deadlines, revisions, action };
}
