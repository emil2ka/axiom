"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StepGuard } from "@/components/shell/step-guard";
import { NextStepBar } from "@/components/shell/next-step-bar";
import { Card, SectionHeading } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ProgressBar, ScoreRing } from "@/components/ui/progress";
import { InfoNote } from "@/components/ui/note";
import { MemoryPanel } from "@/components/flow/memory-chips";
import { IconAlert, IconCircleCheck, IconTarget } from "@/components/icons";
import { diagnose } from "@/lib/shared/engine";
import type { Diagnosis } from "@/lib/shared/engine";
import { diagnoseSmart } from "@/lib/api";
import { useAxiomStore } from "@/lib/store";

export default function DiagnosisPage() {
  const memories = useAxiomStore((state) => state.memories);
  const overrideMemory = useAxiomStore((state) => state.overrideMemory);
  const removeMemory = useAxiomStore((state) => state.removeMemory);
  const [diagnosis, setDiagnosis] = useState<Diagnosis>(() => diagnose(memories));
  const [engine, setEngine] = useState<"rules" | "llm">("rules");

  useEffect(() => {
    const local = diagnose(memories);
    setDiagnosis(local);
    setEngine("rules");
    let cancelled = false;
    void diagnoseSmart(memories).then((result) => {
      if (cancelled || !result?.strengths) return;
      setDiagnosis(result);
      setEngine(result.engine === "llm" ? "llm" : "rules");
    });
    return () => {
      cancelled = true;
    };
  }, [memories]);

  return (
    <StepGuard>
      <SectionHeading
        eyebrow="Шаг 2 из 6"
        title="Диагностика профиля"
        description="Короткое резюме: кто ты, какая цель, что уже играет в твою пользу и что ограничивает выбор."
        right={
          <Badge tone={engine === "llm" ? "teal" : "neutral"} dot>
            {engine === "llm" ? "AI-резюме (LLM)" : "Резюме на правилах"}
          </Badge>
        }
        className="mb-6"
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Card>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:gap-7">
              <div className="flex items-center gap-4">
                <ScoreRing value={diagnosis.completeness} size={84} label="профиль" />
                <div className="text-[12.5px] leading-relaxed text-mist-400">
                  <p className="font-display text-sm font-semibold text-mist-100">Полнота профиля</p>
                  <p className="mt-1">
                    {diagnosis.knownFacts} из {diagnosis.totalCoreFacts} ключевых фактов
                  </p>
                  <div className="mt-2 w-40">
                    <ProgressBar value={diagnosis.completeness} size="sm" />
                  </div>
                </div>
              </div>
              <div className="flex-1 space-y-2.5 sm:border-l sm:border-line-soft sm:pl-7">
                <p className="text-[13.5px] leading-relaxed text-mist-200">{diagnosis.summary}</p>
                <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-mist-400">
                  <IconTarget className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
                  <span>
                    <span className="text-mist-300">Цель: </span>
                    {diagnosis.goal}
                  </span>
                </p>
              </div>
            </div>
          </Card>

          <div className="grid gap-5 md:grid-cols-2">
            <Card>
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-mist-50">
                <IconCircleCheck className="h-4.5 w-4.5 text-teal-400" />
                Сильные стороны
              </h3>
              <ul className="mt-3.5 space-y-2.5">
                {diagnosis.strengths.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-mist-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-teal-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>

            <Card>
              <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-mist-50">
                <IconAlert className="h-4.5 w-4.5 text-amber-400" />
                Ограничения
              </h3>
              <ul className="mt-3.5 space-y-2.5">
                {diagnosis.constraints.map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-mist-300">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </Card>
          </div>

          <InfoNote tone="info">
            Диагностика — честная оценка по твоим ответам, а не гарантия поступления. Дальше AXIOM подберёт вузы и объяснит
            каждую рекомендацию.
          </InfoNote>
        </div>

        <div className="space-y-4 lg:sticky lg:top-28">
          <MemoryPanel facts={memories} editable onUpdate={overrideMemory} onRemove={removeMemory} />
          <Link href="/interview" className="block text-[12.5px] text-violet-300 transition-colors hover:text-violet-200">
            Изменить ответы интервью →
          </Link>
        </div>
      </div>

      <NextStepBar backHref="/interview" backLabel="К интервью" nextHref="/recommendations" nextLabel="К рекомендациям" />
    </StepGuard>
  );
}
