"use client";

import { motion, useReducedMotion } from "framer-motion";
import { scoreTone } from "@/components/ui/fit";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;
const RING_STROKE = {
  strong: "stroke-teal-400",
  good: "stroke-violet-400",
  moderate: "stroke-amber-400",
  weak: "stroke-rose-400",
} as const;

/** Кольцо соответствия: дуга дорисовывается при появлении. */
export function ScoreRing({
  score,
  size = 54,
  strokeWidth = 3,
  delay = 0,
  className,
}: {
  score: number;
  size?: number;
  strokeWidth?: number;
  delay?: number;
  className?: string;
}) {
  const reduce = useReducedMotion() ?? false;
  const radius = (size - strokeWidth * 2) / 2;
  const circumference = 2 * Math.PI * radius;
  const filled = circumference * (Math.max(0, Math.min(100, score)) / 100);
  const tone = scoreTone(score);

  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-white/[0.08]"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={RING_STROKE[tone.key]}
          strokeDasharray={circumference}
          initial={reduce ? false : { strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - filled }}
          transition={{ duration: 1, ease: EASE, delay }}
        />
      </svg>
      <span className={cn("absolute font-display font-medium tnum", size >= 60 ? "text-[17px]" : "text-[15px]", tone.text)}>
        {Math.round(score)}
      </span>
    </span>
  );
}
