"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { StepGuard } from "@/components/shell/step-guard";
import { IconArrowRight, IconCheck, IconPencil, IconTrash, IconX } from "@/components/icons";
import { CORE_FIELDS, diagnose, selectNextQuestion } from "@/lib/shared/engine";
import type { Diagnosis, MemoryFact } from "@/lib/shared/engine";
import { diagnoseSmart } from "@/lib/api";
import { useAxiomStore } from "@/lib/store";

const HAIRLINE = "rgba(255,255,255,0.07)";
const BALL = "radial-gradient(120% 120% at 32% 26%, #d7ebff 0%, #7cb6f2 45%, #3a76c8 100%)";

/** Идёт от прежнего значения к новому — правка факта пересчитывает цифру на глазах. */
function useCountUp(value: number, animate: boolean) {
  const [display, setDisplay] = useState(() => (animate ? 0 : value));
  const fromRef = useRef(animate ? 0 : value);

  useEffect(() => {
    if (!animate) {
      fromRef.current = value;
      setDisplay(value);
      return;
    }
    const from = fromRef.current;
    if (from === value) return;
    const started = performance.now();
    const duration = 900;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (value - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
      else fromRef.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, animate]);

  return display;
}

function PanelLabel({ children, tone = "blue" }: { children: React.ReactNode; tone?: "blue" | "teal" | "amber" }) {
  const dot = tone === "teal" ? "bg-teal-400/80" : tone === "amber" ? "bg-amber-400/80" : "bg-[#8cc5f5]/80";
  return (
    <p className="flex items-center gap-2 text-[10.5px] uppercase tracking-[0.18em] text-mist-500">
      <span className={`h-1.5 w-1.5 rounded-full ${dot}`} />
      {children}
    </p>
  );
}

function FactLine({
  fact,
  reduce,
  onUpdate,
  onRemove,
}: {
  fact: MemoryFact;
  reduce: boolean;
  onUpdate: (id: string, value: string) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(fact.display);

  const save = () => {
    const next = draft.trim();
    if (next && next !== fact.display) onUpdate(fact.id, next);
    setEditing(false);
  };

  return (
    <motion.li
      layout="position"
      exit={{ opacity: 0 }}
      transition={{ duration: 0.22 }}
      className="group flex items-center gap-3 py-3"
    >
      {editing ? (
        <>
          <span className="shrink-0 text-[13px] text-mist-500">{fact.label}:</span>
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
              if (event.key === "Escape") setEditing(false);
            }}
            aria-label={`Новое значение: ${fact.label}`}
            className="min-w-0 flex-1 border-b border-[#7fb8f0]/45 bg-transparent pb-1 text-[13px] text-mist-100 outline-none"
          />
          <button type="button" onClick={save} aria-label="Сохранить" className="text-mist-500 transition-colors hover:text-mist-100">
            <IconCheck className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            aria-label="Отменить"
            className="text-mist-600 transition-colors hover:text-mist-200"
          >
            <IconX className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <span className="min-w-0 truncate text-[13px] leading-snug">
            <span className="text-mist-500">{fact.label}: </span>
            <motion.span
              key={fact.display}
              className="text-[#b3dafb]"
              initial={reduce ? false : { opacity: 0, y: 3 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              {fact.display}
            </motion.span>
          </span>
          <span className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            <button
              type="button"
              aria-label={`Изменить: ${fact.label}`}
              onClick={() => {
                setDraft(fact.display);
                setEditing(true);
              }}
              className="flex h-6 w-6 items-center justify-center rounded-md text-mist-500 transition-colors hover:bg-white/[0.06] hover:text-mist-100"
            >
              <IconPencil className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              aria-label={`Удалить: ${fact.label}`}
              onClick={() => onRemove(fact.id)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-mist-500 transition-colors hover:bg-rose-400/15 hover:text-rose-300"
            >
              <IconTrash className="h-3.5 w-3.5" />
            </button>
          </span>
        </>
      )}
    </motion.li>
  );
}

export default function DiagnosisPage() {
  const memories = useAxiomStore((s) => s.memories);
  const answered = useAxiomStore((s) => s.answeredQuestionIds);
  const override = useAxiomStore((s) => s.overrideMemory);
  const remove = useAxiomStore((s) => s.removeMemory);
  const reduce = useReducedMotion();

  const [diagnosis, setDiagnosis] = useState<Diagnosis>(() => diagnose(memories));
  useEffect(() => {
    let live = true;
    setDiagnosis(diagnose(memories));
    void diagnoseSmart(memories).then((next) => {
      if (live && next?.strengths) setDiagnosis(next);
    });
    return () => {
      live = false;
    };
  }, [memories]);

  const turn = useMemo(() => selectNextQuestion(memories, answered), [memories, answered]);
  const known = CORE_FIELDS.filter((field) => memories.some((fact) => fact.field === field)).length;
  const readiness = useCountUp(diagnosis.completeness, !reduce);

  return (
    <StepGuard requiredFacts={0}>
      <main className="w-full">
        <header>
          <h1 className="font-display text-[34px] leading-tight tracking-[-.04em] text-mist-50 sm:text-[40px]">
            Твоя траектория
          </h1>
        </header>

        <section
          className="mt-8 grid gap-px overflow-hidden rounded-2xl border lg:grid-cols-[1.7fr_0.8fr_1.3fr]"
          style={{ borderColor: HAIRLINE, backgroundColor: HAIRLINE }}
        >
          <div className="bg-ink-950 p-6 sm:p-8">
            <PanelLabel>Профиль</PanelLabel>
            <p className="mt-4 font-display text-[19px] leading-snug text-mist-50 sm:text-[21px]">{diagnosis.goal}</p>
            <p className="mt-3 text-[12px] text-mist-500">
              {known} из {CORE_FIELDS.length} ключевых фактов
            </p>
          </div>

          <div className="bg-ink-950 p-6 sm:p-8">
            <PanelLabel>Готовность</PanelLabel>
            <p className="tnum mt-4 font-display text-[56px] leading-none tracking-[-.05em] text-mist-50 sm:text-[64px]">
              {readiness}
              <span className="ml-1 align-top text-[16px] text-mist-500">%</span>
            </p>
          </div>

          <div className="flex flex-col bg-ink-950 p-6 sm:p-8">
            <PanelLabel>Следующий штрих</PanelLabel>
            <p className="mt-4 text-[13.5px] leading-relaxed text-mist-200">
              {turn.question?.text ?? "Профиль можно использовать."}
            </p>
            <Link
              href="/interview"
              className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[13px] text-[#b3dafb] transition-colors hover:text-violet-200"
            >
              {turn.question ? "Ответить" : "Дополнить"}
              <IconArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="relative bg-ink-950 px-6 pb-7 pt-6 sm:px-8 lg:col-span-3">
            <div className="relative h-px w-full" style={{ backgroundColor: HAIRLINE }}>
              <motion.div
                className="absolute inset-y-0 left-0 bg-[#8cc5f5]/70"
                initial={reduce ? false : { width: "0%" }}
                animate={{ width: `${diagnosis.completeness}%` }}
                transition={{ type: "spring", stiffness: 55, damping: 20 }}
              />
              <motion.span
                className="absolute top-1/2 block h-3 w-3 rounded-full"
                style={{ marginTop: -6, marginLeft: -6, background: BALL, boxShadow: "0 0 18px rgba(124,182,242,0.4)" }}
                initial={reduce ? false : { left: "0%" }}
                animate={{ left: `${diagnosis.completeness}%` }}
                transition={{ type: "spring", stiffness: 55, damping: 20 }}
              />
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-5 lg:grid-cols-[1.7fr_1fr]">
          <div className="rounded-2xl border bg-white/[0.02] p-6 sm:p-8" style={{ borderColor: HAIRLINE }}>
            <PanelLabel>Память</PanelLabel>
            {memories.length === 0 ? (
              <p className="mt-4 text-[13px] text-mist-500">
                Пока пусто —{" "}
                <Link href="/interview" className="text-[#b3dafb] transition-colors hover:text-violet-200">
                  рассказать
                </Link>
              </p>
            ) : null}
            <ul className="mt-2 divide-y divide-white/[0.07]">
              <AnimatePresence initial={false}>
                {memories.map((fact) => (
                  <FactLine key={fact.id} fact={fact} reduce={Boolean(reduce)} onUpdate={override} onRemove={remove} />
                ))}
              </AnimatePresence>
            </ul>
          </div>

          <div className="grid gap-5">
            <div className="rounded-2xl border bg-white/[0.02] p-6" style={{ borderColor: HAIRLINE }}>
              <PanelLabel tone="teal">Опора</PanelLabel>
              <ul className="mt-4 space-y-2.5">
                {diagnosis.strengths.map((item) => (
                  <li key={item} className="text-[13px] leading-relaxed text-mist-300">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border bg-white/[0.02] p-6" style={{ borderColor: HAIRLINE }}>
              <PanelLabel tone="amber">Внимание</PanelLabel>
              <ul className="mt-4 space-y-2.5">
                {diagnosis.constraints.map((item) => (
                  <li key={item} className="text-[13px] leading-relaxed text-amber-200/80">
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      </main>
    </StepGuard>
  );
}
