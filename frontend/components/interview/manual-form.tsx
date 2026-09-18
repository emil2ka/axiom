"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { IconArrowRight } from "@/components/icons";
import { FIELD_LABELS, extractFacts, reconcileEnrichment, reparseFactValue, selectNextQuestion } from "@/lib/shared/engine";
import type { InterviewQuestion, MemoryFact } from "@/lib/shared/engine";
import { extractFactsSmart } from "@/lib/api";
import { llmExtract, voiceEnabled, type ExtractedFact } from "@/lib/voice-api";
import { useAxiomStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const AI_FIELDS = new Set([
  "name",
  "grade",
  "country",
  "budget",
  "ielts",
  "gpa",
  "interests",
  "intake",
  "priority",
  "language",
  "constraints",
]);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function normalizeKey(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/^[«"']+|[»"']+$/g, "")
    .replace(/[.,;:!?]+$/g, "")
    .replace(/\s+/g, " ");
}

function uniqueFacts(facts: MemoryFact[]): MemoryFact[] {
  const seen = new Set<string>();
  return facts.filter((fact) => {
    const key = `${fact.field}:${normalizeKey(fact.value)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function factFromLlm(item: ExtractedFact): MemoryFact | null {
  if (!AI_FIELDS.has(item.field)) return null;
  const field = item.field as MemoryFact["field"];
  const parsed = reparseFactValue(field, item.value.trim());
  if (!parsed) return null;
  return {
    id: `ai-${field}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    field,
    label: FIELD_LABELS[field],
    value: parsed.value,
    display: parsed.display,
    quote: item.quote || parsed.value,
    confidence: 0.96,
    numeric: parsed.numeric,
    source: "text",
    createdAt: Date.now(),
  };
}

const DOT_STYLE = {
  background: "radial-gradient(120% 120% at 32% 26%, #d7ebff 0%, #7cb6f2 45%, #3a76c8 100%)",
  boxShadow:
    "inset 0 2px 3px rgba(255, 255, 255, 0.5), inset 0 -7px 14px rgba(6, 20, 40, 0.32), 0 14px 34px -14px rgba(95, 156, 236, 0.6)",
};

/** Три точки, которые перекрещиваются в центре. */
function CrossingDots() {
  const reduce = useReducedMotion();
  const paths = [
    { axis: "x", from: -26, to: 26, delay: 0 },
    { axis: "x", from: 26, to: -26, delay: 0 },
    { axis: "y", from: -20, to: 20, delay: 0.25 },
  ];
  return (
    <span className="relative flex h-24 w-24 items-center justify-center" aria-hidden="true">
      {paths.map((path, index) => (
        <motion.span
          key={index}
          className="absolute block h-[13px] w-[13px] rounded-full"
          style={DOT_STYLE}
          animate={
            reduce
              ? undefined
              : path.axis === "x"
                ? { x: [path.from, path.to, path.from], scale: [0.82, 1, 0.82], opacity: [0.55, 1, 0.55] }
                : { y: [path.from, path.to, path.from], scale: [0.82, 1, 0.82], opacity: [0.55, 1, 0.55] }
          }
          transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut", delay: path.delay }}
        />
      ))}
    </span>
  );
}

function MemoryColumn({ facts, compact = false }: { facts: MemoryFact[]; compact?: boolean }) {
  if (compact) {
    const latest = facts.slice(-3);
    return (
      <div className="mb-8 flex min-h-5 flex-wrap items-center gap-x-2.5 gap-y-1 text-[11px] text-mist-500 lg:hidden">
        <span className="uppercase tracking-[0.16em] text-mist-600">Память</span>
        {latest.length ? (
          latest.map((fact) => (
            <span key={fact.id} className="text-mist-300">
              {fact.display}
            </span>
          ))
        ) : (
          <span className="text-mist-600">пока пусто</span>
        )}
      </div>
    );
  }

  return (
    <aside className="absolute left-0 top-0 hidden w-56 lg:block" aria-label="Память AXIOM">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <p className="text-[11px] uppercase tracking-[0.18em] text-mist-400">Память</p>
        <span className="text-[11px] tnum text-mist-600">{facts.length}</span>
      </div>
      {facts.length ? (
        <ul className="divide-y divide-white/[0.05]">
          <AnimatePresence initial={false}>
            {facts.map((fact) => (
              <motion.li
                key={fact.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <span className="shrink-0 text-[10px] uppercase tracking-[0.16em] text-mist-600">{fact.label}</span>
                <span className="truncate text-right text-[12.5px] text-mist-200">{fact.display}</span>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      ) : (
        <p className="pt-3 text-[11.5px] text-mist-600">пока пусто</p>
      )}
    </aside>
  );
}

export function ManualForm() {
  const router = useRouter();
  const memories = useAxiomStore((state) => state.memories);
  const answeredIds = useAxiomStore((state) => state.answeredQuestionIds);
  const addFacts = useAxiomStore((state) => state.addFacts);
  const markAnswered = useAxiomStore((state) => state.markAnswered);
  const reduce = useReducedMotion();

  const [stage, setStage] = useState<"input" | "thinking">("input");
  const [draft, setDraft] = useState("");
  const [question, setQuestion] = useState<InterviewQuestion | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  useEffect(() => {
    // Профиль уже начат — продолжаем с вопроса движка, а не с чистого листа.
    const state = useAxiomStore.getState();
    const next = selectNextQuestion(state.memories, state.answeredQuestionIds);
    if (state.memories.length >= 3 && next.question) setQuestion(next.question);
  }, []);

  const label = question ? question.text : "Опиши себя";
  const placeholder = question?.placeholder ?? "Например: 11 класс, Европа, бюджет до $15k, IELTS 6.0, IT";

  const submit = async () => {
    const text = draft.trim();
    if (!text || stage === "thinking") return;
    const current = question;
    setDraft("");
    setNotice(null);
    setStage("thinking");
    const started = Date.now();
    try {
      const known = memories.map((item) => ({ label: item.label, value: item.display }));
      const local = extractFacts(text, { source: "text" });
      const [rulesResult, llmRaw] = await Promise.all([
        Promise.race([
          extractFactsSmart(text, "text").catch(() => ({ facts: local, engine: "rules" as const })),
          delay(8000).then(() => ({ facts: local, engine: "rules" as const })),
        ]),
        voiceEnabled
          ? Promise.race([
              llmExtract(text, current?.text ?? null, known).catch(() => [] as ExtractedFact[]),
              delay(9000).then(() => [] as ExtractedFact[]),
            ])
          : Promise.resolve([] as ExtractedFact[]),
      ]);
      const llmFacts = llmRaw.map(factFromLlm).filter((item): item is MemoryFact => item !== null);
      const merged = uniqueFacts(reconcileEnrichment(rulesResult.facts, llmFacts, text).facts);
      if (merged.length) addFacts(merged);
      if (current) markAnswered(current.id);

      const after = useAxiomStore.getState();
      const next = selectNextQuestion(after.memories, after.answeredQuestionIds);
      await delay(Math.max(0, 1500 - (Date.now() - started)));

      if (next.question) {
        setQuestion(next.question);
        setStage("input");
      } else {
        router.push("/diagnosis");
      }
    } catch {
      setNotice("Не получилось разобрать — попробуй ещё раз.");
      setStage("input");
    }
  };

  const firstRun = memories.length < 3 && !question;
  const canFinishEarly = memories.length >= 3;

  const stageMotion = reduce
    ? { initial: false as const, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } };

  return (
    <div className="relative min-h-[62vh]">
      <MemoryColumn facts={memories} />
      <MemoryColumn facts={memories} compact />

      <AnimatePresence mode="wait">
        {stage === "thinking" ? (
          <motion.div
            key="thinking"
            {...stageMotion}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="flex min-h-[62vh] items-center justify-center"
            aria-live="polite"
          >
            <CrossingDots />
          </motion.div>
        ) : (
          <motion.div
            key="input"
            {...stageMotion}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="mx-auto flex min-h-[62vh] w-full max-w-xl flex-col justify-center"
          >
            <p className="mb-3 text-[15px] leading-snug text-mist-200">{label}</p>

            <div className="flex items-end gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] py-2 pl-4 pr-2 transition-colors focus-within:border-[#7fb8f0]/40 focus-within:bg-white/[0.05]">
              <textarea
                autoFocus
                rows={2}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void submit();
                  }
                }}
                placeholder={placeholder}
                aria-label={label}
                className="max-h-40 w-full resize-none bg-transparent py-2 text-[14px] leading-relaxed text-mist-100 outline-none placeholder:text-mist-600"
              />
              <button
                type="button"
                onClick={() => void submit()}
                disabled={!draft.trim()}
                aria-label="Отправить"
                className={cn(
                  "mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors",
                  draft.trim() ? "bg-mist-50 text-ink-950 hover:bg-white" : "bg-white/[0.05] text-mist-600",
                )}
              >
                <IconArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-mist-600">
              <span>
                {notice ?? (firstRun ? "Можно просто рассказать своими словами" : "Enter — отправить, Shift + Enter — новая строка")}
              </span>
              {canFinishEarly ? (
                <button
                  type="button"
                  onClick={() => router.push("/diagnosis")}
                  className="shrink-0 text-mist-500 transition-colors hover:text-mist-200"
                >
                  К диагностике →
                </button>
              ) : null}
            </div>

          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
