"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PROGRAMS, WHATIF_PRESETS, applyWhatIf, formatUsd, recommend } from "@/lib/shared/engine";
import type { Program, Recommendation } from "@/lib/shared/engine";
import { buildDemoMemories } from "@/lib/demo";
import { BUILDINGS, TINTS } from "@/lib/campus-art";
import { cn } from "@/lib/utils";
import { IconArrowRight, IconCheck, IconCompass, IconStar, IconWand } from "@/components/icons";

const DEMO_MEMORIES = buildDemoMemories();
const BASE = recommend(DEMO_MEMORIES);
const SCORE_BY_ID = new Map(BASE.recommendations.map((item) => [item.program.id, item.score]));
const WHATIF = applyWhatIf(DEMO_MEMORIES, WHATIF_PRESETS[1].params);
const PROGRAM_BY_ID = new Map(PROGRAMS.map((program) => [program.id, program]));

const STEPS = [
  {
    key: "interview",
    label: "Интервью",
    title: "Разговор голосом или текстом",
    text: "AI задаёт вопросы как живой собеседник — отвечай голосом или печатай.",
  },
  {
    key: "memory",
    label: "Память",
    title: "Сказал — запомнил — перестроил",
    text: "Важные слова становятся фактами профиля. Любой факт можно изменить — выдача обновится.",
  },
  {
    key: "programs",
    label: "Вузы",
    title: "Персональная подборка",
    text: "14 программ с оценкой соответствия и объяснением, почему это подходит именно тебе.",
  },
  {
    key: "compare",
    label: "Сравнение",
    title: "Сравнение без таблиц в Excel",
    text: "Цена, стипендия, IELTS, дедлайны — лучшее подсвечивается автоматически.",
  },
  {
    key: "whatif",
    label: "What If",
    title: "А что если поменять приоритеты?",
    text: "Сделай стипендию важнее страны — рейтинг перестроится на глазах.",
  },
  {
    key: "roadmap",
    label: "Маршрут",
    title: "План до зачисления",
    text: "Экзамены, документы, дедлайны и один конкретный следующий шаг.",
  },
];

const AUTOPLAY = 7600;

function useWordFlow(text: string, startDelay = 0, speed = 65) {
  const words = useMemo(() => text.split(" "), [text]);
  const reduce = useReducedMotion();
  const [count, setCount] = useState(reduce ? words.length : 0);

  useEffect(() => {
    if (reduce) {
      setCount(words.length);
      return;
    }
    setCount(0);
    let interval = 0;
    const timer = window.setTimeout(() => {
      interval = window.setInterval(() => {
        setCount((current) => {
          if (current >= words.length) {
            window.clearInterval(interval);
            return current;
          }
          return current + 1;
        });
      }, speed);
    }, startDelay);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [reduce, speed, startDelay, words.length]);

  return words.slice(0, count).join(" ");
}

function useLoop(period: number, active = true) {
  const reduce = useReducedMotion();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active || reduce) return;
    const timer = window.setInterval(() => setTick((value) => value + 1), period);
    return () => window.clearInterval(timer);
  }, [active, period, reduce]);
  return tick;
}

function AxiomMark({ className }: { className?: string }) {
  return (
    <span className={cn("flex h-6 w-6 items-center justify-center rounded-md bg-gradient-to-br from-violet-400 to-violet-600 text-[12px] font-semibold text-ink-950", className)}>
      A
    </span>
  );
}

