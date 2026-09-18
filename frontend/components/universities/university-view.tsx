"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { UniversityBackdrop } from "@/components/universities/university-backdrop";
import { Logo } from "@/components/logo";
import { FitLabel, dedupeReasons } from "@/components/ui/fit";
import { ScoreRing } from "@/components/ui/score-ring";
import { IconArrowRight, IconChevronLeft, IconExternal, IconScale, IconStar } from "@/components/icons";
import { useHydrated } from "@/lib/hooks";
import { budgetFitText, deadlineRelative, durationShort, ieltsStatusText, scholarshipLabel } from "@/lib/labels";
import { formatDateRu, formatUsd, getIelts, recommend } from "@/lib/shared/engine";
import { useAxiomStore } from "@/lib/store";
import { groupUniversities, primaryProgram, programTotal, universityHref, yearlyTotal } from "@/lib/university";
import type { UniversityGroup } from "@/lib/university";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

function cleanProgramName(name: string): string {
  return name.replace(/\s*\(на английском\)/i, "");
}

function SpecRow({ label, value, hint, warn }: { label: string; value: string; hint?: string; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-3.5">
      <dt className="shrink-0 text-[10px] uppercase tracking-[.16em] text-mist-500">{label}</dt>
      <dd className="min-w-0 text-right">
        <span className={cn("block text-[13px] leading-snug", warn ? "text-amber-200" : "text-mist-100")}>{value}</span>
        {hint ? <span className="mt-0.5 block text-[11px] leading-snug text-mist-500">{hint}</span> : null}
      </dd>
    </div>
  );
}

