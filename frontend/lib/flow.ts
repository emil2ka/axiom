export interface FlowStep {
  id: string;
  href: string;
  label: string;
  short: string;
}

export const FLOW_STEPS: FlowStep[] = [
  { id: "interview", href: "/interview", label: "AI-интервью", short: "Интервью" },
  { id: "diagnosis", href: "/diagnosis", label: "Диагностика", short: "Диагностика" },
  { id: "recommendations", href: "/recommendations", label: "Рекомендации", short: "Вузы" },
  { id: "compare", href: "/compare", label: "Сравнение", short: "Сравнение" },
  { id: "whatif", href: "/whatif", label: "What If", short: "What If" },
  { id: "roadmap", href: "/roadmap", label: "Маршрут", short: "Маршрут" },
];

export function findStepIndex(pathname: string): number {
  return FLOW_STEPS.findIndex((step) => pathname.startsWith(step.href));
}
