"use client";

import { useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

export type OrbState = "off" | "idle" | "hearing" | "thinking" | "speaking" | "done";

const CONFIGS: Record<
  OrbState,
  { blob: number; drift: number; pulse: number; amplitude: number; glow: string; off?: boolean; done?: boolean }
> = {
  off: { blob: 14, drift: 30, pulse: 8, amplitude: 0.01, glow: "bg-white/[0.04]", off: true },
  idle: { blob: 11, drift: 19, pulse: 4.4, amplitude: 0.035, glow: "bg-[#4b8fe4]/25" },
  hearing: { blob: 5, drift: 8.5, pulse: 1.7, amplitude: 0.075, glow: "bg-[#5ba0f0]/45" },
  thinking: { blob: 9, drift: 15, pulse: 3.4, amplitude: 0.025, glow: "bg-[#4b8fe4]/30" },
  speaking: { blob: 4.4, drift: 7, pulse: 1, amplitude: 0.085, glow: "bg-[#5ba0f0]/40" },
  done: { blob: 12, drift: 21, pulse: 5.2, amplitude: 0.025, glow: "bg-teal-400/25", done: true },
};

export function VoiceOrb({
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
  const config = CONFIGS[state];
  const active = state === "hearing" || state === "speaking";
  const showRipples = state === "idle" || active;
  const orbRef = useRef<HTMLDivElement | null>(null);
  const levelSmoothRef = useRef(0);

  useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const tick = () => {
      const node = orbRef.current;
      if (node) {
        const target = levelRef ? Math.min(1, levelRef.current) : 0;
        levelSmoothRef.current += (target - levelSmoothRef.current) * 0.16;
        node.style.setProperty("--orb-level", levelSmoothRef.current.toFixed(3));
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce, levelRef]);

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
    <div className={cn("relative flex h-[244px] w-[244px] items-center justify-center", className)}>
      <motion.span
        aria-hidden="true"
        className={cn("pointer-events-none absolute h-[180px] w-[180px] rounded-full blur-[58px]", config.glow)}
        animate={
          reduce
            ? undefined
            : { scale: [1, 1 + config.amplitude * 2.4, 1], opacity: active ? [0.9, 1, 0.9] : [0.6, 0.85, 0.6] }
        }
        transition={{ duration: config.pulse, repeat: Infinity, ease: "easeInOut" }}
      />

      {showRipples && !reduce
        ? [0, 1, 2].map((index) => (
            <span
              key={index}
              aria-hidden="true"
              className={cn(
                "pointer-events-none absolute h-[168px] w-[168px] rounded-full border animate-orb-ripple",
                active ? "border-[#7fb8f0]/45" : "border-[#5f9cec]/25",
              )}
              style={{
                animationDuration: active ? "1.9s" : "3.2s",
                animationDelay: `${index * (active ? 0.63 : 1.05)}s`,
              }}
            />
          ))
        : null}

      {state === "thinking" && !reduce ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute h-[204px] w-[204px] rounded-full animate-orb-spin"
          style={{
            background: "conic-gradient(from 0deg, transparent 0 58%, rgba(176, 214, 252, 0.9) 100%)",
            WebkitMask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))",
            mask: "radial-gradient(farthest-side, transparent calc(100% - 2px), #000 calc(100% - 1.5px))",
            animationDuration: "1.7s",
          }}
        />
      ) : null}

      <motion.button
        type="button"
        onClick={onClick}
        aria-label={label}
        className="relative h-[164px] w-[164px] cursor-pointer outline-none"
        animate={reduce ? undefined : { scale: [1, 1 + config.amplitude, 1] }}
        transition={{ duration: config.pulse, repeat: Infinity, ease: "easeInOut" }}
      >
        <div
          ref={orbRef}
          className="absolute inset-0 animate-orb-blob overflow-hidden will-change-transform"
          style={{
            animationDuration: `${config.blob}s`,
            transform: "scale(calc(1 + var(--orb-level, 0) * 0.07))",
            boxShadow: config.done
              ? "0 30px 90px -40px rgba(134, 201, 168, 0.6)"
              : "0 30px 90px -40px rgba(95, 156, 236, 0.6)",
          }}
        >
          <span
            className="absolute inset-0"
            style={{
              background: config.off
                ? "radial-gradient(120% 120% at 34% 26%, #6a7484 0%, #4b5566 42%, #2f3846 76%, #20262f 100%)"
                : config.done
                  ? "radial-gradient(120% 120% at 34% 26%, #c9f0dc 0%, #8ed7b4 40%, #4fae83 74%, #2c7355 100%)"
                  : "radial-gradient(120% 120% at 34% 26%, #a8cffa 0%, #5f9cec 38%, #3672c6 72%, #1e4f92 100%)",
            }}
          />

          {!config.off ? (
            <>
              <span
                className="absolute left-[-16%] top-[-14%] h-[74%] w-[74%] rounded-full animate-orb-drift-a"
                style={{
                  background: config.done
                    ? "radial-gradient(closest-side, rgba(255,255,255,0.72), rgba(255,255,255,0.06) 62%, transparent 74%)"
                    : "radial-gradient(closest-side, rgba(206, 233, 255, 0.95), rgba(206, 233, 255, 0.08) 62%, transparent 74%)",
                  animationDuration: `${config.drift}s`,
                }}
              />
              <span
                className="absolute bottom-[-20%] right-[-14%] h-[80%] w-[80%] rounded-full animate-orb-drift-b"
                style={{
                  background: config.done
                    ? "radial-gradient(closest-side, rgba(30, 105, 72, 0.6), transparent 72%)"
                    : "radial-gradient(closest-side, rgba(18, 62, 126, 0.75), transparent 72%)",
                  animationDuration: `${config.drift * 1.18}s`,
                }}
              />
              <span
                className="absolute left-[26%] top-[34%] h-[54%] w-[54%] rounded-full animate-orb-drift-c"
                style={{
                  background: config.done
                    ? "radial-gradient(closest-side, rgba(232, 255, 243, 0.85), transparent 70%)"
                    : "radial-gradient(closest-side, rgba(243, 250, 255, 0.92), transparent 70%)",
                  animationDuration: `${config.drift * 1.4}s`,
                }}
              />
            </>
          ) : null}

          <span
            className="absolute inset-0"
            style={{ background: "radial-gradient(58% 46% at 32% 22%, rgba(255, 255, 255, 0.55), transparent 68%)" }}
          />
          <span
            className="absolute inset-0"
            style={{
              boxShadow: "inset 0 -30px 52px rgba(4, 16, 36, 0.42), inset 0 3px 4px rgba(255, 255, 255, 0.5)",
            }}
          />
        </div>
      </motion.button>
    </div>
  );
}
