"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type OrbState = "off" | "idle" | "hearing" | "thinking" | "speaking" | "done";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const MORPH = 0.6;

/** Один и тот же шар во всех состояниях: меняется только его геометрия и цвет. */
const SOLID: Record<OrbState, string> = {
  off: "#5d6675",
  idle: "#7cb6f2",
  hearing: "#8fc6f9",
  thinking: "#74b0f0",
  speaking: "#9ed0ff",
  done: "#9ad9ba",
};

const GLOSS =
  "radial-gradient(120% 120% at 32% 26%, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0.14) 44%, rgba(255,255,255,0) 62%)";
const DOT_SHADOW =
  "inset 0 2px 3px rgba(255,255,255,0.5), inset 0 -7px 14px rgba(6,20,40,0.32), 0 14px 34px -14px rgba(95,156,236,0.6)";

const FACTORS = [1, 0.78, 0.92];

/** Геометрия шара в каждом состоянии — отсюда начинается и заканчивается морфинг. */
function geometry(state: OrbState, index: number) {
  if (state === "thinking") {
    const angle = (index * 120 * Math.PI) / 180;
    return { x: Math.cos(angle) * 36, y: Math.sin(angle) * 36, w: 30, h: 30 };
  }
  if (state === "speaking") {
    return { x: (index - 1) * 24, y: 0, w: 10, h: 40 };
  }
  return { x: (index - 1) * 54, y: 0, w: 34, h: 34 };
}

export function VoiceDots({
  state,
  onClick,
  levelRef,
  className,
}: {
  state: OrbState;
  onClick?: () => void;
  levelRef?: React.MutableRefObject<number>;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const shellRef = useRef<HTMLButtonElement | null>(null);
  const level = useRef(0);
  const paintedLevel = useRef(-1);

  useEffect(() => {
    if (reduce || (state !== "hearing" && state !== "speaking")) return;
    let raf = 0;
    const tick = () => {
      const node = shellRef.current;
      if (node) {
        const target = levelRef ? Math.min(1, levelRef.current) : 0;
        level.current += (target - level.current) * 0.24;
        // Перерисовываем масштаб только когда уровень заметно изменился:
        // живой отклик без 60 style-мутаций в секунду.
        if (Math.abs(level.current - paintedLevel.current) > 0.012) {
          paintedLevel.current = level.current;
          node.style.setProperty("--lvl", level.current.toFixed(3));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      shellRef.current?.style.setProperty("--lvl", "0");
    };
  }, [reduce, levelRef, state]);

  const label =
    state === "off"
      ? "Включить микрофон"
      : state === "hearing"
        ? "Слушаю"
        : state === "speaking"
          ? "Говорю"
          : state === "thinking"
            ? "Думаю"
            : state === "done"
              ? "Интервью завершено"
              : "Микрофон включён";

  const thinking = state === "thinking" && !reduce;
  const calm = state === "off" || state === "idle" || state === "done";

  return (
    <button
      ref={shellRef}
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn("relative flex h-[168px] w-full cursor-pointer items-center justify-center outline-none", className)}
    >
      <AnimatePresence>
        {state === "hearing" ? (
          <motion.span
            key="ripples"
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="pointer-events-none absolute left-1/2 top-1/2 block"
          >
            <span
              className="absolute -ml-[60px] -mt-[60px] block h-[120px] w-[120px] rounded-full border border-[#8cc5f5]/40"
              style={{
                transform: "scale(calc(0.94 + var(--lvl, 0) * 0.55))",
                opacity: "calc(0.1 + var(--lvl, 0) * 0.55)",
              }}
            />
            <span
              className="absolute -ml-[82px] -mt-[82px] block h-[164px] w-[164px] rounded-full border border-[#8cc5f5]/25"
              style={{
                transform: "scale(calc(0.9 + var(--lvl, 0) * 0.7))",
                opacity: "calc(0.06 + var(--lvl, 0) * 0.4)",
              }}
            />
          </motion.span>
        ) : null}
      </AnimatePresence>

      <motion.span
        className="relative block h-[176px] w-[176px]"
        animate={{ rotate: thinking ? 360 : 0 }}
        transition={thinking ? { repeat: Infinity, duration: 2.9, ease: "linear" } : { duration: MORPH, ease: EASE }}
      >
        {[0, 1, 2].map((index) => {
          const target = geometry(state, index);
          const factor = FACTORS[index];
          const levelTransform =
            state === "hearing"
              ? `translateY(calc(var(--lvl, 0) * ${-30 * factor}px)) scale(calc(1 + var(--lvl, 0) * ${0.52 * factor}))`
              : state === "speaking"
                ? `scaleY(calc(0.28 + var(--lvl, 0) * ${factor}))`
                : undefined;

          return (
            <motion.span
              key={index}
              className="absolute left-1/2 top-1/2 block"
              initial={false}
              animate={{
                x: target.x,
                y: target.y,
                width: target.w,
                height: target.h,
                marginLeft: -target.w / 2,
                marginTop: -target.h / 2,
              }}
              transition={{ duration: reduce ? 0 : MORPH, ease: EASE }}
            >
              <motion.span
                className={cn("block h-full w-full rounded-full will-change-transform", calm && "animate-breathe")}
                style={{
                  backgroundImage: GLOSS,
                  boxShadow: DOT_SHADOW,
                  transform: levelTransform,
                  animationDelay: calm ? `${index * 0.22}s` : undefined,
                  animationDuration: state === "off" ? "3.8s" : state === "done" ? "2.6s" : undefined,
                }}
                animate={{ backgroundColor: SOLID[state] }}
                transition={{ duration: reduce ? 0 : MORPH, ease: EASE }}
              />
            </motion.span>
          );
        })}
      </motion.span>
    </button>
  );
}
