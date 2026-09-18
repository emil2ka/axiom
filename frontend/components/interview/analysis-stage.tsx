"use client";

import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { PROGRAMS } from "@/lib/shared/engine";
import type { MemoryFact } from "@/lib/shared/engine";
import { BUILDINGS } from "@/lib/campus-art";

export interface AnalysisTop {
  id: string;
  university: string;
  city: string;
  country: string;
  score: number;
  reason: string | null;
}

export interface AnalysisState {
  stage: "spin" | "result";
  facts: MemoryFact[];
  top: AnalysisTop[];
}

const RING = [...PROGRAMS]
  .filter((program, index, list) => list.findIndex((item) => item.university === program.university) === index)
  .slice(0, 8);

const RING_STEP = 360 / RING.length;

const FLIGHT = { type: "spring", stiffness: 190, damping: 26, mass: 0.9 } as const;

function RingCard({ program, index }: { program: (typeof RING)[number]; index: number }) {
  const building = BUILDINGS[program.id] ?? "aalto";
  return (
    <motion.div
      layoutId={`uni-${program.id}`}
      transition={FLIGHT}
      className="absolute left-1/2 top-1/2 h-[158px] w-[118px] -ml-[59px] -mt-[79px] overflow-hidden rounded-xl border border-white/10 bg-[#101318] shadow-[0_26px_54px_-32px_rgba(0,0,0,0.95)]"
      style={{ transform: `rotateY(${index * RING_STEP}deg) translateZ(232px)` }}
    >
      <div className="absolute inset-x-0 top-1.5 bottom-9">
        <Image
          src={`/campuses/cutouts/${building}.webp`}
          alt=""
          fill
          sizes="120px"
          className="object-contain object-bottom opacity-90 saturate-[0.85]"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-[#0c0e11] to-transparent" />
      <div className="absolute inset-x-0 bottom-0 px-2 pb-1.5">
        <p className="truncate text-[9px] uppercase tracking-[0.14em] text-mist-500">{program.country}</p>
        <p className="truncate text-[9.5px] text-mist-200">{program.university}</p>
      </div>
    </motion.div>
  );
}

function SpinStage() {
  const reduce = useReducedMotion();
  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative h-[250px] w-full [perspective:1000px]">
        <div className="absolute left-1/2 top-1/2 h-[320px] w-[640px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(50%_50%_at_50%_50%,rgba(111,179,238,0.11),transparent_72%)]" />
        <motion.div
          className="absolute inset-0 [transform-style:preserve-3d]"
          initial={false}
          animate={reduce ? undefined : { rotateY: 360 }}
          transition={{ duration: 7.5, repeat: Infinity, ease: "linear" }}
          style={{ rotateX: -9 }}
        >
          {RING.map((program, index) => (
            <RingCard key={program.id} program={program} index={index} />
          ))}
        </motion.div>
      </div>
      <div className="mt-5 flex items-center gap-2.5">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400/60" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-violet-400/80" />
        </span>
        <p className="text-[12.5px] text-mist-400">Анализирую профиль</p>
        <span className="flex gap-1">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="block h-1 w-1 rounded-full bg-mist-500"
              animate={reduce ? undefined : { opacity: [0.25, 1, 0.25] }}
              transition={{ duration: 1.1, repeat: Infinity, delay: index * 0.18 }}
            />
          ))}
        </span>
      </div>
    </div>
  );
}

function ResultStage({ facts, top, flyable }: { facts: MemoryFact[]; top: AnalysisTop[]; flyable: boolean }) {
  const reduce = useReducedMotion();
  return (
    <div className="card w-full max-w-md overflow-hidden p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">Вывод анализа</p>
        <span className="rounded-full border border-white/[0.07] bg-white/[0.03] px-2.5 py-1 text-[10px] tabular-nums text-mist-400">
          {facts.length} {facts.length === 1 ? "факт" : facts.length < 5 ? "факта" : "фактов"}
        </span>
      </div>

      {facts.length ? (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {facts.map((fact, index) => (
            <motion.span
              key={fact.id}
              initial={reduce ? false : { opacity: 0, y: 7, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.08 + index * 0.08, type: "spring", stiffness: 300, damping: 24 }}
              className="inline-flex items-baseline gap-1.5 rounded-full border border-violet-500/25 bg-violet-500/[0.1] px-2.5 py-1"
            >
              <span className="text-[9px] uppercase tracking-[0.16em] text-violet-300/75">{fact.label}</span>
              <span className="text-[12px] text-mist-100">{fact.display}</span>
            </motion.span>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-[12.5px] leading-relaxed text-mist-400">
          Новых фактов не нашлось — задам ещё пару вопросов.
        </p>
      )}

      {top.length ? (
        <div className="mt-5 border-t border-line-soft pt-4">
          <p className="text-[9.5px] uppercase tracking-[0.18em] text-mist-600">Уже подходят по профилю</p>
          <div className="mt-2">
            {top.map((item, index) => (
              <div key={item.id} className="flex items-center gap-3 border-b border-white/[0.04] py-2.5 last:border-b-0">
                <motion.span
                  layoutId={flyable ? `uni-${item.id}` : undefined}
                  transition={FLIGHT}
                  className="relative h-9 w-12 shrink-0 overflow-hidden rounded-md border border-white/[0.06] bg-[#1a1e24]"
                >
                  <Image
                    src={`/campuses/cutouts/${BUILDINGS[item.id] ?? "aalto"}.webp`}
                    alt=""
                    fill
                    sizes="48px"
                    className="object-contain object-bottom"
                  />
                </motion.span>
                <motion.span
                  initial={reduce ? false : { opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.32 + index * 0.1, duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="min-w-0 flex-1"
                >
                  <span className="block truncate text-[12.5px] leading-snug text-mist-100">{item.university}</span>
                  <span className="block text-[10.5px] text-mist-500">
                    {item.city}, {item.country}
                  </span>
                  {item.reason ? (
                    <span className="mt-0.5 line-clamp-2 text-[10.5px] leading-[1.35] text-violet-300/70">{item.reason}</span>
                  ) : null}
                </motion.span>
                <motion.span
                  initial={reduce ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.42 + index * 0.1, duration: 0.3 }}
                  className="shrink-0 font-display text-[17px] leading-none tabular-nums text-violet-300"
                >
                  {item.score}
                </motion.span>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function AnalysisStage({ data }: { data: AnalysisState }) {
  const reduce = useReducedMotion();
  const flyable = !reduce && data.top.length > 0;

  return (
    <div className="flex w-full flex-col items-center" aria-live="polite">
      <AnimatePresence initial={false}>
        {data.stage === "spin" ? (
          <motion.div
            key="spin"
            className="w-full"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          >
            <SpinStage />
          </motion.div>
        ) : (
          <motion.div
            key="result"
            className="flex w-full justify-center"
            initial={reduce ? false : { scale: 0.985 }}
            animate={{ scale: 1 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <ResultStage facts={data.facts} top={data.top} flyable={flyable} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
