"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

const CAMPUSES = [
  { image: "warsaw-tech-full", photo: "warsaw-tech", name: "Warsaw University of Technology", city: "Варшава, Польша", color: "#493b2c" },
  { image: "aalto", photo: "aalto", name: "Aalto University", city: "Эспоо, Финляндия", color: "#35414a" },
  { image: "charles", photo: "charles", name: "Charles University", city: "Прага, Чехия", color: "#413632" },
  { image: "upc", photo: "upc", name: "UPC Barcelona", city: "Барселона, Испания", color: "#454033" },
  { image: "warsaw-uni", photo: "warsaw-uni", name: "University of Warsaw", city: "Варшава, Польша", color: "#35404a" },
];

const CUTOUT_MASK = "linear-gradient(to bottom, #000 72%, transparent 99%)";

export function CampusField() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const campus = CAMPUSES[index];

  useEffect(() => {
    if (reduce) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % CAMPUSES.length), 8000);
    return () => window.clearInterval(timer);
  }, [reduce]);

  return (
    <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
      <div className="absolute inset-0 bg-ink-950" />

      <AnimatePresence initial={false}>
        <motion.div
          key={`bg-${campus.image}`}
          className="absolute inset-0 overflow-hidden"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.15, ease: "easeInOut" }}
        >
          <Image
            src={`/campuses/${campus.photo}.jpg`}
            alt=""
            fill
            sizes="100vw"
            className="scale-110 object-cover opacity-[0.28] blur-[18px] saturate-[0.65]"
            priority={index === 0}
          />
          <div
            className="absolute inset-0"
            style={{ background: `radial-gradient(ellipse 70% 50% at 50% 65%, ${campus.color}88 0%, transparent 82%)` }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-950/25 to-ink-950" />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence initial={false}>
        <motion.div
          key={campus.image}
          initial={reduce ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 1.15, ease: "easeInOut" }}
          className="absolute inset-0"
        >
          <div className="absolute inset-x-[-6%] bottom-[5%] top-[19%] sm:inset-x-[-2%] sm:bottom-[5%] sm:top-[21%] lg:bottom-[6%] lg:left-[24%] lg:right-[-4%] lg:top-[12%]">
            <Image
              src={`/campuses/cutouts/${campus.image}.webp`}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 84vw"
              className="object-contain object-bottom opacity-90 saturate-[0.85]"
              style={{ maskImage: CUTOUT_MASK, WebkitMaskImage: CUTOUT_MASK }}
              priority={index === 0}
            />
          </div>

          <div className="absolute inset-0 bg-[radial-gradient(62%_48%_at_84%_16%,rgba(6,7,10,0.78),transparent_74%)]" />

          <div className="absolute right-[5%] top-[9%] hidden max-w-[min(620px,54vw)] text-right lg:block xl:top-[13%]">
            <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-white/50">{campus.city}</p>
            <p className="mt-2.5 font-display text-[28px] font-medium leading-[1.08] tracking-[-0.045em] text-white/90 drop-shadow-[0_2px_20px_rgba(6,7,10,0.8)] xl:text-[34px]">
              {campus.name}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-ink-950 via-ink-950/70 to-transparent" />

      <div className="absolute bottom-5 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1.5 lg:bottom-8 lg:left-auto lg:right-8 lg:translate-x-0">
        {CAMPUSES.map((item, step) => (
          <span
            key={item.image}
            className={cn(
              "h-[3px] rounded-full transition-all duration-500",
              step === index ? "w-7 bg-white/80" : "w-3 bg-white/25",
            )}
          />
        ))}
      </div>
    </div>
  );
}
