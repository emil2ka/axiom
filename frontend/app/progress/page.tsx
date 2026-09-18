"use client";

import { useMemo } from "react";
import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";
import { DemoButton } from "@/components/shell/demo-button";
import { buttonStyles } from "@/components/ui/button";
import { Card, SectionHeading } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreRing } from "@/components/ui/score-ring";
import {
  IconArrowRight,
  IconBrain,
  IconCalendar,
  IconCheck,
  IconCircleCheck,
  IconRoute,
  IconScale,
  IconStar,
  IconTarget,
  IconTrophy,
} from "@/components/icons";
import { useAuthUi } from "@/lib/auth-ui";
import { useHydrated } from "@/lib/hooks";
import { deadlineRelative, formatMoment } from "@/lib/labels";
import { buildOverview } from "@/lib/overview";
import { useAxiomStore } from "@/lib/store";
import { useUser } from "@/lib/supabase/use-user";
import { SYNC_STATUS_TEXT, useSyncStatus } from "@/lib/use-sync-status";
import { FIELD_LABELS, factTimeline } from "@/lib/shared/engine";
import { cn } from "@/lib/utils";

export default function ProgressPage() {
  const hydrated = useHydrated();
  const { user, configured } = useUser();
  const status = useSyncStatus();
  const openDialog = useAuthUi((state) => state.openDialog);

  const memories = useAxiomStore((state) => state.memories);
  const roadmapDone = useAxiomStore((state) => state.roadmapDone);
  const targetId = useAxiomStore((state) => state.targetProgramId);
  const compareIds = useAxiomStore((state) => state.compareIds);
  const favorites = useAxiomStore((state) => state.favorites);
  const whatIf = useAxiomStore((state) => state.whatIf);

  const overview = useMemo(
    () => buildOverview(memories, targetId, roadmapDone, whatIf),
    [memories, targetId, roadmapDone, whatIf],
  );
  const { diagnosis, doneSteps, totalSteps, deadlines, revisions, action } = overview;

  const events = useMemo(
    () =>
      memories
        .flatMap((fact) =>
          factTimeline(fact).map((entry, index) => ({
            id: `${fact.id}-${index}`,
            label: FIELD_LABELS[fact.field] ?? fact.label,
            display: entry.display,
            at: entry.at,
            current: entry.current,
          })),
        )
        .sort((a, b) => b.at - a.at)
        .slice(0, 8),
    [memories],
  );

  const achievements = useMemo(
    () => [
      {
        id: "first-fact",
        title: "Первая память",
        hint: "AXIOM запомнил первый факт",
        done: memories.length >= 1,
        icon: <IconBrain className="h-4.5 w-4.5" />,
      },
      {
        id: "five-facts",
        title: "Пять фактов",
        hint: "Профиль обретает форму",
        done: memories.length >= 5,
        icon: <IconStar className="h-4.5 w-4.5" />,
      },
      {
        id: "full-profile",
        title: "Профиль собран",
        hint: "Все ключевые факты на месте",
        done: diagnosis.completeness >= 100,
        icon: <IconCircleCheck className="h-4.5 w-4.5" />,
      },
      {
        id: "target",
        title: "Цель выбрана",
        hint: "Программа закреплена как цель",
        done: targetId !== null,
        icon: <IconTarget className="h-4.5 w-4.5" />,
      },
      {
        id: "compare",
        title: "Три вуза рядом",
        hint: "Сравнение заполнено полностью",
        done: compareIds.length >= 3,
        icon: <IconScale className="h-4.5 w-4.5" />,
      },
      {
        id: "first-step",
        title: "Первый шаг сделан",
        hint: "Маршрут сдвинулся с места",
        done: doneSteps >= 1,
        icon: <IconCheck className="h-4.5 w-4.5" />,
      },
      {
        id: "half-route",
        title: "Половина маршрута",
        hint: "Больше половины шагов закрыто",
        done: totalSteps > 0 && doneSteps >= Math.ceil(totalSteps / 2),
        icon: <IconRoute className="h-4.5 w-4.5" />,
      },
      {
        id: "full-route",
        title: "Маршрут пройден",
        hint: "Все шаги отмечены выполненными",
        done: totalSteps > 0 && doneSteps === totalSteps,
        icon: <IconTrophy className="h-4.5 w-4.5" />,
      },
    ],
    [memories.length, diagnosis.completeness, targetId, compareIds.length, doneSteps, totalSteps],
  );
  const unlocked = achievements.filter((item) => item.done).length;

  const nearest = deadlines[0];

  return (
    <AppShell>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-[-.05em] text-mist-50">Прогресс</h1>
          <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-mist-400">
            Один экран про то, что уже сделано и что делать дальше: профиль, маршрут, дедлайны и история памяти.
          </p>
        </div>
        {configured && user ? (
          <span
            className={cn(
              "rounded-full border px-3 py-1.5 text-[11.5px]",
              status === "error"
                ? "border-rose-400/30 text-rose-300"
                : "border-line text-mist-400",
            )}
          >
            {SYNC_STATUS_TEXT[status] || "локально"}
          </span>
        ) : null}
      </header>

      {!configured || !user ? (
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-violet-400/30 bg-violet-500/[.07] px-5 py-4">
          <p className="max-w-xl text-[13px] leading-relaxed text-mist-200">
            Прогресс пока живёт только в этом браузере. Войди — и профиль, память и шаги переживут смену устройства.
          </p>
          {configured ? (
            <button
              type="button"
              onClick={() => openDialog("Сохранить прогресс")}
              className={buttonStyles("primary", "sm")}
            >
              Войти
            </button>
          ) : null}
        </div>
      ) : null}

      {hydrated && memories.length === 0 ? (
        <EmptyState
          icon={<IconBrain />}
          title="Прогресс появится после первых ответов"
          description="Пройди короткое AI-интервью — или загрузи демо-профиль, чтобы увидеть, как выглядит полный маршрут."
          action={
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Link href="/interview" className={buttonStyles("primary", "lg")}>
                Пройти интервью
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <DemoButton variant="secondary" size="lg" label="Загрузить демо-профиль" />
            </div>
          }
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="flex items-center gap-4">
              <ScoreRing score={diagnosis.completeness} size={64} strokeWidth={4} />
              <div>
                <p className="text-[11px] uppercase tracking-[.16em] text-mist-500">Профиль</p>
                <p className="mt-1 text-[13px] text-mist-200">
                  {diagnosis.knownFacts} из {diagnosis.totalCoreFacts} ключевых фактов
                </p>
              </div>
            </Card>
            <Card className="flex items-center gap-4">
              <ScoreRing
                score={totalSteps ? Math.round((doneSteps / totalSteps) * 100) : 0}
                size={64}
                strokeWidth={4}
              />
              <div>
                <p className="text-[11px] uppercase tracking-[.16em] text-mist-500">Маршрут</p>
                <p className="mt-1 text-[13px] text-mist-200">
                  {doneSteps} из {totalSteps} шагов
                </p>
              </div>
            </Card>
            <Card>
              <p className="text-[11px] uppercase tracking-[.16em] text-mist-500">Память</p>
              <p className="mt-2 font-display text-3xl tracking-[-.04em] text-mist-50">{memories.length}</p>
              <p className="mt-1 text-[12px] text-mist-400">
                {revisions > 0 ? `${revisions} правок и уточнений` : "фактов, пока без правок"}
              </p>
            </Card>
            <Card>
              <p className="flex items-center gap-2 text-[11px] uppercase tracking-[.16em] text-mist-500">
                <IconCalendar className="h-3.5 w-3.5" />
                Ближайший дедлайн
              </p>
              {nearest ? (
                <>
                  <p className="mt-2 font-display text-2xl tracking-[-.03em] text-mist-50">
                    {deadlineRelative(nearest.date).text}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[12px] text-mist-400">
                    {nearest.program.university} · {nearest.label}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-[13px] text-mist-400">Цель ещё не выбрана</p>
              )}
            </Card>
          </section>

          <section className="mt-6">
            <Link
              href={action.href}
              className="group flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-violet-400/30 bg-violet-500/[.07] p-6 transition-colors hover:bg-violet-500/[.11] sm:p-7"
            >
              <div>
                <p className="text-[11px] uppercase tracking-[.16em] text-violet-300">Продолжить</p>
                <h2 className="mt-2 font-display text-3xl tracking-[-.04em] text-mist-50">{action.title}</h2>
                <p className="mt-1.5 text-[13px] text-mist-300">{action.text}</p>
              </div>
              <IconArrowRight className="h-5 w-5 text-violet-300 transition-transform group-hover:translate-x-1" />
            </Link>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionHeading eyebrow="Память" title="Как менялся профиль" />
              {events.length ? (
                <ol className="mt-5 space-y-4">
                  {events.map((event) => (
                    <li key={event.id} className="flex gap-4">
                      <span
                        className={cn(
                          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                          event.current ? "bg-violet-400" : "bg-mist-600",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="text-[13px] text-mist-200">
                          <span className="text-mist-500">{event.label}:</span> {event.display}
                          {event.current ? (
                            <span className="ml-2 rounded-full border border-violet-400/30 px-2 py-0.5 text-[10.5px] text-violet-300">
                              сейчас
                            </span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 text-[11px] text-mist-500">{formatMoment(event.at)}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="mt-4 text-[13px] text-mist-400">
                  Факты появятся после первых ответов, а правки памяти будут видны здесь.
                </p>
              )}
            </Card>

            <Card>
              <SectionHeading eyebrow="Дедлайны" title="Что горит" />
              {deadlines.length ? (
                <ul className="mt-5 space-y-4">
                  {deadlines.map(({ program, label, intake, date }) => {
                    const relative = deadlineRelative(date);
                    return (
                      <li key={`${program.id}-${date}-${label}`} className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <p className="truncate text-[13px] text-mist-200">{program.university}</p>
                          <p className="mt-0.5 text-[11.5px] text-mist-500">
                            {label} · {intake}
                          </p>
                        </div>
                        <span
                          className={cn(
                            "shrink-0 rounded-full border px-2.5 py-1 text-[11px]",
                            relative.passed
                              ? "border-rose-400/40 text-rose-300"
                              : relative.soon
                                ? "border-amber-400/40 text-amber-200"
                                : "border-line text-mist-400",
                          )}
                        >
                          {relative.text}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-4 text-[13px] text-mist-400">
                  Дедлайны появятся, когда будет выбрана цель или собраны рекомендации.
                </p>
              )}
            </Card>
          </section>

          <section className="mt-8">
            <Card>
              <SectionHeading
                eyebrow="Достижения"
                title="Путь отмечен"
                description={`Открыто ${unlocked} из ${achievements.length}. Достижения считаются по реальному состоянию профиля — без ручных галочек.`}
              />
              <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {achievements.map((item) => (
                  <li
                    key={item.id}
                    className={cn(
                      "flex items-start gap-3 rounded-2xl border px-4 py-3.5",
                      item.done
                        ? "border-violet-400/35 bg-violet-500/[.08]"
                        : "border-line-soft bg-white/[.02] opacity-45",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border",
                        item.done
                          ? "border-violet-400/40 text-violet-200"
                          : "border-line text-mist-500",
                      )}
                    >
                      {item.icon}
                    </span>
                    <div>
                      <p className={cn("text-[13px]", item.done ? "text-mist-50" : "text-mist-400")}>
                        {item.title}
                      </p>
                      <p className="mt-0.5 text-[11.5px] leading-relaxed text-mist-500">{item.hint}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          </section>
        </>
      )}
    </AppShell>
  );
}
