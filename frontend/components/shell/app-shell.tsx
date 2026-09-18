"use client";

import { Fragment } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/logo";
import { IconRefresh } from "@/components/icons";
import { FLOW_STEPS, findStepIndex } from "@/lib/flow";
import { DemoSeed } from "@/components/shell/demo-seed";
import { UserMenu } from "@/components/shell/user-menu";
import { useHydrated } from "@/lib/hooks";
import { useAxiomStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const BALL = "radial-gradient(120% 120% at 32% 26%, #d7ebff 0%, #7cb6f2 45%, #3a76c8 100%)";

/** Шаги — полосой во всю ширину сайта, всегда на виду: шарик на текущем. */
function StepNav({ currentIndex }: { currentIndex: number }) {
  return (
    <nav
      aria-label="Этапы маршрута"
      className="no-scrollbar flex w-full items-center overflow-x-auto border-t border-line-soft/70 px-4 py-3 sm:overflow-visible sm:px-6"
    >
      {FLOW_STEPS.map((step, index) => {
        const done = currentIndex >= 0 && index < currentIndex;
        const current = index === currentIndex;
        return (
          <Fragment key={step.id}>
            {index > 0 ? <span aria-hidden="true" className="mx-2 h-px w-4 shrink-0 bg-white/[0.08] sm:mx-4 sm:w-auto sm:flex-1" /> : null}
            <Link
              href={step.href}
              aria-current={current ? "step" : undefined}
              className={cn(
                "flex shrink-0 items-center gap-1.5 whitespace-nowrap text-[12px] transition-colors sm:text-[12.5px]",
                current ? "text-mist-50" : done ? "text-mist-400 hover:text-mist-100" : "text-mist-500 hover:text-mist-200",
              )}
            >
              {current ? (
                <span className="block h-2 w-2 rounded-full" style={{ background: BALL, boxShadow: "0 0 12px rgba(124,182,242,0.45)" }} />
              ) : (
                <span className={cn("tnum text-[11px]", done ? "text-mist-500" : "text-mist-600")}>{index + 1}</span>
              )}
              {step.short}
            </Link>
          </Fragment>
        );
      })}
    </nav>
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
      <DemoSeed />
      <header className="sticky top-0 z-40 border-b border-line-soft bg-ink-950/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link href="/" aria-label="AXIOM — на главную" className="shrink-0">
            <Logo />
          </Link>
          <div className="flex shrink-0 items-center gap-5">
            {hydrated && memoriesCount > 0 ? (
              <Link href="/diagnosis" className="text-[12px] text-mist-400 transition-colors hover:text-mist-100">
                {demoMode ? "Демо" : "Память"} <span className="tnum text-mist-200">{memoriesCount}</span>
              </Link>
            ) : null}
            {hydrated && memoriesCount > 0 ? (
              <button
                type="button"
                onClick={() => resetAll()}
                title="Начать заново"
                aria-label="Начать заново"
                className="text-mist-500 transition-colors hover:text-mist-200"
              >
                <IconRefresh className="h-4 w-4" />
              </button>
            ) : null}
            <UserMenu />
          </div>
        </div>
        <StepNav currentIndex={currentIndex} />
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-8 pt-6 sm:px-6 sm:pb-10 sm:pt-8">{children}</main>
      <footer>
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-[11.5px] leading-relaxed text-mist-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="max-w-xl">
            Данные о программах — демонстрационные, проверяй условия и дедлайны на официальных сайтах вузов. Оценка
            соответствия — совпадение с фактами профиля, а не гарантия поступления. Изображения кампусов используются как
            визуальные ориентиры.
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
