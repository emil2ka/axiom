"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { IconRefresh } from "@/components/icons";

const PHRASE = "Хочу Европу и бюджет до $15k, IELTS 6.0, интересы — IT и программирование.";
const MARKS = ["Европу", "$15k", "6.0", "IT и программирование"];

const FACTS = [
  { label: "Страна", value: "Европа" },
  { label: "Бюджет", value: "до $15 000" },
  { label: "IELTS", value: "6.0" },
  { label: "Интересы", value: "IT и программирование" },
];

type Segment = { text: string; mark: boolean; start: number };

function buildSegments(): Segment[] {
  const out: Segment[] = [];
  let cursor = 0;
  for (const word of MARKS) {
    const pos = PHRASE.indexOf(word, cursor);
    if (pos === -1) continue;
    if (pos > cursor) out.push({ text: PHRASE.slice(cursor, pos), mark: false, start: cursor });
    out.push({ text: word, mark: true, start: pos });
    cursor = pos + word.length;
  }
  if (cursor < PHRASE.length) out.push({ text: PHRASE.slice(cursor), mark: false, start: cursor });
  return out;
}

export function HeroMemory({ instant = false }: { instant?: boolean }) {
  const segments = useMemo(buildSegments, []);
  const sectionRef = useRef<HTMLDivElement>(null);
  const markRefs = useRef<(HTMLElement | null)[]>([]);
  const factRefs = useRef<(HTMLElement | null)[]>([]);
  const launchedRef = useRef(new Set<number>());
  const [visible, setVisible] = useState(instant);
  const [flights, setFlights] = useState<{ index: number; x: number; y: number; dx: number; dy: number }[]>([]);
  const [chars, setChars] = useState(instant ? PHRASE.length : 0);
  const [marks, setMarks] = useState(instant ? MARKS.length : 0);
  const [facts, setFacts] = useState(instant ? FACTS.length : 0);
  const [runId, setRunId] = useState(0);

  useEffect(() => {
    if (instant || visible || !sectionRef.current) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisible(true);
    }, { threshold: 0.35 });
    observer.observe(sectionRef.current);
    return () => observer.disconnect();
  }, [instant, visible]);

  useEffect(() => {
    if (!visible && !instant) return;
    const reduce =
      instant ||
      (typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

    if (reduce) {
      setChars(PHRASE.length);
      setMarks(MARKS.length);
      setFacts(FACTS.length);
      return;
    }

    setChars(0);
    setMarks(0);
    setFacts(0);
    setFlights([]);
    launchedRef.current.clear();

    const typeStart = 400;
    const perChar = 15;
    const typedAt = typeStart + PHRASE.length * perChar;
    const markedAt = typedAt + 200 + MARKS.length * 150;
    const started = performance.now();
    const timer = window.setInterval(() => {
      const elapsed = performance.now() - started;
      setChars(Math.min(PHRASE.length, Math.max(0, Math.floor((elapsed - typeStart) / perChar))));
      setMarks(Math.min(MARKS.length, Math.max(0, Math.floor((elapsed - typedAt - 200) / 150))));
      for (let index = 0; index < FACTS.length; index++) {
        const launchAt = markedAt + 240 + index * 350;
        if (elapsed < launchAt || launchedRef.current.has(index)) continue;
        const from = markRefs.current[index]?.getBoundingClientRect();
        const to = factRefs.current[index]?.getBoundingClientRect();
        if (from && to) {
          setFlights((current) => [...current, { index, x: from.left, y: from.top, dx: to.left - from.left, dy: to.top - from.top }]);
        }
        launchedRef.current.add(index);
      }
      const nextFacts = Math.min(FACTS.length, Math.max(0, Math.floor((elapsed - markedAt - 890) / 350) + 1));
      setFacts(nextFacts);
      setFlights((current) => current.some((flight) => elapsed >= markedAt + 240 + flight.index * 350 + 780)
        ? current.filter((flight) => elapsed < markedAt + 240 + flight.index * 350 + 780)
        : current);
      if (nextFacts === FACTS.length && elapsed > markedAt + 240 + FACTS.length * 350 + 780) window.clearInterval(timer);
    }, 32);

    return () => window.clearInterval(timer);
  }, [runId, instant, visible]);

  const typing = chars < PHRASE.length;

  return (
    <div ref={sectionRef} className="card p-5 sm:p-6">
      {flights.map((flight) => (
        <motion.span
          key={`${runId}-${flight.index}`}
          aria-hidden="true"
          className="pointer-events-none fixed z-[60] rounded-full bg-[#182a3b] px-2.5 py-1 text-xs text-[#b8d9fa] shadow-lg"
          style={{ left: flight.x, top: flight.y }}
          initial={{ opacity: 0, x: 0, y: 0, scale: 0.85 }}
          animate={{ opacity: [0, 1, 1, 0], x: flight.dx, y: flight.dy, scale: [0.85, 1, 1, 0.85] }}
          transition={{ duration: 0.76, ease: [0.22, 1, 0.36, 1] }}
        >
          {MARKS[flight.index]}
        </motion.span>
      ))}
      <div className="flex items-center justify-between">
        <p className="eyebrow">Память · живой профиль</p>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-mist-500">
            <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
            live
          </span>
          <button
            type="button"
            aria-label="Повторить"
            className="rounded-md p-1 text-mist-600 transition-colors hover:text-mist-300"
            onClick={() => setRunId((value) => value + 1)}
          >
            <IconRefresh className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <p className="mt-5 min-h-[104px] font-display text-[17px] leading-[1.65] text-mist-100 sm:text-[19px]">
        {segments.map((segment, index) => {
          const visible = chars - segment.start;
          if (visible <= 0) return null;
          const text = visible >= segment.text.length ? segment.text : segment.text.slice(0, visible);
          const markIndex = segment.mark ? MARKS.indexOf(segment.text) : -1;
          const lit = segment.mark && marks > markIndex;
          return (
            <span key={index}>
              {lit ? <mark ref={(node) => { markRefs.current[markIndex] = node; }} className="hl text-inherit">{text}</mark> : text}
            </span>
          );
        })}
        {typing ? (
          <span
            aria-hidden="true"
            className="ml-0.5 inline-block h-[1.05em] w-[2px] translate-y-[3px] bg-violet-400"
            style={{ animation: "caret-blink 1s steps(1) infinite" }}
          />
        ) : null}
      </p>

      <div className="mt-5 border-t border-line-soft pt-5">
        <ul className="grid grid-cols-2 gap-x-4 gap-y-4">
          {FACTS.map((fact, index) => (
            <li
              key={fact.label}
              ref={(node) => { factRefs.current[index] = node; }}
              className={cn(
                "border-l pl-3 transition-all duration-500 ease-out",
                facts > index ? "translate-y-0 border-line opacity-100" : "translate-y-1.5 border-transparent opacity-0",
              )}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-mist-500">{fact.label}</p>
              <p className="mt-1 text-[13px] text-mist-100">{fact.value}</p>
            </li>
          ))}
        </ul>
      </div>

      <div
        className={cn(
          "mt-5 flex items-center justify-between border-t border-line-soft pt-5 transition-opacity duration-500",
          facts >= FACTS.length ? "opacity-100" : "opacity-0",
        )}
      >
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-mist-500">Топ-рекомендация</p>
          <p className="mt-1 font-display text-[15px] text-mist-50">
            Budapest University of Technology and Economics
          </p>
          <p className="mt-0.5 text-[12px] text-mist-400">$13 200/год · стипендия Stipendium Hungaricum</p>
        </div>
        <div className="shrink-0 pl-4 text-right">
          <p className="font-display text-[26px] leading-none tabular-nums text-violet-400">99</p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-mist-500">соответствие</p>
        </div>
      </div>
    </div>
  );
}
