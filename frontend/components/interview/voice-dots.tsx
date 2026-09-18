"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type OrbState = "off" | "idle" | "hearing" | "thinking" | "speaking" | "done";

const BASES: Record<OrbState, string> = {
  off: "radial-gradient(120% 120% at 32% 26%, #98a1b0 0%, #5d6675 45%, #39404c 100%)",
  idle: "radial-gradient(120% 120% at 32% 26%, #d7ebff 0%, #7cb6f2 45%, #3a76c8 100%)",
  hearing: "radial-gradient(120% 120% at 32% 26%, #e2f1ff 0%, #86c0f7 45%, #3f7ed0 100%)",
  thinking: "radial-gradient(120% 120% at 32% 26%, #cfe6ff 0%, #74b0f0 45%, #3a76c8 100%)",
  speaking: "radial-gradient(120% 120% at 32% 26%, #e2f1ff 0%, #8cc5f8 45%, #3f7ed0 100%)",
  done: "radial-gradient(120% 120% at 32% 26%, #e2f7ec 0%, #9ad9ba 45%, #4fae83 100%)",
};

const DOT_STYLE = (state: OrbState) => ({
  background: BASES[state],
  boxShadow:
    "inset 0 2px 3px rgba(255, 255, 255, 0.5), inset 0 -7px 14px rgba(6, 20, 40, 0.32), 0 14px 34px -14px rgba(95, 156, 236, 0.6)",
});

function OrbitDots({ state }: { state: OrbState }) {
  const reduce = useReducedMotion();
  const radius = 36;
  return (
    <motion.span
      className="relative block h-[124px] w-[124px]"
      animate={reduce ? undefined : { rotate: 360 }}
      transition={{ duration: 2.9, repeat: Infinity, ease: "linear" }}
    >
      {[0, 1, 2].map((index) => (
        <span key={index} className="absolute left-1/2 top-1/2">
          <span
            className="absolute block h-[30px] w-[30px] rounded-full"
            style={{
              ...DOT_STYLE(state),
              transform: `translate(-50%, -50%) rotate(${index * 120}deg) translateY(-${radius}px)`,
            }}
          />
        </span>
      ))}
    </motion.span>
  );
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
    if (reduce || state !== "hearing") return;
    let raf = 0;
    const tick = () => {
      const node = shellRef.current;
      if (node) {
        const target = levelRef ? Math.min(1, levelRef.current) : 0;
        level.current += (target - level.current) * 0.2;
        // Перерисовываем масштаб только когда уровень заметно изменился.
        // Это оставляет живой отклик микрофона без 60 style-мутаций в секунду.
        if (Math.abs(level.current - paintedLevel.current) > 0.018) {
          paintedLevel.current = level.current;
          node.style.setProperty("--lvl", level.current.toFixed(2));
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
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

  return (
    <button
      ref={shellRef}
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "relative flex h-[168px] w-full cursor-pointer items-center justify-center outline-none",
        state === "off" && "cursor-pointer",
        className,
      )}
    >
      {state === "thinking" ? (
        <OrbitDots state={state} />
      ) : state === "hearing" ? (
        <span className="flex items-end gap-5">
          {[1, 0.78, 0.92].map((factor, index) => (
            <span
              key={index}
              className="block h-[34px] w-[34px] rounded-full will-change-transform"
              style={{
                ...DOT_STYLE(state),
                transform: `translateY(calc(var(--lvl, 0) * ${-16 * factor}px)) scale(calc(1 + var(--lvl, 0) * ${
                  0.3 * factor
                }))`,
              }}
            />
          ))}
        </span>
      ) : state === "speaking" ? (
        <span className="flex items-end gap-5">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="block h-[34px] w-[34px] rounded-full"
              style={DOT_STYLE(state)}
              animate={reduce ? undefined : { y: [0, -14, 0], scaleY: [1, 1.16, 1] }}
              transition={{ duration: 0.72, repeat: Infinity, ease: "easeInOut", delay: index * 0.13 }}
            />
          ))}
        </span>
      ) : (
        <span className="flex items-center gap-5">
          {[0, 1, 2].map((index) => (
            <motion.span
              key={index}
              className="block h-[34px] w-[34px] rounded-full"
              style={DOT_STYLE(state)}
              animate={
                reduce
                  ? undefined
                  : state === "done"
                    ? { scale: [1, 1.09, 1] }
                    : { y: [0, state === "off" ? -3 : -9, 0], scale: [1, state === "off" ? 1.02 : 1.08, 1] }
              }
              transition={{
                duration: state === "off" ? 3.8 : state === "done" ? 2.6 : 2.2,
                repeat: Infinity,
                ease: "easeInOut",
                delay: index * 0.22,
              }}
            />
          ))}
        </span>
      )}
    </button>
  );
}