export function InterviewScene() {
  const reduce = useReducedMotion();
  const question = useWordFlow("Куда хочешь поступить и что для тебя важно?", 200, 45);
  const tick = useLoop(2600);
  const answered = reduce || tick > 0;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5">
      <p className="max-w-md text-center font-display text-[19px] leading-[1.5] text-mist-100 sm:text-[22px]">
        {question}
        {question.length < 43 && !reduce ? (
          <span aria-hidden="true" className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[3px] bg-violet-400" style={{ animation: "caret-blink 1s steps(1) infinite" }} />
        ) : null}
      </p>

      <span className="flex items-end gap-4">
        {[1, 0.78, 0.92].map((factor, index) => (
          <motion.span
            key={index}
            className="block h-[26px] w-[26px] rounded-full"
            style={{
              background: "radial-gradient(120% 120% at 32% 26%, #d7ebff 0%, #7cb6f2 45%, #3a76c8 100%)",
              boxShadow: "inset 0 2px 3px rgba(255,255,255,.5), inset 0 -6px 12px rgba(6,20,40,.32), 0 12px 28px -14px rgba(95,156,236,.6)",
            }}
            animate={reduce ? undefined : { y: [0, -9 * factor, 0], scale: [1, 1.08 * factor, 1] }}
            transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut", delay: index * 0.22 }}
          />
        ))}
      </span>

      <AnimatePresence>
        {answered ? (
          <motion.div
            initial={reduce ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 26 }}
            className="w-full max-w-md rounded-xl border border-violet-500/20 bg-violet-500/[0.08] px-4 py-3"
          >
            <p className="text-[9px] uppercase tracking-[0.18em] text-mist-600">ты</p>
            <p className="mt-1 text-[13px] leading-[1.7] text-mist-200">
              Хочу <span className="hl text-inherit">Европу</span> и бюджет до <span className="hl text-inherit">$15k</span>, интересует <span className="hl text-inherit">IT</span>.
            </p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

const MEMORY_PHRASE: { text: string; mark: boolean }[] = [
  { text: "Хочу ", mark: false },
  { text: "Европу", mark: true },
  { text: " и бюджет до ", mark: false },
  { text: "$15k", mark: true },
  { text: ", интересы — ", mark: false },
  { text: "IT", mark: true },
];

const MEMORY_FACTS = [
  { label: "Страна", value: "Европа" },
  { label: "Бюджет", value: "до $15 000" },
  { label: "Интересы", value: "IT и программирование" },
];

export function MemoryScene() {
  const reduce = useReducedMotion();
  const tick = useLoop(4200);
  const [marks, setMarks] = useState(reduce ? MEMORY_PHRASE.length : 0);
  const [facts, setFacts] = useState(reduce ? MEMORY_FACTS.length : 0);

  useEffect(() => {
    if (reduce) {
      setMarks(MEMORY_PHRASE.length);
      setFacts(MEMORY_FACTS.length);
      return;
    }
    setMarks(0);
    setFacts(0);
    const markTimer = window.setInterval(() => setMarks((value) => Math.min(value + 1, MEMORY_PHRASE.length)), 260);
    const factTimer = window.setInterval(() => setFacts((value) => Math.min(value + 1, MEMORY_FACTS.length + 1)), 520);
    return () => {
      window.clearInterval(markTimer);
      window.clearInterval(factTimer);
    };
  }, [reduce, tick]);

  return (
    <div className="grid h-full items-center gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <p className="font-display text-[19px] leading-[1.6] text-mist-200 sm:text-[22px]">
        {MEMORY_PHRASE.map((segment, index) => {
          const lit = segment.mark && marks > MEMORY_PHRASE.slice(0, index).filter((item) => item.mark).length;
          return segment.mark && lit ? (
            <mark key={index} className="hl text-inherit">
              {segment.text}
            </mark>
          ) : (
            <span key={index}>{segment.text}</span>
          );
        })}
      </p>

      <div className="rounded-xl border border-line-soft bg-white/[0.02] p-4">
        <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
          <span className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-mist-500">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400/60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400/80" />
            </span>
            память
          </span>
          <span className="text-[11px] tabular-nums text-mist-500">{facts}</span>
        </div>
        <ul className="mt-1">
          {MEMORY_FACTS.map((fact, index) => (
            <li key={fact.label} className="flex items-center justify-between gap-3 border-b border-white/[0.04] py-2.5 last:border-b-0">
              <span className="text-[9.5px] uppercase tracking-[0.16em] text-mist-600">{fact.label}</span>
              {facts > index ? (
                <motion.span
                  initial={reduce ? false : { opacity: 0, x: 14, scale: 0.96 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 24 }}
                  className="text-[12px] text-mist-100"
                >
                  {fact.value}
                </motion.span>
              ) : (
                <span className="h-3 w-16 rounded bg-white/[0.04]" />
              )}
            </li>
          ))}
        </ul>
        <AnimatePresence>
          {facts > MEMORY_FACTS.length ? (
            <motion.div
              initial={reduce ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 rounded-lg border border-violet-500/25 bg-violet-500/[0.1] px-3 py-2.5"
            >
              <p className="text-[9px] uppercase tracking-[0.16em] text-violet-300/75">топ-рекомендация</p>
              <p className="mt-1 flex items-center justify-between gap-2 text-[12px] text-mist-100">
                Budapest University of Technology
                <span className="font-display text-[15px] tabular-nums text-violet-300">100</span>
              </p>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </div>
    </div>
  );
}

const CARD_IDS = ["bme-cs", "pw-cs", "swps-psych"];

export function ProgramsScene() {
  const tick = useLoop(3000);
  const index = tick % CARD_IDS.length;
  const program = PROGRAM_BY_ID.get(CARD_IDS[index]);
  if (!program) return null;
  const tint = TINTS[program.id] ?? "#252a2d";
  const score = SCORE_BY_ID.get(program.id) ?? 0;

  return (
    <div className="relative h-full overflow-hidden rounded-xl border border-white/[0.06]">
      <AnimatePresence initial={false}>
        <motion.div
          key={program.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7, ease: "easeInOut" }}
          className="absolute inset-0"
          style={{ backgroundImage: `radial-gradient(ellipse at 80% 70%, ${tint} 0%, #121517 62%)` }}
        >
          <div className="absolute inset-x-[52%] bottom-[6%] top-[28%] sm:left-[54%] sm:right-[2%]">
            <Image
              src={`/campuses/cutouts/${BUILDINGS[program.id] ?? "bme"}.webp`}
              alt=""
              fill
              sizes="(max-width: 640px) 60vw, 40vw"
              className="object-contain object-bottom opacity-95"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-r from-[#101315]/90 via-[#101315]/45 to-transparent" />
        </motion.div>
      </AnimatePresence>

      <div className="relative flex h-full flex-col justify-between p-5 sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <span className="text-[10px] font-medium tracking-[0.18em] text-white/55">ВЫБОР AXIOM</span>
          <IconStar className="h-4 w-4 text-amber-300" filled />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={program.id}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="max-w-[56%]"
          >
            <p className="text-[10.5px] tracking-[0.1em] text-white/55">
              {program.city}, {program.country} · {program.language}
            </p>
            <h3 className="mt-1.5 line-clamp-2 font-display text-[20px] font-medium leading-[1.08] tracking-[-0.04em] text-white sm:text-[25px]">
              {program.university}
            </h3>
            <p className="mt-1.5 line-clamp-2 text-[11px] text-white/60">{program.programName.replace(/\s*\(на английском\)/i, "")}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-[9.5px] tracking-[0.1em] text-white/50">В год · с проживанием</p>
            <p className="mt-0.5 text-[19px] font-medium tracking-[-0.03em] text-white">
              {formatUsd(program.tuitionPerYearUsd + program.livingPerYearUsd)}
            </p>
          </div>
          <div className="text-right">
            <p className="font-display text-[24px] leading-none tabular-nums text-violet-300">{score}</p>
            <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-white/45">соответствие</p>
          </div>
        </div>
      </div>
    </div>
  );
}

const COMPARE_IDS = ["bme-cs", "pw-cs", "swps-psych"];

function ringTone(score: number) {
  if (score >= 78) return "border-teal-400/70 text-teal-300";
  if (score >= 60) return "border-amber-400/60 text-amber-300";
  return "border-mist-500/50 text-mist-300";
}

export function CompareScene() {
  const reduce = useReducedMotion();
  const tick = useLoop(1500);
  const highlight = reduce ? 2 : (tick % 2) + 2;
  const items = COMPARE_IDS.map((id) => PROGRAM_BY_ID.get(id)).filter((item): item is Program => Boolean(item));

  type CompareRow = {
    label: string;
    best?: "min" | "max";
    values?: number[];
    render: (program: Program) => ReactNode;
  };

  const rows: CompareRow[] = [
    {
      label: "Соответствие",
      render: (program: Program) => {
        const score = SCORE_BY_ID.get(program.id) ?? 0;
        return (
          <span className={cn("inline-flex h-9 w-9 items-center justify-center rounded-full border-2 font-display text-[12px] tabular-nums", ringTone(score))}>
            {score}
          </span>
        );
      },
    },
    {
      label: "Итого в год",
      best: "min",
      values: items.map((program) => program.tuitionPerYearUsd + program.livingPerYearUsd),
      render: (program: Program) => formatUsd(program.tuitionPerYearUsd + program.livingPerYearUsd),
    },
    {
      label: "IELTS",
      best: "min",
      values: items.map((program) => program.ieltsMin ?? 0),
      render: (program: Program) => (program.ieltsMin ? `от ${program.ieltsMin.toFixed(1)}` : "не нужен"),
    },
    {
      label: "Стипендия",
      render: (program: Program) =>
        program.scholarship === "full" ? "полная" : program.scholarship === "partial" ? "частичная" : "нет",
    },
    {
      label: "Дедлайн",
      render: (program: Program) => program.deadlines[0]?.label.replace(/^Подача до /i, "до ") ?? "—",
    },
  ];

  return (
    <div className="flex h-full flex-col justify-center">
      <div className="overflow-x-auto">
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[96px_repeat(3,1fr)] items-end gap-x-3 border-b border-white/[0.06] pb-3">
            <span className="text-[9.5px] uppercase tracking-[0.18em] text-mist-600">параметр</span>
            {items.map((program) => (
              <span key={program.id}>
                <span className="block truncate text-[12px] text-mist-100">{program.university}</span>
                <span className="mt-0.5 block text-[10px] text-mist-500">{program.city}</span>
              </span>
            ))}
          </div>

          {rows.map((row, rowIndex) => {
            const bestIndex =
              row.best && row.values
                ? row.best === "min"
                  ? row.values.indexOf(Math.min(...row.values))
                  : row.values.indexOf(Math.max(...row.values))
                : -1;
            return (
              <div
                key={row.label}
                className="grid grid-cols-[96px_repeat(3,1fr)] items-center gap-x-3 border-b border-white/[0.04] py-3 last:border-b-0"
              >
                <span className="text-[10.5px] text-mist-500">{row.label}</span>
                {items.map((program, columnIndex) => {
                  const active = bestIndex === columnIndex && highlight === rowIndex + 1;
                  return (
                    <span key={program.id} className="relative flex items-center">
                      <motion.span
                        aria-hidden="true"
                        className="absolute -inset-x-2 -inset-y-1.5 rounded-md border border-teal-400/40 bg-teal-400/[0.07]"
                        initial={false}
                        animate={{ opacity: active ? 1 : 0 }}
                        transition={{ duration: 0.35 }}
                      />
                      <span className={cn("relative text-[12px] tabular-nums", active ? "text-teal-200" : "text-mist-200")}>
                        {row.render(program)}
                      </span>
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
      <p className="mt-4 text-[10.5px] text-mist-600">
        Зелёным подсвечивается то, где вариант объективно выигрывает по твоему профилю.
      </p>
    </div>
  );
}

export function WhatIfScene() {
  const reduce = useReducedMotion();
  const tick = useLoop(3400);
  const boosted = reduce || tick % 2 === 1;

  const baseTop = BASE.recommendations.slice(0, 5);
  const nextTop = WHATIF.recommendations.slice(0, 5);
  const baseRank = new Map(baseTop.map((item, index) => [item.program.id, index + 1]));
  const list = boosted ? nextTop : baseTop;

  return (
    <div className="grid h-full items-center gap-5 lg:grid-cols-[210px_1fr]">
      <div className="space-y-2">
        <p className="text-[9.5px] uppercase tracking-[0.18em] text-mist-600">быстрые сценарии</p>
        {WHATIF_PRESETS.slice(0, 3).map((preset, index) => {
          const active = index === 0 ? !boosted : index === 1 ? boosted : false;
          return (
            <span
              key={preset.id}
              className={cn(
                "block rounded-full border px-3.5 py-2 text-[11.5px] transition-colors duration-300",
                active
                  ? "border-violet-500/45 bg-violet-500/[0.12] text-mist-100"
                  : "border-white/[0.06] text-mist-500",
              )}
            >
              {preset.label}
            </span>
          );
        })}
        <p className="pt-2 text-[10px] leading-relaxed text-mist-600">
          Ответ AXIOM: рейтинг пересобирается за секунду, без перезагрузки.
        </p>
      </div>

      <div>
        <AnimatePresence initial={false}>
          {list.map((item: Recommendation, index: number) => {
            const before = baseRank.get(item.program.id);
            const delta = boosted && before ? before - (index + 1) : 0;
            return (
              <motion.div
                key={item.program.id}
                layout
                transition={{ type: "spring", stiffness: 320, damping: 32 }}
                className="flex items-center gap-3 border-b border-white/[0.04] py-2.5 last:border-b-0"
              >
                <span className="w-5 shrink-0 font-display text-[11px] tabular-nums text-mist-500">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[12px] text-mist-100">{item.program.university}</span>
                  <span className="block text-[10px] text-mist-500">
                    {item.program.city} · {formatUsd(item.totalPerYearUsd)}
                  </span>
                </span>
                <AnimatePresence>
                  {delta !== 0 ? (
                    <motion.span
                      key={`${item.program.id}-${delta}`}
                      initial={reduce ? false : { opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "shrink-0 rounded-full px-2 py-0.5 text-[10px] tabular-nums",
                        delta > 0 ? "bg-teal-400/15 text-teal-300" : "bg-rose-400/10 text-rose-300",
                      )}
                    >
                      {delta > 0 ? `+${delta}` : delta}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
                <span className="w-8 shrink-0 text-right font-display text-[13px] tabular-nums text-violet-300">
                  {item.score}
                </span>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}

const ROADMAP_ITEMS = [
  { title: "Транскрипт с апостилем", due: "Июль 2026" },
  { title: "CV и скан паспорта", due: "Август 2026" },
  { title: "Мотивационное письмо", due: "Октябрь 2026" },
  { title: "Подача на стипендию", due: "Ноябрь 2026" },
];

export function RoadmapScene() {
  const reduce = useReducedMotion();
  const tick = useLoop(2800);
  const doneCount = reduce ? 3 : 2 + (tick % 2);
  const progress = Math.round((doneCount / 9) * 100);

  return (
    <div className="grid h-full items-center gap-5 lg:grid-cols-[1.05fr_0.95fr]">
      <div className="rounded-xl border border-violet-500/25 bg-violet-500/[0.06] p-4">
        <p className="flex items-center gap-2 text-[9.5px] uppercase tracking-[0.18em] text-violet-300/75">
          <IconArrowRight className="h-3 w-3" />
          твой следующий шаг
        </p>
        <p className="mt-2 font-display text-[16px] text-mist-50">Мотивационное письмо</p>
        <p className="mt-1.5 text-[11.5px] leading-relaxed text-mist-400">
          Свяжи интересы с программой Computer Engineering — используй факты из профиля.
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-mist-50 px-3.5 py-1.5 text-[11.5px] font-medium text-ink-950">
          <IconCheck className="h-3.5 w-3.5" />
          Отметить выполненным
        </span>
      </div>

      <div>
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-mist-500">Прогресс маршрута</span>
          <span className="tabular-nums text-mist-300">{doneCount} из 9</span>
        </div>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
          <motion.div
            className="h-full rounded-full bg-violet-500"
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 24 }}
          />
        </div>
        <div className="mt-4 space-y-3">
          {ROADMAP_ITEMS.map((item, index) => {
            const done = index < doneCount;
            return (
              <div key={item.title} className="flex items-center gap-2.5">
                <motion.span
                  className={cn(
                    "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border",
                    done ? "border-violet-500 bg-violet-500 text-ink-950" : "border-line text-transparent",
                  )}
                  animate={done ? { scale: [0.7, 1.1, 1] } : { scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                >
                  <IconCheck className="h-3 w-3" />
                </motion.span>
                <span className={cn("flex-1 text-[12px]", done ? "text-mist-500 line-through decoration-mist-600" : "text-mist-200")}>
                  {item.title}
                </span>
                <span className="text-[10px] tabular-nums text-mist-600">{item.due}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const SCENES: Record<string, () => ReactNode> = {
  interview: () => <InterviewScene />,
  memory: () => <MemoryScene />,
  programs: () => <ProgramsScene />,
  compare: () => <CompareScene />,
  whatif: () => <WhatIfScene />,
  roadmap: () => <RoadmapScene />,
};

export function FeatureShowcase() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const reduce = useReducedMotion();
  const step = STEPS[active];

  useEffect(() => {
    if (paused || reduce) return;
    const timer = window.setTimeout(() => setActive((value) => (value + 1) % STEPS.length), AUTOPLAY);
    return () => window.clearTimeout(timer);
  }, [active, paused, reduce]);

  return (
    <div onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {STEPS.map((item, index) => {
          const selected = index === active;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => setActive(index)}
              aria-pressed={selected}
              className={cn(
                "relative shrink-0 overflow-hidden rounded-full border px-3.5 py-2 text-[12px] transition-colors duration-300",
                selected
                  ? "border-violet-500/40 bg-violet-500/[0.1] text-mist-100"
                  : "border-white/[0.06] text-mist-500 hover:border-white/[0.12] hover:text-mist-200",
              )}
            >
              <span className={cn("mr-1.5 text-[10px] tabular-nums", selected ? "text-violet-300/85" : "text-mist-600")}>
                0{index + 1}
              </span>
              {item.label}
              {selected && !paused && !reduce ? (
                <motion.span
                  key={active}
                  aria-hidden="true"
                  className="absolute inset-x-0 bottom-0 h-px bg-violet-400/70"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: AUTOPLAY / 1000, ease: "linear" }}
                  style={{ transformOrigin: "left" }}
                />
              ) : null}
            </button>
          );
        })}
      </div>

      <div className="relative mt-4">
        <div className="pointer-events-none absolute -inset-x-10 -top-12 h-40 bg-[radial-gradient(50%_60%_at_50%_50%,rgba(111,179,238,0.07),transparent_70%)]" />
        <div className="relative overflow-hidden rounded-2xl border border-line-soft bg-[#0a0c0f] shadow-card">
          <div className="flex items-center justify-between border-b border-white/[0.05] px-4 py-2.5 sm:px-5">
            <span className="flex items-center gap-2.5">
              <AxiomMark />
              <span className="text-[10.5px] uppercase tracking-[0.18em] text-mist-500">
                {step.label} · живой прототип
              </span>
            </span>
            <span className="flex items-center gap-1.5 rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] text-mist-500">
              <IconWand className="h-3 w-3 text-violet-300/80" />
              демо-данные
            </span>
          </div>

          <div className="relative h-[380px] sm:h-[420px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={step.key}
                initial={reduce ? false : { opacity: 0, y: 16, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? undefined : { opacity: 0, y: -12, filter: "blur(6px)" }}
                transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                className="absolute inset-0 p-4 sm:p-6"
              >
                {SCENES[step.key]()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-8">
        <AnimatePresence mode="wait">
          <motion.p
            key={`${step.key}-title`}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.3 }}
            className="shrink-0 font-display text-[16px] text-mist-50"
          >
            {step.title}
          </motion.p>
        </AnimatePresence>
        <AnimatePresence mode="wait">
          <motion.p
            key={`${step.key}-text`}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: 0.3, delay: 0.04 }}
            className="max-w-xl text-[13px] leading-[1.7] text-mist-400"
          >
            {step.text}
          </motion.p>
        </AnimatePresence>
      </div>

      <p className="mt-3 flex items-center gap-2 text-[11px] text-mist-600">
        <IconCompass className="h-3.5 w-3.5" />
        Все сцены собраны на реальных данных и правилах AXIOM — не видео и не мокап.
      </p>
    </div>
  );
}
