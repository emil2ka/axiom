"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SiteShell } from "@/components/shell/site-shell";
import { UniversityCard } from "@/components/universities/university-card";
import { buttonStyles } from "@/components/ui/button";
import { IconArrowRight } from "@/components/icons";
import { pluralRu } from "@/lib/shared/engine";
import { groupUniversities } from "@/lib/university";
import { cn } from "@/lib/utils";

export default function UniversitiesPage() {
  const groups = useMemo(() => groupUniversities(), []);
  const countries = useMemo(() => [...new Set(groups.map((group) => group.country))], [groups]);
  const [country, setCountry] = useState<string | null>(null);
  const visible = country ? groups.filter((group) => group.country === country) : groups;
  const programsCount = groups.reduce((sum, group) => sum + group.programs.length, 0);

  const chip = (active: boolean) =>
    cn(
      "shrink-0 rounded-full border px-3 py-1.5 text-[11px] transition-colors",
      active ? "border-violet-400/50 bg-violet-500/15 text-mist-50" : "border-line text-mist-500 hover:text-mist-100",
    );

  return (
    <SiteShell active="universities">
      <header className="flex flex-wrap items-end justify-between gap-5">
        <div className="max-w-2xl">
          <p className="eyebrow">Каталог</p>
          <h1 className="mt-3 font-display text-4xl tracking-[-.05em] text-mist-50">Вузы</h1>
          <p className="mt-3 text-sm leading-[1.8] text-mist-400">
            Каждый вуз — как отдельная история: кампус, программы, стоимость, стипендии и дедлайны. Открой любой, чтобы
            понять, твой ли это вариант.
          </p>
        </div>
        <p className="text-[11px] text-mist-500">
          {groups.length} {pluralRu(groups.length, "вуз", "вуза", "вузов")} · {programsCount}{" "}
          {pluralRu(programsCount, "программа", "программы", "программ")}
        </p>
      </header>

      <div className="no-scrollbar mt-7 flex gap-2 overflow-x-auto pb-1">
        <button className={chip(country === null)} onClick={() => setCountry(null)}>
          Все страны
        </button>
        {countries.map((name) => (
          <button
            key={name}
            className={chip(country === name)}
            onClick={() => setCountry(country === name ? null : name)}
          >
            {name}
          </button>
        ))}
      </div>

      <div className="mt-7 grid gap-5 sm:grid-cols-2">
        {visible.map((group, index) => (
          <UniversityCard key={group.slug} group={group} priority={index < 2} className="animate-rise-in" />
        ))}
      </div>

      <div className="mt-12 flex flex-col items-start justify-between gap-6 rounded-[24px] border border-line-soft bg-white/[0.02] px-6 py-8 sm:flex-row sm:items-center">
        <div className="max-w-xl">
          <p className="font-display text-[22px] leading-tight tracking-[-.03em] text-mist-50">
            Не знаешь, с чего начать?
          </p>
          <p className="mt-2 text-[13px] leading-[1.7] text-mist-400">
            Пройди короткое интервью — AXIOM посчитает соответствие, объяснит выбор и соберёт маршрут поступления.
          </p>
        </div>
        <Link href="/interview" className={buttonStyles("primary", "lg", "shrink-0")}>
          Пройти интервью
          <IconArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </SiteShell>
  );
}
