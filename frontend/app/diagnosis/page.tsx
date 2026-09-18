"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StepGuard } from "@/components/shell/step-guard";
import { NextStepBar } from "@/components/shell/next-step-bar";
import { SectionHeading } from "@/components/ui/card";
import { MemoryPanel } from "@/components/flow/memory-chips";
import { diagnose } from "@/lib/shared/engine";
import type { Diagnosis } from "@/lib/shared/engine";
import { diagnoseSmart } from "@/lib/api";
import { useAxiomStore } from "@/lib/store";

export default function DiagnosisPage() {
  const memories = useAxiomStore((state) => state.memories);
  const overrideMemory = useAxiomStore((state) => state.overrideMemory);
  const removeMemory = useAxiomStore((state) => state.removeMemory);
  const [diagnosis, setDiagnosis] = useState<Diagnosis>(() => diagnose(memories));

  useEffect(() => {
    const local = diagnose(memories);
    setDiagnosis(local);
    let cancelled = false;
    void diagnoseSmart(memories).then((result) => {
      if (cancelled || !result?.strengths) return;
      setDiagnosis(result);
    });
    return () => {
      cancelled = true;
    };
  }, [memories]);

  return (
    <StepGuard>
      <SectionHeading
        eyebrow="Шаг 2 из 6"
        title="Твоя траектория"
        description="Твоё направление и то, что стоит учесть перед выбором университета."
        className="mb-6"
      />

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:gap-16">
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-mist-500">Твоя цель</p>
          <h3 className="mt-3 max-w-[19ch] font-display text-[30px] font-medium leading-[1.15] tracking-[-0.04em] text-mist-50 sm:text-[40px]">
            {diagnosis.goal}
          </h3>
          <div className="mt-9 flex items-center gap-4">
            <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.08]">
              <div className="h-full rounded-full bg-violet-300 transition-[width] duration-700" style={{ width: `${diagnosis.completeness}%` }} />
            </div>
            <span className="shrink-0 text-[11px] text-mist-500">Профиль {diagnosis.knownFacts}/{diagnosis.totalCoreFacts}</span>
          </div>
          <div className="mt-12 grid gap-10 sm:grid-cols-2">
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-teal-300">Твоя опора</p>
              <ul className="mt-4 space-y-3">
                {(diagnosis.strengths.length ? diagnosis.strengths : ["Направление уже определено."])
                  .slice(0, 3)
                  .map((item) => (
                    <li
                      key={item}
                      className="flex max-w-[36ch] items-start gap-3 text-[14px] leading-[1.6] text-mist-300"
                    >
                      <span className="mt-[10px] h-px w-2.5 shrink-0 bg-teal-400/70" />
                      {item}
                    </li>
                  ))}
              </ul>
            </div>
            <div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-amber-300">Стоит учесть</p>
              <ul className="mt-4 space-y-3">
                {(diagnosis.constraints.length ? diagnosis.constraints : ["Серьёзных ограничений пока не видно."])
                  .slice(0, 3)
                  .map((item) => (
                    <li
                      key={item}
                      className="flex max-w-[36ch] items-start gap-3 text-[14px] leading-[1.6] text-mist-300"
                    >
                      <span className="mt-[10px] h-px w-2.5 shrink-0 bg-amber-400/70" />
                      {item}
                    </li>
                  ))}
              </ul>
            </div>
          </div>
        </div>

        <details open className="group lg:sticky lg:top-28">
          <summary className="cursor-pointer list-none border-b border-white/10 pb-4 text-[13px] text-mist-300 marker:hidden">
            Все факты профиля <span className="float-right text-mist-600">{memories.length} · <span className="group-open:hidden">+</span><span className="hidden group-open:inline">−</span></span>
          </summary>
          <div className="space-y-4 pt-5">
            <MemoryPanel facts={memories} editable onUpdate={overrideMemory} onRemove={removeMemory} />
            <Link href="/interview" className="block text-[12.5px] text-violet-300 transition-colors hover:text-violet-200">
              Изменить ответы интервью →
            </Link>
          </div>
        </details>
      </div>

      <NextStepBar backHref="/interview" backLabel="К интервью" nextHref="/recommendations" nextLabel="К рекомендациям" />
    </StepGuard>
  );
}
