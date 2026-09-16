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
  className,
}: {
  label: string;
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: (value: number) => void;
  display?: string;
  className?: string;
}) {
  return (
    <label className={cn("block space-y-2.5", className)}>
      <span className="flex items-center justify-between gap-3 text-sm">
        <span className="text-mist-300">{label}</span>
        <span className="font-display text-sm font-semibold tabular-nums text-mist-50">{display ?? value}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className={cn(
          "h-2 w-full cursor-pointer appearance-none rounded-full bg-white/[0.08]",
          "[&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none",
          "[&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-violet-500",
          "[&::-webkit-slider-thumb]:shadow-[0_0_0_5px_rgba(132,114,251,0.22)]",
          "[&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full",
          "[&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-violet-500",
        )}
      />
    </label>
  );
}
