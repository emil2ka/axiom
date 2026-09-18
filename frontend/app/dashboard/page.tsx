"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { buttonStyles } from "@/components/ui/button";
import { Card, SectionHeading } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ScoreRing } from "@/components/ui/score-ring";
import {
  IconArrowRight,
  IconBrain,
  IconCompass,
  IconGraduation,
  IconMessage,
  IconRoute,
  IconScale,
  IconShield,
  IconTarget,
  IconTrendingUp,
  IconWand,
} from "@/components/icons";
import { useHydrated } from "@/lib/hooks";
import { deadlineRelative } from "@/lib/labels";
import { buildOverview } from "@/lib/overview";
import { useAxiomStore } from "@/lib/store";
import { useUser } from "@/lib/supabase/use-user";
import { SYNC_STATUS_TEXT, useSyncStatus } from "@/lib/use-sync-status";
import { cn } from "@/lib/utils";

export default function DashboardPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { user, loading, configured } = useUser();
  const status = useSyncStatus();

  const memories = useAxiomStore((state) => state.memories);
  const roadmapDone = useAxiomStore((state) => state.roadmapDone);
  const targetId = useAxiomStore((state) => state.targetProgramId);
  const compareIds = useAxiomStore((state) => state.compareIds);
  const whatIf = useAxiomStore((state) => state.whatIf);

  useEffect(() => {
    if (!configured || loading || user) return;
    router.replace("/login?next=/dashboard");
  }, [configured, loading, user, router]);

  const overview = useMemo(
    () => buildOverview(memories, targetId, roadmapDone, whatIf),
    [memories, targetId, roadmapDone, whatIf],
  );
  const { diagnosis, target, doneSteps, totalSteps, deadlines, action } = overview;

  const nameFact = memories.find((fact) => fact.field === "name");
  const greeting = nameFact?.display ?? (user?.email ? user.email.split("@")[0] : "абитуриент");
  const today = new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", weekday: "long" }).format(
    new Date(),
  );

  const quickLinks = [
    { href: "/interview", title: "Интервью", hint: "дополнить профиль", icon: <IconMessage className="h-4 w-4" /> },
    { href: "/recommendations", title: "Рекомендации", hint: "подобрать вуз", icon: <IconCompass className="h-4 w-4" /> },
    { href: "/compare", title: "Сравнение", hint: `${compareIds.length} в списке`, icon: <IconScale className="h-4 w-4" /> },
    { href: "/whatif", title: "А если иначе?", hint: "пересобрать рейтинг", icon: <IconWand className="h-4 w-4" /> },
    { href: "/roadmap", title: "Маршрут", hint: `${doneSteps} из ${totalSteps} шагов`, icon: <IconRoute className="h-4 w-4" /> },
    { href: "/universities", title: "Вузы", hint: "каталог и кампусы", icon: <IconGraduation className="h-4 w-4" /> },
    { href: "/progress", title: "Прогресс", hint: "детали и достижения", icon: <IconTrendingUp className="h-4 w-4" /> },
    { href: "/profile", title: "Профиль", hint: "данные и лимиты", icon: <IconShield className="h-4 w-4" /> },
  ];

  if (!configured) {
    return (
      <AppShell>
        <EmptyState
          icon={<IconBrain />}
          title="Дашборд доступен с аккаунтом"
          description="Supabase не настроен в этой сборке. Пока можно пройти интервью — оно работает локально."
          action={
            <Link href="/interview" className={buttonStyles("primary", "lg")}>
              Пройти интервью
              <IconArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </AppShell>
    );
  }

  if (loading || !hydrated || !user) {
    return (
      <AppShell>
        <div className="space-y-4">
          <div className="h-10 w-72 animate-shimmer rounded-2xl" />
          <div className="h-36 w-full animate-shimmer rounded-[24px]" />
          <div className="h-64 w-full animate-shimmer rounded-[24px]" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <header className="mb-7 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-4xl tracking-[-.05em] text-mist-50">Привет, {greeting}</h1>
          <p className="mt-2 text-[13px] capitalize text-mist-500">{today}</p>
        </div>
        <span
          className={cn(
            "rounded-full border px-3 py-1.5 text-[11.5px]",
            status === "error" ? "border-rose-400/30 text-rose-300" : "border-line text-mist-400",
          )}
        >
          {SYNC_STATUS_TEXT[status] || "локально"}
        </span>
      </header>

      {memories.length === 0 ? (
        <EmptyState
          icon={<IconTarget />}
          title="Начни с профиля"
          description="Два шага: короткая форма о себе и AI-интервью. AXIOM соберёт память и покажет персональный маршрут."
          action={
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Link href="/onboarding" className={buttonStyles("primary", "lg")}>
                Заполнить профиль
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/interview" className={buttonStyles("secondary", "lg")}>
                Сразу интервью
              </Link>
            </div>
          }
        />
      ) : (
        <>
          <Link
            href={action.href}
            className="group flex flex-wrap items-center justify-between gap-4 rounded-[24px] border border-violet-400/30 bg-violet-500/[.07] p-6 transition-colors hover:bg-violet-500/[.11] sm:p-7"
          >
            <div>
              <p className="text-[11px] uppercase tracking-[.16em] text-violet-300">Следующее действие</p>
              <h2 className="mt-2 font-display text-3xl tracking-[-.04em] text-mist-50">{action.title}</h2>
              <p className="mt-1.5 text-[13px] text-mist-300">{action.text}</p>
            </div>
            <IconArrowRight className="h-5 w-5 text-violet-300 transition-transform group-hover:translate-x-1" />
          </Link>

          <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="flex items-center gap-4">
              <ScoreRing score={diagnosis.completeness} size={64} strokeWidth={4} />
              <div>
                <p className="text-[11px] uppercase tracking-[.16em] text-mist-500">Профиль</p>
                <p className="mt-1 text-[13px] text-mist-200">
                  {diagnosis.knownFacts} из {diagnosis.totalCoreFacts} фактов
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
              <p className="text-[11px] uppercase tracking-[.16em] text-mist-500">Цель</p>
              <p className="mt-2 line-clamp-2 font-display text-[17px] leading-snug tracking-[-.02em] text-mist-50">
                {target ? target.university : "пока не выбрана"}
              </p>
              <p className="mt-1 text-[12px] text-mist-400">
                {target ? `${target.city}, ${target.country}` : "закрепи программу в рекомендациях"}
              </p>
            </Card>
            <Card>
              <p className="text-[11px] uppercase tracking-[.16em] text-mist-500">Ближайший дедлайн</p>
              {deadlines[0] ? (
                <>
                  <p className="mt-2 font-display text-2xl tracking-[-.03em] text-mist-50">
                    {deadlineRelative(deadlines[0].date).text}
                  </p>
                  <p className="mt-1 line-clamp-2 text-[12px] text-mist-400">
                    {deadlines[0].program.university} · {deadlines[0].label}
                  </p>
                </>
              ) : (
                <p className="mt-2 text-[13px] text-mist-400">нет активных сроков</p>
              )}
            </Card>
          </section>

          <section className="mt-8">
            <SectionHeading eyebrow="Быстрый доступ" title="Куда дальше" />
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="flex h-full items-start gap-3 rounded-2xl border border-line-soft bg-white/[.02] px-4 py-3.5 transition-colors hover:border-violet-400/35 hover:bg-white/[.04]"
                  >
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-mist-300">
                      {link.icon}
                    </span>
                    <span>
                      <span className="block text-[13px] text-mist-100">{link.title}</span>
                      <span className="mt-0.5 block text-[11.5px] text-mist-500">{link.hint}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="mt-8 grid gap-6 lg:grid-cols-2">
            <Card>
              <SectionHeading
                eyebrow="Память"
                title="Что AXIOM уже знает"
                right={
                  <Link href="/diagnosis" className="text-[12px] text-violet-300 transition-colors hover:text-violet-100">
                    Вся память →
                  </Link>
                }
              />
              <ul className="mt-5 flex flex-wrap gap-2">
                {memories.slice(0, 8).map((fact) => (
                  <li
                    key={fact.id}
                    className="rounded-full border border-line bg-white/[.03] px-3.5 py-2 text-[12px]"
                  >
                    <span className="text-mist-500">{fact.label}: </span>
                    <span className="text-[#b3dafb]">{fact.display}</span>
                  </li>
                ))}
              </ul>
              {overview.revisions > 0 ? (
                <p className="mt-4 text-[11.5px] text-mist-500">
                  {overview.revisions} правок памяти — история видна в прогрессе.
                </p>
              ) : null}
            </Card>

            <Card>
              <SectionHeading
                eyebrow="Сроки"
                title="Дедлайны рядом"
                right={
                  <Link href="/roadmap" className="text-[12px] text-violet-300 transition-colors hover:text-violet-100">
                    К маршруту →
                  </Link>
                }
              />
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
                  Дедлайны появятся, когда в памяти будет цель или интересы.
                </p>
              )}
            </Card>
          </section>
        </>
      )}
    </AppShell>
  );
}
