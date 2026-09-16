"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StepGuard } from "@/components/shell/step-guard";
import { NextStepBar } from "@/components/shell/next-step-bar";
import { Card, SectionHeading } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/ui/progress";
import { EmptyState } from "@/components/ui/empty-state";
import { InfoNote } from "@/components/ui/note";
import { Button, buttonStyles } from "@/components/ui/button";
import { IconExternal, IconScale, IconX } from "@/components/icons";
import { formatDateRu, formatUsd, getIelts, recommend } from "@/lib/shared/engine";
import type { Recommendation } from "@/lib/shared/engine";
import { budgetFitText, durationLabel, ieltsStatusText, scholarshipLabel, scholarshipTone } from "@/lib/labels";
import { useAxiomStore } from "@/lib/store";
import { cn } from "@/lib/utils";

interface CompareRow {
  label: string;
  cell: (item: Recommendation) => React.ReactNode;
  best?: (items: Recommendation[]) => number[];
}

export default function ComparePage() {
  const memories = useAxiomStore((state) => state.memories);
  const compareIds = useAxiomStore((state) => state.compareIds);
  const toggleCompare = useAxiomStore((state) => state.toggleCompare);
  const setTargetProgram = useAxiomStore((state) => state.setTargetProgram);
  const router = useRouter();

  const myIelts = getIelts(memories);

  const recommendations = useMemo(() => recommend(memories).recommendations, [memories]);
  const selected = useMemo(
    () =>
      compareIds
        .map((id) => recommendations.find((item) => item.program.id === id))
        .filter((item): item is Recommendation => Boolean(item)),
    [compareIds, recommendations],
  );

  const rows: CompareRow[] = [
    {
      label: "Соответствие",
      best: (items) => {
        const max = Math.max(...items.map((item) => item.score));
        return items.map((item, index) => (item.score === max ? index : -1)).filter((index) => index !== -1);
      },
      cell: (item) => (
        <div className="flex items-center gap-3">
          <ScoreRing value={item.score} size={48} stroke={4} />
          <span className="text-[12.5px] text-mist-300">{item.fitLabel}</span>
        </div>
      ),
    },
    {
      label: "Страна и город",
      cell: (item) => `${item.program.country}, ${item.program.city}`,
    },
    {
      label: "Обучение в год",
      cell: (item) => (item.program.tuitionPerYearUsd === 0 ? "Бесплатно" : formatUsd(item.program.tuitionPerYearUsd)),
    },
    {
      label: "Проживание в год",
      cell: (item) => formatUsd(item.program.livingPerYearUsd),
    },
    {
      label: "Итого в год",
      best: (items) => {
        const min = Math.min(...items.map((item) => item.totalPerYearUsd));
        return items.map((item, index) => (item.totalPerYearUsd === min ? index : -1)).filter((index) => index !== -1);
      },
      cell: (item) => <span className="font-medium text-mist-100">{formatUsd(item.totalPerYearUsd)}</span>,
    },
    {
      label: "В бюджет",
      cell: (item) => (
        <span
          className={cn(
            (item.budgetDeltaUsd ?? 0) >= 0 || item.program.scholarship === "full" ? "text-teal-300" : "text-rose-300",
          )}
        >
          {budgetFitText(item)}
        </span>
      ),
    },
    {
      label: "Стипендия",
      cell: (item) => (
        <div className="space-y-1.5">
          <Badge tone={scholarshipTone(item.program.scholarship)}>{scholarshipLabel(item.program.scholarship)}</Badge>
          <p className="text-[12px] leading-relaxed text-mist-400">{item.program.scholarshipNote}</p>
        </div>
      ),
    },
    {
      label: "IELTS",
      best: (items) =>
        items
          .map((item, index) =>
            item.program.ieltsMin === null || (myIelts !== null && myIelts >= item.program.ieltsMin) ? index : -1,
          )
          .filter((index) => index !== -1),
      cell: (item) => {
        const text = ieltsStatusText(item, myIelts);
        const ok = item.program.ieltsMin === null || (myIelts !== null && myIelts >= item.program.ieltsMin);
        return <span className={ok ? "text-teal-300" : "text-mist-300"}>{text}</span>;
      },
    },
    {
      label: "Язык обучения",
      cell: (item) => item.program.language,
    },
    {
      label: "Длительность",
      cell: (item) => durationLabel(item.program.durationYears),
    },
    {
      label: "Дедлайн",
      cell: (item) => {
        const deadline = item.program.deadlines[0];
        return deadline ? (
          <span>
            {formatDateRu(deadline.date)}
            <span className="mt-1 block text-[11.5px] text-mist-500">{deadline.label}</span>
          </span>
        ) : (
          "уточняется"
        );
      },
    },
    {
      label: "Данные",
      cell: (item) => (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <Badge tone="amber">Демо-данные</Badge>
          {item.program.sources[0] ? (
            <a
              href={item.program.sources[0].url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-[12px] text-mist-400 transition-colors hover:text-violet-300"
            >
              {item.program.sources[0].label}
              <IconExternal className="h-3 w-3" />
            </a>
          ) : null}
        </span>
      ),
    },
  ];

  if (selected.length < 2) {
    return (
      <StepGuard>
        <SectionHeading
          eyebrow="Шаг 4 из 6"
          title="Сравнение программ"
          description="Поставь рядом 2–3 варианта и сравни их по важным для тебя параметрам."
          className="mb-6"
        />
        <EmptyState
          icon={<IconScale />}
          title="Выбери минимум две программы"
          description="Вернись к рекомендациям и отметь программы кнопкой «Добавить в сравнение» — или возьми топ-2 сразу."
          action={
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Link href="/recommendations" className={buttonStyles("primary", "lg")}>
                К рекомендациям
              </Link>
              <Button
                variant="secondary"
                size="lg"
                onClick={() => {
                  recommendations.slice(0, 2).forEach((item) => {
                    if (!compareIds.includes(item.program.id)) toggleCompare(item.program.id);
                  });
                }}
              >
                Взять топ-2
              </Button>
            </div>
          }
        />
        <NextStepBar backHref="/recommendations" backLabel="К рекомендациям" />
      </StepGuard>
    );
  }

  return (
    <StepGuard>
      <SectionHeading
        eyebrow="Шаг 4 из 6"
        title="Сравнение программ"
        description="Зелёным подсвечено то, где вариант объективно выигрывает по твоему профилю."
        right={<Badge tone="violet">{selected.length} из 3 выбрано</Badge>}
        className="mb-6"
      />

      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-separate border-spacing-0 text-left">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 w-40 border-b border-line-soft bg-ink-900/95 px-4 py-4 align-top text-[11px] font-semibold uppercase tracking-[0.14em] text-mist-500">
                  Параметр
                </th>
                {selected.map((item) => (
                  <th key={item.program.id} className="min-w-56 border-b border-line-soft bg-white/[0.02] px-4 py-4 align-top">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-[13.5px] font-semibold leading-snug text-mist-50">
                          {item.program.university}
                        </p>
                        <p className="mt-0.5 text-[11.5px] text-mist-500">
                          {item.program.country}, {item.program.city}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleCompare(item.program.id)}
                        aria-label={`Убрать ${item.program.university} из сравнения`}
                        className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-mist-500 transition-colors hover:bg-white/[0.07] hover:text-mist-200"
                      >
                        <IconX className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-3 w-full"
                      onClick={() => {
                        setTargetProgram(item.program.id);
                        router.push("/roadmap");
                      }}
                    >
                      Сделать целью
                    </Button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const best = row.best?.(selected) ?? [];
                return (
                  <tr key={row.label}>
                    <th
                      scope="row"
                      className="sticky left-0 z-10 border-b border-line-soft bg-ink-900/95 px-4 py-3.5 text-[12px] font-medium text-mist-400"
                    >
                      {row.label}
                    </th>
                    {selected.map((item, index) => (
                      <td
                        key={item.program.id}
                        className={cn(
                          "border-b border-line-soft px-4 py-3.5 align-top text-[12.5px] leading-relaxed text-mist-300",
                          best.includes(index) && "bg-teal-400/[0.06] text-mist-100",
                        )}
                      >
                        {row.cell(item)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <InfoNote tone="warn" className="mt-5">
        «Соответствие» — это оценка по твоим фактам, а не вероятность поступления. Стипендии и дедлайны — демо-данные:
        проверяй их на официальных сайтах вузов.
      </InfoNote>

      <NextStepBar backHref="/recommendations" backLabel="К рекомендациям" nextHref="/whatif" nextLabel="Как изменится?" />
    </StepGuard>
  );
}
