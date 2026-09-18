"use client";

import { cn } from "@/lib/utils";

export function RangeSlider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  display,
  marker,
  hint,
  className,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  display?: string;
  /** Метка реального значения из профиля — видно, где ты находишься сейчас. */
  marker?: { value: number; label: string };
  hint?: string;
  className?: string;
}) {
  const percent = Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  const markerPercent = marker ? Math.max(0, Math.min(100, ((marker.value - min) / (max - min)) * 100)) : null;

  return (
    <label className={cn("block", className)}>
      <span className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 text-sm">
        <span className="text-mist-300">{label}</span>
        <span className="font-display text-sm font-semibold tnum text-mist-50">{display ?? value}</span>
      </span>
      <span className="relative mt-3 block">
        {markerPercent !== null ? (
          <span
            aria-hidden="true"
            className="absolute -top-1 z-10 h-4 w-px -translate-x-1/2 bg-mist-400/70"
            style={{ left: `${markerPercent}%` }}
          />
        ) : null}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-white/[0.08]"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-violet-500/80 transition-[width] duration-150"
          style={{ width: `${percent}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          aria-label={label}
          onChange={(event) => onChange(Number(event.target.value))}
          className={cn(
            "relative h-5 w-full cursor-pointer appearance-none bg-transparent",
            "[&::-webkit-slider-runnable-track]:h-5 [&::-webkit-slider-runnable-track]:bg-transparent",
            "[&::-webkit-slider-thumb]:mt-[-6px] [&::-webkit-slider-thumb]:h-[18px] [&::-webkit-slider-thumb]:w-[18px] [&::-webkit-slider-thumb]:appearance-none",
            "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-ink-950",
            "[&::-webkit-slider-thumb]:bg-violet-400 [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_rgba(111,179,238,0.22)]",
            "[&::-moz-range-track]:h-5 [&::-moz-range-track]:bg-transparent",
            "[&::-moz-range-thumb]:h-[18px] [&::-moz-range-thumb]:w-[18px] [&::-moz-range-thumb]:rounded-full",
            "[&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-ink-950 [&::-moz-range-thumb]:bg-violet-400",
          )}
        />
      </span>
      {marker || hint ? (
        <span className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px] text-mist-600">
          {marker ? (
            <span>
              <span aria-hidden="true" className="mr-1 inline-block h-2.5 w-px translate-y-[1px] bg-mist-400/70" />
              {marker.label}
            </span>
          ) : (
            <span />
          )}
          {hint ? <span className="text-mist-500">{hint}</span> : null}
        </span>
      ) : null}
    </label>
  );
}
