"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Logo } from "@/components/logo";
import { DemoButton } from "@/components/shell/demo-button";
import { buttonStyles } from "@/components/ui/button";
import { ManualForm } from "@/components/interview/manual-form";
import { MemoryFlightLayer, type MemoryFlight } from "@/components/interview/memory-flight";
import { VoiceDots, type OrbState } from "@/components/interview/voice-dots";
import { useContinuousVoice } from "@/components/interview/use-continuous-voice";
import { IconArrowRight, IconBrain, IconRefresh, IconVolume, IconVolumeOff, IconWand, IconX } from "@/components/icons";
import { FIELD_LABELS, composeAgentReply, extractFacts, reconcileEnrichment, reparseFactValue, selectNextQuestion } from "@/lib/shared/engine";
import type { MemoryFact, MemoryField, MemorySource } from "@/lib/shared/engine";
import { extractFactsSmart } from "@/lib/api";
import { llmExtract, llmReply, synthesizeSpeech, voiceEnabled, type ExtractedFact } from "@/lib/voice-api";
import { useAxiomStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { cn } from "@/lib/utils";

const GREETING =
  "Привет! Я AXIOM — соберу твой профиль для поступления. Расскажи о себе: как тебя зовут, в каком ты классе и куда хочешь поступить?";

const ANALYSIS_SAMPLE =
  "Меня зовут Алина, я в 11 классе. Хочу поступить в Европу — важно, чтобы была стипендия. Бюджет до $12 000 в год, IELTS 6.5.";

const TOPICS: { key: string; label: string; fields: MemoryField[] }[] = [
  { key: "intro", label: "имя и класс", fields: ["name", "grade"] },
  { key: "country", label: "страна или регион", fields: ["country"] },
  { key: "budget", label: "бюджет на год", fields: ["budget"] },
  { key: "ielts", label: "IELTS", fields: ["ielts"] },
  { key: "gpa", label: "успеваемость", fields: ["gpa"] },
  { key: "interests", label: "интересы и направление", fields: ["interests"] },
  { key: "priority", label: "срок старта и главный приоритет", fields: ["intake", "priority"] },
  { key: "constraints", label: "ограничения", fields: ["constraints", "language"] },
];

const ALLOWED_FIELDS = new Set<string>(TOPICS.flatMap((topic) => topic.fields));

const HIGHLIGHT_PATTERNS: Partial<Record<MemoryField, RegExp>> = {
  country: /европ[а-яё]*|герман[а-яё]*|польш[а-яё]*|чех[а-яё]*|итал[а-яё]*|испан[а-яё]*|финлянди[а-яё]*|венгри[а-яё]*|нидерланд[а-яё]*/i,
  grade: /\d{1,2}\s*класс[а-яё]*/i,
  budget: /(?:бюджет(?:\s+до)?|до)\s*(?:\$|€)?\s*\d[\d\s.,]*\s*(?:к|k|тыс(?:яч[а-яё]*)?|\$|€|доллар[а-яё]*)?/i,
  ielts: /IELTS\s*\d(?:[.,]\d)?/i,
  gpa: /(?:GPA|средний балл)\s*\d(?:[.,]\d)?/i,
  interests: /информатик[а-яё]*|программировани[а-яё]*|дизайн[а-яё]*|инженери[а-яё]*|психологи[а-яё]*|бизнес[а-яё]*|(?:^|\s)IT(?:\s|$)/i,
  intake: /(?:осень|весна|лето)\s*20\d\d/i,
};

function highlightFromFact(text: string, fact: MemoryFact): string | null {
  const display = fact.display?.trim();
  if (display && display.length <= 30) {
    const index = text.toLowerCase().indexOf(display.toLowerCase());
    if (index >= 0) return text.slice(index, index + display.length);
  }
  const match = HIGHLIGHT_PATTERNS[fact.field]?.exec(text);
  if (match) return match[0].trim();
  const quote = fact.quote.replace(/^…+|…+$/g, "").trim();
  return quote.length > 1 && quote.length <= 30 && text.toLowerCase().includes(quote.toLowerCase()) ? quote : null;
}

function uid(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function factFromLlm(item: ExtractedFact, source: MemorySource): MemoryFact | null {
  if (!ALLOWED_FIELDS.has(item.field)) return null;
  const field = item.field as MemoryField;
  const parsed = reparseFactValue(field, item.value.trim());
  if (!parsed) return null;
  const value = parsed.value;
  return {
    id: `llm-${field}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    field,
    label: FIELD_LABELS[field],
    value,
    display: parsed.display,
    quote: item.quote || value,
    confidence: 0.96,
    numeric: parsed.numeric,
    source,
    createdAt: Date.now(),
  };
}

interface Segment {
  text: string;
  highlight: boolean;
  hlIndex: number | null;
}

function buildSegments(text: string, highlights: { quote: string }[] | undefined): Segment[] {
  if (!highlights?.length) return [{ text, highlight: false, hlIndex: null }];
  const lower = text.toLowerCase();
  const matches: { start: number; end: number; hl: number }[] = [];
  highlights.forEach((item, hl) => {
    const cleaned = item.quote.replace(/^…+/, "").replace(/…+$/, "").replace(/^«|»$/g, "").trim();
    if (!cleaned) return;
    const index = lower.indexOf(cleaned.toLowerCase());
    if (index === -1) return;
    matches.push({ start: index, end: index + cleaned.length, hl });
  });
  matches.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number; hl: number }[] = [];
  for (const match of matches) {
    const last = merged[merged.length - 1];
    if (last && match.start <= last.end) last.end = Math.max(last.end, match.end);
    else merged.push({ ...match });
  }
  const segments: Segment[] = [];
  let cursor = 0;
  for (const match of merged) {
    if (match.start > cursor) segments.push({ text: text.slice(cursor, match.start), highlight: false, hlIndex: null });
    segments.push({ text: text.slice(match.start, match.end), highlight: true, hlIndex: match.hl });
    cursor = match.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlight: false, hlIndex: null });
  return segments;
}

const WORD_STAGGER = 0.02;
const WORD_MAX_DELAY = 0.4;
const WORD_EASE = [0.22, 1, 0.36, 1] as const;
/** Подсвеченное слово — не рамка, а само слово, ставшее синим. */
const HIGHLIGHT_COLOR = "#b3dafb";

/** Ответ проявляется словами, а фразы-факты плавно наливаются синим. */
function AnswerText({
  text,
  highlights,
  reduce,
}: {
  text: string;
  highlights?: { quote: string; field: MemoryField }[];
  reduce?: boolean | null;
}) {
  const segments = useMemo(() => buildSegments(text, highlights), [text, highlights]);
  let word = 0;

  return (
    <span className="whitespace-pre-line">
      {segments.map((segment, segmentIndex) => {
        const parts = segment.text.split(/(\s+)/).filter(Boolean);
        const nodes: React.ReactNode[] = [];
        parts.forEach((part, partIndex) => {
          if (/^\s+$/.test(part)) {
            nodes.push(part);
            return;
          }
          const index = word;
          word += 1;
          const delay = reduce ? 0 : Math.min(WORD_MAX_DELAY, index * WORD_STAGGER);
          nodes.push(
            <motion.span
              key={`${segmentIndex}-${partIndex}`}
              className="inline-block"
              initial={reduce ? false : { opacity: 0, y: 4 }}
              animate={segment.highlight ? { opacity: 1, y: 0, color: HIGHLIGHT_COLOR } : { opacity: 1, y: 0 }}
              transition={
                segment.highlight
                  ? {
                      opacity: { duration: 0.42, delay, ease: WORD_EASE },
                      y: { duration: 0.42, delay, ease: WORD_EASE },
                      color: { duration: 1.15, delay: delay + 0.2, ease: "easeInOut" },
                    }
                  : { duration: 0.42, delay, ease: WORD_EASE }
              }
            >
              {part}
            </motion.span>,
          );
        });
        if (!segment.highlight) return <span key={segmentIndex}>{nodes}</span>;
        return (
          <span key={segmentIndex} data-hl-index={segment.hlIndex ?? undefined}>
            {nodes}
          </span>
        );
      })}
    </span>
  );
}

function useWordReveal(text: string | undefined, enabled: boolean) {
  const words = useMemo(() => (text ? text.split(" ") : []), [text]);
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!text) {
      setCount(0);
      return;
    }
    if (!enabled) {
      setCount(words.length);
      return;
    }
    setCount(0);
    const id = window.setInterval(() => {
      setCount((current) => {
        if (current >= words.length) {
          window.clearInterval(id);
          return current;
        }
        return current + 1;
      });
    }, 30);
    return () => window.clearInterval(id);
  }, [text, enabled, words.length]);

  return words.slice(0, count).join(" ");
}

function FactRow({ fact, morph }: { fact: MemoryFact; morph?: boolean }) {
  return (
    <span className="min-w-0 truncate text-[13px] leading-snug">
      {morph ? (
        <motion.span
          className="text-mist-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55, duration: 0.45, ease: "easeInOut" }}
        >
          {fact.label}:{" "}
        </motion.span>
      ) : (
        <span className="text-mist-500">{fact.label}: </span>
      )}
      {morph ? (
        <motion.span
          className="text-[#b3dafb]"
          initial={{ opacity: 0, x: -9, scale: 0.72, filter: "blur(6px)" }}
          animate={{ opacity: 1, x: 0, scale: 1, filter: "blur(0px)" }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          {fact.display}
        </motion.span>
      ) : (
        <span className="text-[#b3dafb]">{fact.display}</span>
      )}
    </span>
  );
}

export default function InterviewPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-ink-950">
          <div className="h-32 w-32 animate-shimmer rounded-full" />
        </div>
      }
    >
      <InterviewContent />
    </Suspense>
  );
}

function InterviewContent() {
  const searchParams = useSearchParams();
  const hydrated = useHydrated();
  const messages = useAxiomStore((state) => state.messages);
  const memories = useAxiomStore((state) => state.memories);
  const demoMode = useAxiomStore((state) => state.demoMode);
  const addMessage = useAxiomStore((state) => state.addMessage);
  const addFacts = useAxiomStore((state) => state.addFacts);
  const removeMemory = useAxiomStore((state) => state.removeMemory);
  const resetAll = useAxiomStore((state) => state.resetAll);

  const [mode, setMode] = useState<"voice" | "manual">("voice");
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<"idle" | "thinking" | "speaking" | "done">("idle");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);

  const busyRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const answerRef = useRef<HTMLDivElement | null>(null);
  const memoryRef = useRef<HTMLElement | null>(null);
  const levelRef = useRef(0);
  const meterRef = useRef<{ ctx: AudioContext; raf: number } | null>(null);
  const meterSeqRef = useRef(0);
  const reduce = useReducedMotion();

  const [flights, setFlights] = useState<MemoryFlight[]>([]);

  const pendingIds = useMemo(() => new Set(flights.map((item) => item.id)), [flights]);
  const visibleMemories = useMemo(() => memories.filter((fact) => !pendingIds.has(fact.id)), [memories, pendingIds]);

  const handleLanded = useCallback((id: string) => {
    setFlights((current) => current.filter((item) => item.id !== id));
  }, []);

  /** Пока AXIOM говорит, шары танцуют под его настоящий голос. */
  const stopTtsMeter = useCallback(() => {
    meterSeqRef.current += 1;
    const meter = meterRef.current;
    meterRef.current = null;
    if (meter) {
      cancelAnimationFrame(meter.raf);
      void meter.ctx.close().catch(() => undefined);
    }
    levelRef.current = 0;
  }, []);

  const startTtsMeter = useCallback(
    (audio: HTMLAudioElement) => {
      stopTtsMeter();
      const seq = meterSeqRef.current + 1;
      meterSeqRef.current = seq;
      try {
        const ctx = new AudioContext();
        const attach = () => {
          if (meterSeqRef.current !== seq || ctx.state !== "running") {
            void ctx.close().catch(() => undefined);
            return;
          }
          try {
            const source = ctx.createMediaElementSource(audio);
            const analyser = ctx.createAnalyser();
            analyser.fftSize = 1024;
            source.connect(analyser);
            analyser.connect(ctx.destination);
            const data = new Float32Array(analyser.fftSize);
            const tick = () => {
              const meter = meterRef.current;
              if (!meter) return;
              analyser.getFloatTimeDomainData(data);
              let sum = 0;
              for (let index = 0; index < data.length; index += 1) sum += data[index] * data[index];
              const rms = Math.sqrt(sum / data.length);
              const target = Math.min(1, rms / 0.12);
              levelRef.current = levelRef.current * 0.62 + target * 0.38;
              meter.raf = requestAnimationFrame(tick);
            };
            meterRef.current = { ctx, raf: requestAnimationFrame(tick) };
          } catch {
            void ctx.close().catch(() => undefined);
          }
        };
        // Подключаемся только когда контекст реально звучит: иначе можно
        // случайно заглушить голос AXIOM на браузерах со строгим автоплеем.
        if (ctx.state === "running") attach();
        else {
          void ctx
            .resume()
            .then(attach)
            .catch(() => {
              void ctx.close().catch(() => undefined);
            });
        }
      } catch {
        meterRef.current = null;
      }
    },
    [stopTtsMeter],
  );

  const stopAudio = useCallback(() => {
    stopTtsMeter();
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audioRef.current = null;
    }
  }, [stopTtsMeter]);

  useEffect(() => stopTtsMeter, [stopTtsMeter]);

  /**
   * Факт рождается из слова: слово сворачивается в шарик, шарик летит в память
   * и там снова разворачивается в слово.
   */
  const launchFlights = useCallback(
    (facts: MemoryFact[], from: "words" | "card" = "words") => {
      if (reduce || !facts.length) return;
      // Двойной кадр: строка ответа успевает отрисоваться, и координаты слова точные.
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const message = [...useAxiomStore.getState().messages].reverse().find((item) => item.role === "user");
          const highlights = message?.highlights ?? [];
          const used = new Set<number>();
          const items: MemoryFlight[] = [];
          const desktop = window.matchMedia("(min-width: 1024px)").matches;
          const list = desktop ? document.querySelector<HTMLElement>("[data-memory-list]") : null;
          const button = document.querySelector<HTMLElement>("[data-memory-button]");
          if (!list && !button) return;

          const listRect = list?.getBoundingClientRect() ?? null;
          const rows = list ? list.querySelectorAll<HTMLElement>("[data-memory-row]") : null;
          const lastRow = rows && rows.length ? rows[rows.length - 1].getBoundingClientRect() : null;

          facts.forEach((fact, index) => {
            let origin: { x: number; y: number } | null = null;
            let word = fact.display;

            if (from === "words") {
              const hlIndex = highlights.findIndex((item, hl) => !used.has(hl) && item.field === fact.field);
              if (hlIndex >= 0) {
                used.add(hlIndex);
                const node = answerRef.current?.querySelector<HTMLElement>(`[data-hl-index="${hlIndex}"]`);
                if (node) {
                  const rect = node.getBoundingClientRect();
                  origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
                  const quote = highlights[hlIndex]?.quote?.replace(/^…+|…+$/g, "").trim();
                  if (quote) word = quote.length > 26 ? `${quote.slice(0, 26)}…` : quote;
                }
              }
            }

            if (!origin) {
              const rect = answerRef.current?.getBoundingClientRect();
              if (!rect) return;
              origin = { x: rect.left + rect.width / 2, y: rect.top + 20 };
            }

            let target: { x: number; y: number };
            if (desktop && listRect) {
              target = lastRow
                ? { x: lastRow.left + Math.min(130, lastRow.width * 0.55), y: lastRow.bottom + 12 }
                : { x: listRect.left + 100, y: listRect.top + 10 };
            } else if (button) {
              const rect = button.getBoundingClientRect();
              target = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
            } else return;

            items.push({ id: fact.id, word, from: origin, to: target, delay: index * 120 });
          });

          if (!items.length) return;
          setFlights((current) => [...current, ...items]);
          // Страховка: полёт не должен держать факт в невидимости дольше положенного.
          items.forEach((item) => {
            window.setTimeout(() => handleLanded(item.id), 4200 + item.delay);
          });
        });
      });
    },
    [handleLanded, reduce],
  );

  const coveredCount = useMemo(
    () => TOPICS.filter((topic) => topic.fields.some((field) => memories.some((item) => item.field === field))).length,
    [memories],
  );
  const userTurns = useMemo(() => messages.filter((message) => message.role === "user").length, [messages]);
  const answered = useAxiomStore((state) => state.answeredQuestionIds);
  const turn = useMemo(() => selectNextQuestion(memories, answered), [memories, answered]);
  const finished = userTurns > 0 && turn.question === null;

  const submitAnswer = useCallback(
    async (raw: string, source: "voice" | "text") => {
      const text = raw.trim();
      if (!text || busyRef.current) return;
      busyRef.current = true;
      stopAudio();
      try {
        const before = useAxiomStore.getState();
        const currentQuestion = selectNextQuestion(before.memories, before.answeredQuestionIds).question;
        const previewAll = extractFacts(text, { source });
        const preview = previewAll
          .map((item) => {
            const quote = highlightFromFact(text, item);
            return quote ? { quote, field: item.field } : null;
          })
          .filter((item): item is { quote: string; field: MemoryField } => item !== null)
          .slice(0, 8);
        addMessage({
          id: uid(),
          role: "user",
          text,
          highlights: preview.map((item) => ({ quote: item.quote, field: item.field })),
          ts: Date.now(),
        });
        setDraft("");
        setNotice(null);
        setPhase("thinking");

        const store = useAxiomStore.getState();
        const known = store.memories.map((item) => ({ label: item.label, value: item.display }));
        const history = store.messages.map((message) => ({ role: message.role, text: message.text }));

        const applyFacts = (facts: MemoryFact[]) => {
          if (!facts.length) return [] as MemoryFact[];
          const current = useAxiomStore.getState().memories;
          const fresh = facts.filter(
            (fact) => !current.some((item) => item.field === fact.field && item.value === fact.value),
          );
          if (!fresh.length) return [];
          addFacts(fresh);
          return useAxiomStore
            .getState()
            .memories.filter((item) => !current.some((prev) => prev.id === item.id));
        };

        const addedPreview = applyFacts(previewAll);
        launchFlights(addedPreview);
        const extraction = (async () => {
          const [rulesResult, llmRaw] = await Promise.all([
            extractFactsSmart(text, source).catch(() => ({ facts: previewAll, engine: "rules" as const })),
            voiceEnabled ? llmExtract(text, currentQuestion?.text ?? null, known) : Promise.resolve([] as ExtractedFact[]),
          ]);
          const llmFacts = llmRaw
            .map((item) => factFromLlm(item, source))
            .filter((item): item is MemoryFact => item !== null);
          return reconcileEnrichment(rulesResult.facts, llmFacts, text).facts;
        })();

        // The next question must use facts from this utterance, including slower semantic extraction.
        const lateFacts = await extraction;
        const addedLate = applyFacts(lateFacts);
        launchFlights(addedLate, "card");
        const combined = [...addedPreview, ...addedLate];

        const afterMemories = useAxiomStore.getState().memories;
        if (currentQuestion) useAxiomStore.getState().markAnswered(currentQuestion.id);
        const nextTurn = selectNextQuestion(afterMemories, useAxiomStore.getState().answeredQuestionIds);
        const willFinish = nextTurn.question === null;

        const replyPromise = voiceEnabled && !willFinish
          ? llmReply({
              messages: history,
              known: afterMemories.map((item) => ({ label: item.label, value: item.display })),
              missing: nextTurn.question ? [nextTurn.question.text] : [],
              finished: willFinish,
            })
          : Promise.resolve(null);
        let reply = await Promise.race([
          replyPromise,
          new Promise<null>((resolve) => window.setTimeout(() => resolve(null), 9000)),
        ]);
        if (!reply) {
          reply = willFinish ? nextTurn.reason : composeAgentReply(combined, nextTurn.question, text);
        }
        addMessage({ id: uid(), role: "axiom", text: reply, ts: Date.now() });

        setPhase(willFinish ? "done" : "idle");

        if (voiceEnabled && speakReplies && !willFinish) {
          setPhase("speaking");
          void synthesizeSpeech(reply).then((audio) => {
            if (!audio) {
              setPhase((current) => (current === "speaking" ? "idle" : current));
              return;
            }
            audioRef.current = audio;
            startTtsMeter(audio);
            const finish = () => {
              if (audioRef.current === audio) audioRef.current = null;
              stopTtsMeter();
              setPhase((current) => (current === "speaking" ? "idle" : current));
            };
            audio.addEventListener("ended", finish, { once: true });
            window.setTimeout(finish, 45000);
          });
        }
      } catch {
        setNotice("Не удалось обработать ответ. Попробуй отправить его ещё раз.");
        setPhase("idle");
      } finally {
        busyRef.current = false;
      }
    },
    [addFacts, addMessage, launchFlights, speakReplies, startTtsMeter, stopAudio, stopTtsMeter],
  );

  const handleUtterance = useCallback(
    (text: string) => {
      void submitAnswer(text, "voice");
    },
    [submitAnswer],
  );

  const handleBargeIn = useCallback(() => {
    stopAudio();
    setPhase("idle");
  }, [stopAudio]);

  const continuous = useContinuousVoice({
    onUtterance: handleUtterance,
    onBargeIn: handleBargeIn,
    paused: phase === "thinking" || phase === "speaking" || finished,
    bargeIn: phase === "speaking",
    levelRef,
  });

  useEffect(() => {
    if (!hydrated || demoMode) return;
    if (useAxiomStore.getState().messages.length > 0) return;
    addMessage({ id: uid(), role: "axiom", text: GREETING, ts: Date.now() });
  }, [hydrated, demoMode, messages.length, addMessage]);

  const handleReset = useCallback(() => {
    stopAudio();
    continuous.clearError();
    resetAll();
    setFlights([]);
    setDraft("");
    setPhase("idle");
    setNotice(null);
  }, [continuous, resetAll, stopAudio]);

  const runSampleAnswer = useCallback(() => {
    handleReset();
    window.setTimeout(() => {
      void submitAnswer(ANALYSIS_SAMPLE, "text");
    }, 360);
  }, [handleReset, submitAnswer]);

  const lastAxiom = useMemo(() => [...messages].reverse().find((message) => message.role === "axiom"), [messages]);
  const lastUser = useMemo(() => [...messages].reverse().find((message) => message.role === "user"), [messages]);
  const revealEnabled = !reduce;
  const revealed = useWordReveal(lastAxiom?.text, revealEnabled);

  const demoLoaded = demoMode && messages.length > 0;
  const done = finished;

  const forcedOrb = searchParams.get("orb");
  const orbState: OrbState =
    forcedOrb && ["off", "idle", "hearing", "thinking", "speaking", "done"].includes(forcedOrb)
      ? (forcedOrb as OrbState)
      : done
        ? "done"
        : !continuous.micOn
          ? "off"
          : continuous.phase === "hearing"
            ? "hearing"
            : continuous.phase === "transcribing"
              ? "thinking"
              : phase === "thinking"
                ? "thinking"
                : phase === "speaking"
                  ? "speaking"
                  : "idle";

  const handleOrb = () => {
    if (done) return;
    if (phase === "speaking") {
      stopAudio();
      setPhase("idle");
      if (!continuous.micOn) void continuous.start();
      return;
    }
    continuous.toggle();
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-950">
        <div className="h-32 w-32 animate-shimmer rounded-full" />
      </div>
    );
  }

  if (mode === "manual") {
    return (
      <div className="min-h-dvh bg-ink-950">
        <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
          <Link href="/" aria-label="AXIOM — на главную">
            <Logo />
          </Link>
          <button type="button" onClick={() => setMode("voice")} className={buttonStyles("ghost", "sm")}>
            Назад к разговору
          </button>
        </header>
        <main className="mx-auto w-full max-w-6xl px-4 pb-16 pt-4 sm:px-6">
          <ManualForm />
        </main>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-dvh flex-col overflow-hidden bg-ink-950">
      <div className="fixed inset-x-0 top-0 z-50 h-px bg-white/[0.05]">
        <motion.div
          className="h-full bg-violet-400/80"
          animate={{ width: `${Math.min(100, Math.round((coveredCount / TOPICS.length) * 100))}%` }}
          transition={{ type: "spring", stiffness: 90, damping: 22 }}
        />
      </div>

      <header className="relative z-30 mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <Link href="/" aria-label="AXIOM — на главную">
          <Logo />
        </Link>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setMode("manual")}
            className="hidden h-9 items-center rounded-full px-3 text-[12px] text-mist-600 transition-colors hover:text-mist-200 md:flex"
          >
            Вручную
          </button>
          <span className="hidden sm:contents">
            <DemoButton variant="ghost" size="sm" label="Демо" className="opacity-70" />
          </span>
          <button
            type="button"
            onClick={runSampleAnswer}
            disabled={phase === "thinking"}
            title="Сбросить интервью и отправить пример ответа"
            className="flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] text-violet-300 transition-colors hover:bg-white/[0.04] hover:text-violet-200 focus-visible:rounded-full disabled:opacity-40 sm:px-3"
          >
            <IconWand className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Пример ответа</span>
            <span className="sr-only sm:hidden">Пример ответа</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSpeakReplies((value) => !value);
              if (phase === "speaking") stopAudio();
            }}
            aria-label={speakReplies ? "Выключить озвучку" : "Включить озвучку"}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full transition-colors",
              speakReplies ? "text-violet-300 hover:text-violet-200" : "text-mist-600 hover:text-mist-300",
            )}
          >
            {speakReplies ? <IconVolume className="h-4 w-4" /> : <IconVolumeOff className="h-4 w-4" />}
          </button>
          <button
            type="button"
            onClick={handleReset}
            aria-label="Сбросить интервью"
            title="Сбросить интервью"
            className="flex h-9 w-9 items-center justify-center rounded-full text-mist-600 transition-colors hover:text-mist-200 max-sm:hidden"
          >
            <IconRefresh className="h-4 w-4" />
          </button>
          <button
            type="button"
            data-memory-button
            onClick={() => setSheetOpen(true)}
            className="relative flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] text-mist-500 transition-colors hover:text-mist-200 lg:hidden"
          >
            <IconBrain className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Память</span>
            <span className="tabular-nums">{memories.length}</span>
          </button>
        </div>
      </header>

      <aside ref={memoryRef} className="fixed right-10 top-[22%] z-40 hidden w-[300px] lg:block" aria-label="Память AXIOM">
        <div className="mb-3 flex items-center gap-2.5 border-b border-white/10 pb-3.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#8cc5f5]/70" />
          </span>
          <p className="text-[11px] uppercase tracking-[0.18em] text-mist-400">Память</p>
          <span className="ml-auto text-[11px] tabular-nums text-mist-600">{memories.length}</span>
        </div>

        <ul data-memory-list className="space-y-3">
          <AnimatePresence initial={false}>
            {visibleMemories.map((fact) => (
              <motion.li
                key={fact.id}
                data-memory-row
                layout="position"
                exit={{ opacity: 0 }}
                transition={{ duration: 0.24, layout: { type: "spring", stiffness: 420, damping: 34 } }}
                className="group flex items-center justify-between gap-3 px-1"
              >
                <FactRow fact={fact} morph />
                <button
                  type="button"
                  onClick={() => removeMemory(fact.id)}
                  aria-label={`Убрать «${fact.label}»`}
                  className="hidden text-mist-700 transition-colors hover:text-mist-300 group-hover:block"
                >
                  <IconX className="h-3 w-3" />
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      </aside>

      <AnimatePresence>
        {sheetOpen ? (
          <motion.div
            key="sheet"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end bg-ink-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setSheetOpen(false)}
          >
            <motion.div
              initial={{ y: 70, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 70, opacity: 0 }}
              transition={{ type: "spring", stiffness: 280, damping: 30 }}
              className="max-h-[70vh] w-full overflow-y-auto rounded-t-3xl bg-ink-900 px-6 pb-8 pt-6"
              onClick={(event) => event.stopPropagation()}
            >
              <ul className="space-y-2.5">
                {visibleMemories.map((fact) => (
                  <li key={fact.id} className="flex items-center justify-between gap-4 px-1">
                    <FactRow fact={fact} />
                  </li>
                ))}
                {visibleMemories.length === 0 ? (
                  <li className="py-2 text-[13px] text-mist-500">Просто расскажи о себе — факты появятся здесь сами.</li>
                ) : null}
              </ul>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <main className="relative z-10 flex flex-1 flex-col items-center justify-center px-5 pb-6">
        {demoLoaded ? (
          <div className="w-full max-w-md text-center">
            <p className="font-display text-[20px] text-mist-50">Демо-профиль загружен</p>
            <p className="mt-2 text-[13px] leading-relaxed text-mist-400">В памяти {memories.length} фактов</p>
            <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
              <Link href="/diagnosis" className={buttonStyles("primary", "md")}>
                К диагностике
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <button type="button" className={buttonStyles("secondary", "md")} onClick={runSampleAnswer}>
                <IconWand className="h-4 w-4" />
                Пример ответа
              </button>
              <button type="button" className={buttonStyles("ghost", "md")} onClick={handleReset}>
                Пройти интервью заново
              </button>
            </div>
          </div>
        ) : (
          <>
            <AnimatePresence mode="wait">
              <motion.p
                key={lastAxiom?.id ?? "empty"}
                initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -10, filter: "blur(6px)" }}
                transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="min-h-[3.4em] max-w-2xl text-center font-display text-[21px] leading-[1.55] text-mist-100 sm:text-[25px]"
              >
                {revealed}
              </motion.p>
            </AnimatePresence>

            <div className="my-5 flex h-[168px] items-center justify-center sm:my-6">
              <VoiceDots state={orbState} onClick={handleOrb} levelRef={levelRef} className="w-auto" />
            </div>

            <div ref={answerRef} className="relative w-full max-w-xl" aria-live="polite">
              {lastUser ? (
                <motion.p
                  key={lastUser.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                  className="text-center text-[15px] leading-[1.85] text-mist-400"
                >
                  <AnswerText text={lastUser.text} highlights={lastUser.highlights} reduce={reduce} />
                </motion.p>
              ) : !continuous.micOn && !demoLoaded ? (
                <p className="text-center text-[13px] text-mist-600">Нажми на точки, чтобы включить микрофон</p>
              ) : null}
            </div>

            {(notice ?? continuous.error) ? (
              <div className="mt-5 flex items-center gap-3 text-[12px] text-amber-200/90">
                {notice ?? continuous.error}
                <button
                  type="button"
                  onClick={() => {
                    setNotice(null);
                    continuous.clearError();
                  }}
                  aria-label="Скрыть"
                  className="text-amber-300/80 transition-colors hover:text-amber-100"
                >
                  <IconX className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : null}
          </>
        )}
      </main>

      {!demoLoaded ? (
        <footer className="relative z-10 px-5 pb-8">
          {done ? (
            <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-3">
              <Link href="/diagnosis" className={buttonStyles("primary", "lg", "w-full sm:w-auto")}>
                К диагностике
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setMode("manual")}
                className="text-[12.5px] text-mist-600 transition-colors hover:text-mist-300"
              >
                Дополнить вручную
              </button>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-xl">
              <div className="flex items-center gap-3 border-b border-white/[0.07] pb-2 transition-colors focus-within:border-[#7fb8f0]/45">
                <input
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      void submitAnswer(draft, "text");
                    }
                  }}
                  placeholder="Напиши ответ — или просто говори"
                  aria-label="Ответ AXIOM"
                  className="h-11 w-full bg-transparent text-[15px] text-mist-100 outline-none placeholder:text-mist-600"
                />
                <button
                  type="button"
                  onClick={() => void submitAnswer(draft, "text")}
                  disabled={!draft.trim()}
                  aria-label="Отправить"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-mist-500 transition-colors hover:text-mist-100 disabled:opacity-30"
                >
                  <IconArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </footer>
      ) : null}

      <MemoryFlightLayer flights={flights} onLanded={handleLanded} />
    </div>
  );
}
