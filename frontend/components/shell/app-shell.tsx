"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { Badge } from "@/components/ui/badge";
import { IconCircleCheck, IconRefresh } from "@/components/icons";
import { ProgressBar } from "@/components/ui/progress";
import { FLOW_STEPS, findStepIndex } from "@/lib/flow";
import { useHydrated } from "@/lib/hooks";
import { useAxiomStore } from "@/lib/store";
import { pluralRu } from "@/lib/shared/engine";
import { cn } from "@/lib/utils";

function stepState(index: number, currentIndex: number): "done" | "current" | "upcoming" {
  if (currentIndex === -1) return "upcoming";
  if (index < currentIndex) return "done";
  if (index === currentIndex) return "current";
  return "upcoming";
}

function Stepper({ currentIndex }: { currentIndex: number }) {
  return (
    <nav aria-label="Этапы маршрута">
      <ol className="flex items-center">
        {FLOW_STEPS.map((step, index) => {
          const state = stepState(index, currentIndex);
          return (
            <li key={step.id} className="flex items-center">
              {index > 0 ? <span aria-hidden="true" className="mx-1 h-px w-3 bg-line xl:w-5" /> : null}
              <Link
                href={step.href}
                aria-current={state === "current" ? "step" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full px-2.5 py-1.5 text-[12.5px] font-medium transition-colors",
                  state === "current" && "bg-white/[0.08] text-mist-50",
                  state === "done" && "text-mist-300 hover:text-mist-100",
                  state === "upcoming" && "text-mist-500 hover:text-mist-300",
                )}
              >
                {state === "done" ? (
                  <IconCircleCheck className="h-4.5 w-4.5 text-teal-400" />
                ) : (
                  <span
                    className={cn(
                      "flex h-4.5 w-4.5 items-center justify-center rounded-full border text-[10.5px] tabular-nums",
                      state === "current"
                        ? "border-transparent bg-gradient-to-br from-violet-500 to-violet-600 text-white"
                        : "border-line text-mist-500",
                    )}
                  >
                    {index + 1}
                  </span>
                )}
                <span className="hidden xl:inline">{step.short}</span>
              </Link>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function StepperMobile({ currentIndex }: { currentIndex: number }) {
  const safeIndex = currentIndex === -1 ? 0 : currentIndex;
  const step = FLOW_STEPS[safeIndex];
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-mist-200">
          Шаг {safeIndex + 1} из {FLOW_STEPS.length} · {step.label}
        </span>
        <span className="text-mist-500">{Math.round(((safeIndex + 1) / FLOW_STEPS.length) * 100)}%</span>
      </div>
      <ProgressBar value={((safeIndex + 1) / FLOW_STEPS.length) * 100} size="sm" />
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const currentIndex = findStepIndex(pathname);
  const hydrated = useHydrated();
  const memoriesCount = useAxiomStore((state) => state.memories.length);
  const demoMode = useAxiomStore((state) => state.demoMode);
  const resetAll = useAxiomStore((state) => state.resetAll);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line-soft bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link href="/" aria-label="AXIOM — на главную" className="shrink-0">
            <Logo />
          </Link>
          <div className="hidden flex-1 justify-center lg:flex">
            <Stepper currentIndex={currentIndex} />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {hydrated && demoMode ? (
              <Badge tone="teal" dot className="hidden sm:inline-flex">
                Демо-профиль
              </Badge>
            ) : null}
            {hydrated && memoriesCount > 0 ? (
              <Badge tone="violet">
                Память: {memoriesCount} {pluralRu(memoriesCount, "факт", "факта", "фактов")}
              </Badge>
            ) : null}
            {hydrated && memoriesCount > 0 ? (
              <button
                type="button"
                onClick={() => resetAll()}
                title="Начать заново"
                aria-label="Начать заново"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-mist-500 transition-colors hover:bg-white/[0.06] hover:text-mist-200"
              >
                <IconRefresh className="h-4 w-4" />
              </button>
            ) : null}
          </div>
        </div>
        <div className="px-4 pb-3 sm:px-6 lg:hidden">
          <StepperMobile currentIndex={currentIndex} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 sm:py-10">{children}</main>
      <footer className="mt-8 border-t border-line-soft">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-[11.5px] leading-relaxed text-mist-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="max-w-xl">
            Данные о программах — демонстрационные, проверяй условия и дедлайны на официальных сайтах вузов. Оценка
            соответствия — не гарантия поступления.
          </p>
          <p className="shrink-0">
            <a
              href="https://github.com/emil2ka/axiom"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-mist-300"
            >
              GitHub
            </a>
            <span className="mx-2">·</span>
            LOCUS Startup Hackathon 2026 · Кейс 02
          </p>
        </div>
      </footer>
    </div>
  );
}
