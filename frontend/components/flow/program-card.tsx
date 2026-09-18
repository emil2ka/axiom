"use client";

import Image from "next/image";
import { IconExternal, IconStar } from "@/components/icons";
import { formatDateRu, formatUsd } from "@/lib/shared/engine";
import type { Recommendation } from "@/lib/shared/engine";
import { BUILDINGS, TINTS } from "@/lib/campus-art";
import { cn } from "@/lib/utils";

export function ProgramCard({
  item, featured = false, favorite, inCompare, compareDisabled, compareSelectionCount,
  onToggleFavorite, onToggleCompare, onSetTarget,
}: {
  item: Recommendation;
  featured?: boolean;
  favorite: boolean;
  inCompare: boolean;
  compareDisabled: boolean;
  compareSelectionCount: number;
  onToggleFavorite: (programId: string) => void;
  onToggleCompare: (programId: string) => void;
  onSetTarget: (programId: string) => void;
}) {
  const { program } = item;
  const deadline = program.deadlines[0];
  const building = BUILDINGS[program.id] ?? "aalto";
  const tint = TINTS[program.id] ?? "#252a2d";
  const price = formatUsd(item.totalPerYearUsd);
  const programName = program.programName.replace(/\s*\(на английском\)/i, "");
  const longTitle = program.university.length > 34;

  return (
    <article
      className={cn(
        "group relative isolate flex flex-col overflow-hidden rounded-[7px] bg-[#151719] p-6 shadow-[0_28px_70px_-50px_rgba(0,0,0,.9)] transition-transform duration-500 hover:-translate-y-1",
        featured
          ? longTitle ? "min-h-[560px] sm:min-h-[590px] sm:p-10" : "min-h-[500px] sm:min-h-[550px] sm:p-10"
          : "min-h-[470px] sm:min-h-[510px] sm:p-8",
        inCompare && "outline outline-1 outline-white/30",
      )}
      style={{ backgroundImage: `radial-gradient(ellipse at 83% 65%, ${tint} 0%, #17191b 57%, #121416 100%)` }}
    >
      <div className={cn(
        "pointer-events-none absolute z-0",
        featured
          ? "bottom-[24%] right-[-4%] top-[40%] w-[108%] sm:bottom-[18%] sm:right-[-3%] sm:top-[32%] sm:w-[66%]"
          : "bottom-[27%] right-[-4%] top-[40%] w-[108%] sm:bottom-[30%] sm:right-[-3%] sm:top-[38%] sm:w-[73%]",
      )}
        aria-hidden="true"
      >
        <Image
          src={`/campuses/cutouts/${building}.webp`}
          alt=""
          fill
          sizes={featured ? "(max-width: 640px) 100vw, 66vw" : "(max-width: 640px) 100vw, 45vw"}
          className="object-contain object-bottom opacity-95 transition-[transform,opacity] duration-700 ease-out group-hover:scale-[1.035] group-hover:opacity-100"
          priority={featured}
        />
      </div>
      <div className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-r from-[#111315]/15 via-transparent to-transparent sm:from-[#111315]/45" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-28 bg-gradient-to-t from-[#0e1012] via-[#0e1012]/72 to-transparent" />

      <div className="relative z-10 flex items-start justify-between gap-5">
        <span className="text-[11px] font-medium tracking-[0.18em] text-white/50">
          {featured ? "ВАШ ПЕРВЫЙ ВЫБОР" : String(item.rank).padStart(2, "0")}
        </span>
        <button
          type="button"
          onClick={() => onToggleFavorite(program.id)}
          aria-label={favorite ? "Убрать из избранного" : "Добавить в избранное"}
          aria-pressed={favorite}
          className={cn("p-1.5 transition-colors", favorite ? "text-amber-300" : "text-white/45 hover:text-white")}
        >
          <IconStar className="h-[18px] w-[18px]" filled={favorite} />
        </button>
      </div>

      <div className={cn("relative z-10 mt-7 max-w-[86%] sm:max-w-[66%]", featured && "sm:max-w-[36%]")}>
        <p className="text-[11px] tracking-[0.12em] text-white/60">
          {program.city}, {program.country} · {program.language}
        </p>
        <h3 className={cn(
          "mt-2 max-w-[18ch] font-display font-medium leading-[1.02] tracking-[-0.045em] text-white",
          featured ? "text-[31px] sm:text-[42px]" : "text-[27px] sm:text-[34px]",
        )}>
          {program.university}
        </h3>
        <p className="mt-3 max-w-[27ch] text-[12px] leading-[1.5] text-white/65 sm:text-[13px]">
          {programName}
        </p>
      </div>

      <div className="relative z-10 mt-auto flex flex-wrap items-end justify-between gap-x-5 gap-y-4 pt-14">
        <div className="flex items-end gap-5 sm:gap-7">
          <div>
            <p className="text-[10px] tracking-[0.1em] text-white/50">В год · с проживанием</p>
            <p className="mt-1 text-[22px] font-medium leading-none tracking-[-0.04em] text-white sm:text-[25px]">{price}</p>
          </div>
          <div className="hidden sm:block">
            <p className="text-[10px] tracking-[0.1em] text-white/50">Дедлайн</p>
            <p className="mt-1 text-[12px] text-white/85">{deadline ? formatDateRu(deadline.date) : "Уточняется"}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => onSetTarget(program.id)}
          className="border-b border-white/70 pb-1 text-[12px] font-medium text-white transition-[border-color,transform] hover:translate-x-1 hover:border-white"
        >
          Выбрать направление ↗
        </button>
      </div>

      <div className="relative z-10 mt-5 flex items-center gap-4 text-[11px] text-white/50">
        <button
          type="button"
          onClick={() => onToggleCompare(program.id)}
          aria-pressed={inCompare}
          disabled={!inCompare && compareDisabled}
          className="transition-colors hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
        >
          {inCompare ? "В сравнении ✓" : compareDisabled ? `Сравнение ${compareSelectionCount}/3` : "+ Сравнить"}
        </button>
        {program.sources[0] ? (
          <a href={program.sources[0].url} target="_blank" rel="noreferrer" aria-label={`Источник: ${program.sources[0].label}`} className="transition-colors hover:text-white">
            <IconExternal className="h-3.5 w-3.5" />
          </a>
        ) : null}
      </div>
    </article>
  );
}