export function UniversityView({
  group,
  initialProgramId,
}: {
  group: UniversityGroup;
  initialProgramId?: string | null;
}) {
  const router = useRouter();
  const reduce = useReducedMotion() ?? false;
  const hydrated = useHydrated();
  const memories = useAxiomStore((state) => state.memories);
  const favorites = useAxiomStore((state) => state.favorites);
  const compareIds = useAxiomStore((state) => state.compareIds);
  const toggleFavorite = useAxiomStore((state) => state.toggleFavorite);
  const toggleCompare = useAxiomStore((state) => state.toggleCompare);
  const setTarget = useAxiomStore((state) => state.setTargetProgram);

  const [programId, setProgramId] = useState(() => primaryProgram(group, initialProgramId).id);
  const program = group.programs.find((item) => item.id === programId) ?? group.programs[0];
  const deadline = program.deadlines[0] ?? null;
  const deadlineInfo = deadline ? deadlineRelative(deadline.date) : null;

  const fit = useMemo(() => {
    if (!hydrated || !memories.length) return null;
    return recommend(memories).recommendations.find((item) => item.program.id === program.id) ?? null;
  }, [hydrated, memories, program.id]);

  const myIelts = useMemo(() => (hydrated ? getIelts(memories) : null), [hydrated, memories]);
  const favorite = hydrated && favorites.includes(program.id);
  const inCompare = hydrated && compareIds.includes(program.id);
  const compareFull = hydrated && !inCompare && compareIds.length >= 3;

  const others = useMemo(() => {
    const all = groupUniversities().filter((item) => item.slug !== group.slug);
    return [
      ...all.filter((item) => item.country === group.country),
      ...all.filter((item) => item.country !== group.country),
    ].slice(0, 3);
  }, [group.slug, group.country]);

  const selectProgram = (id: string) => {
    setProgramId(id);
    window.history.replaceState(null, "", `/universities/${group.slug}?program=${encodeURIComponent(id)}`);
  };

  const choose = () => {
    setTarget(program.id);
    router.push("/roadmap");
  };

  const reason = fit ? dedupeReasons(fit.reasons)[0]?.text : null;
  const gap = fit?.gaps[0]?.text ?? null;

  return (
    <div className="relative isolate flex min-h-dvh flex-col">
      <UniversityBackdrop programId={program.id} />

      <div className="mx-auto flex w-full max-w-[1480px] flex-1 flex-col px-5 pb-6 pt-5 sm:px-8 sm:pt-7 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 sm:gap-5">
            <Link href="/" aria-label="AXIOM — на главную" className="shrink-0">
              <Logo compact />
            </Link>
            <Link
              href="/universities"
              className="inline-flex items-center gap-1.5 rounded-full border border-white/12 bg-ink-950/45 px-3 py-1.5 text-[11.5px] text-mist-200 backdrop-blur transition-colors hover:border-white/25 hover:text-white"
            >
              <IconChevronLeft className="h-3.5 w-3.5" />
              Все вузы
            </Link>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => toggleFavorite(program.id)}
              aria-pressed={favorite}
              aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"}
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border border-white/12 bg-ink-950/45 text-white/70 backdrop-blur transition-colors hover:text-white",
                favorite && "text-amber-300",
              )}
            >
              <IconStar className="h-4 w-4" filled={favorite} />
            </button>
            <button
              type="button"
              onClick={() => toggleCompare(program.id)}
              aria-pressed={inCompare}
              disabled={compareFull}
              className={cn(
                "flex h-9 items-center gap-1.5 rounded-full border px-3 text-[11.5px] backdrop-blur transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                inCompare
                  ? "border-violet-400/50 bg-violet-500/15 text-violet-100"
                  : "border-white/12 bg-ink-950/45 text-white/70 hover:text-white",
              )}
            >
              <IconScale className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">
                {inCompare ? "В сравнении" : compareFull ? `${compareIds.length}/3` : "Сравнить"}
              </span>
            </button>
          </div>
        </header>

        <main className="grid flex-1 content-center gap-10 py-10 lg:grid-cols-[minmax(0,1.06fr)_minmax(0,0.94fr)] lg:gap-16 lg:py-8">
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE }}
          >
            <p className="text-[10.5px] uppercase tracking-[.24em] text-mist-300">
              {group.city}, {group.country} · {program.language}
            </p>
            <h1 className="mt-5 max-w-[18ch] font-display text-[40px] font-medium leading-[.97] tracking-[-.055em] text-white sm:text-[54px] xl:text-[62px]">
              {group.name}
            </h1>
            <p className="mt-4 text-[13.5px] text-mist-300">
              {cleanProgramName(program.programName)} · {program.degree} · {durationShort(program.durationYears)}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-4">
              {fit ? (
                <>
                  <ScoreRing score={fit.score} size={64} delay={0.3} />
                  <div className="min-w-0">
                    <FitLabel score={fit.score} />
                    <p className="mt-2 max-w-[44ch] text-[12.5px] leading-[1.6] text-mist-300">{reason}</p>
                  </div>
                  {gap ? <p className="w-full max-w-[52ch] text-[11.5px] leading-snug text-amber-200/90">{gap}</p> : null}
                </>
              ) : (
                <Link
                  href="/interview"
                  className="inline-flex items-center gap-1.5 rounded-full bg-mist-50 px-5 py-2.5 text-[12px] font-medium text-ink-950 transition-colors hover:bg-white"
                >
                  Узнать своё соответствие
                  <IconArrowRight className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>

            <p className="mt-7 max-w-[54ch] text-[13.5px] leading-[1.75] text-mist-300">{program.summary}</p>

            <div className="mt-5 flex flex-wrap gap-2">
              {program.highlights.map((highlight) => (
                <span key={highlight} className="rounded-full border border-white/[.14] bg-ink-950/35 px-3 py-1.5 text-[11px] text-mist-200 backdrop-blur">
                  {highlight}
                </span>
              ))}
            </div>

            {group.programs.length > 1 ? (
              <div className="mt-7 flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[9.5px] uppercase tracking-[.18em] text-mist-500">Программы</span>
                {group.programs.map((item) => {
                  const active = item.id === program.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectProgram(item.id)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-3.5 py-2 text-[11.5px] backdrop-blur transition-colors",
                        active
                          ? "border-violet-400/50 bg-violet-500/15 text-mist-50"
                          : "border-white/12 bg-ink-950/35 text-mist-300 hover:border-white/25 hover:text-white",
                      )}
                    >
                      {cleanProgramName(item.programName)}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </motion.div>

          <motion.aside
            initial={reduce ? false : { opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: EASE, delay: 0.12 }}
            className="w-full max-w-[460px] lg:justify-self-end"
          >
            <div className="flex items-end justify-between gap-8">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[.2em] text-mist-500">Итого в год</p>
                <p className="mt-3 font-display text-[44px] leading-none tracking-[-.05em] text-mist-50 tnum sm:text-[48px]">
                  {formatUsd(yearlyTotal(program))}
                </p>
                <p className="mt-2 text-[11.5px] leading-relaxed text-mist-400">
                  {formatUsd(program.tuitionPerYearUsd)} обучение + {formatUsd(program.livingPerYearUsd)} проживание
                </p>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[10px] uppercase tracking-[.2em] text-mist-500">Вся программа</p>
                <p className="mt-3 text-[17px] text-mist-100 tnum">{formatUsd(programTotal(program))}</p>
                <p className="mt-1 text-[11px] text-mist-500">{durationShort(program.durationYears)}</p>
              </div>
            </div>

            <dl className="mt-8 divide-y divide-white/[.09] border-y border-white/[.09]">
              <SpecRow
                label="Дедлайн"
                value={deadline ? formatDateRu(deadline.date) : "уточняется"}
                hint={deadlineInfo?.text}
                warn={deadlineInfo?.soon}
              />
              <SpecRow
                label="IELTS"
                value={program.ieltsMin ? `от ${program.ieltsMin.toFixed(1)}` : "не требуется"}
                hint={fit ? ieltsStatusText(fit, myIelts) : undefined}
              />
              <SpecRow
                label="Стипендия"
                value={scholarshipLabel(program.scholarship)}
                hint={
                  program.scholarshipLivingSupportUsd > 0
                    ? `+${formatUsd(program.scholarshipLivingSupportUsd)} на проживание`
                    : undefined
                }
              />
              <SpecRow label="Бюджет" value={fit ? budgetFitText(fit) : "Профиль не заполнен"} />
            </dl>

            <div className="mt-7 flex flex-wrap items-center gap-6">
              <button
                type="button"
                onClick={choose}
                className="inline-flex items-center gap-2 rounded-full bg-mist-50 px-5 py-3 text-[12.5px] font-medium text-ink-950 transition-colors hover:bg-white"
              >
                Выбрать целью
                <IconArrowRight className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => toggleCompare(program.id)}
                aria-pressed={inCompare}
                disabled={compareFull}
                className={cn(
                  "text-[12px] transition-colors disabled:cursor-not-allowed disabled:opacity-40",
                  inCompare ? "text-violet-200" : "text-mist-400 hover:text-white",
                )}
              >
                {inCompare ? "В сравнении" : "Сравнить"}
              </button>
            </div>

            <p className="mt-6 text-[11.5px] leading-relaxed text-mist-500">{program.scholarshipNote}</p>

            {program.sources.length ? (
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
                {program.sources.map((source) => (
                  <a
                    key={source.url}
                    href={source.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-[11px] text-violet-300 transition-colors hover:text-violet-100"
                  >
                    {source.label}
                    <IconExternal className="h-3 w-3" />
                  </a>
                ))}
              </div>
            ) : null}
          </motion.aside>
        </main>

        <footer className="flex flex-wrap items-center justify-between gap-x-8 gap-y-2 border-t border-white/[.08] pt-4 text-[11px] text-mist-500">
          <p className="max-w-xl">
            Данные о программах — демонстрационные: проверяй условия и дедлайны на официальном сайте вуза.
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            {others.map((item) => (
              <Link
                key={item.slug}
                href={universityHref(primaryProgram(item))}
                className="transition-colors hover:text-mist-200"
              >
                {item.name}
              </Link>
            ))}
            <Link href="/universities" className="text-violet-300 transition-colors hover:text-violet-100">
              Все вузы →
            </Link>
          </div>
        </footer>
      </div>
    </div>
  );
}
