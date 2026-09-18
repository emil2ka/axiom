"use client";

import { AnimatePresence, motion } from "framer-motion";

export interface MemoryFlight {
  id: string;
  word: string;
  from: { x: number; y: number };
  to: { x: number; y: number };
  delay: number;
}

const BALL = 22;
const TOTAL = 1.9;
const EASE = [0.42, 0.05, 0.22, 1] as const;

/**
 * Слово превращается в шарик, шарик медленно летит по дуге и снова
 * превращается в слово — уже в памяти.
 */
export function MemoryFlightLayer({
  flights,
  onLanded,
}: {
  flights: MemoryFlight[];
  onLanded: (id: string) => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-0 z-[60]" aria-hidden="true">
      <AnimatePresence>
        {flights.map((item) => {
          const { x: x0, y: y0 } = item.from;
          const { x: x1, y: y1 } = item.to;
          const arcY = Math.min(y0, y1) - 90;
          const delay = item.delay / 1000;

          return (
            <motion.span
              key={item.id}
              className="absolute left-0 top-0 block will-change-transform"
              initial={{ x: x0, y: y0 }}
              animate={{ x: [x0, x0, (x0 + x1) / 2, x1], y: [y0, y0, arcY, y1] }}
              transition={{ duration: TOTAL, delay, times: [0, 0.26, 0.62, 1], ease: EASE }}
              onAnimationComplete={() => onLanded(item.id)}
            >
              <span className="absolute left-0 top-0 block">
                <motion.span
                  className="absolute left-0 top-0 whitespace-nowrap text-[15px] font-medium"
                  style={{ color: "#b3dafb" }}
                  initial={{ x: "-50%", y: "-50%", opacity: 0, scale: 0.96, filter: "blur(4px)" }}
                  animate={{
                    x: "-50%",
                    y: "-50%",
                    opacity: [0, 1, 0, 0],
                    scale: [0.96, 1, 0.45, 0.45],
                    filter: ["blur(4px)", "blur(0px)", "blur(7px)", "blur(7px)"],
                  }}
                  transition={{ duration: TOTAL, delay, times: [0, 0.1, 0.3, 1], ease: "easeInOut" }}
                >
                  {item.word}
                </motion.span>

                <motion.span
                  className="absolute left-0 top-0 block rounded-full"
                  style={{
                    width: BALL,
                    height: BALL,
                    background: "radial-gradient(120% 120% at 32% 26%, #d7ebff 0%, #7cb6f2 45%, #3a76c8 100%)",
                    boxShadow:
                      "inset 0 1px 2px rgba(255,255,255,0.6), 0 0 24px rgba(124,182,242,0.55), 0 0 60px rgba(124,182,242,0.22)",
                  }}
                  initial={{ x: -BALL / 2, y: -BALL / 2, opacity: 0, scale: 0.2 }}
                  animate={{
                    x: -BALL / 2,
                    y: -BALL / 2,
                    opacity: [0, 0, 1, 1, 0],
                    scale: [0.2, 0.2, 1.18, 1, 0.25],
                  }}
                  transition={{ duration: TOTAL, delay, times: [0, 0.28, 0.42, 0.82, 1], ease: "easeInOut" }}
                />
              </span>
            </motion.span>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
