"use client";

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Logo } from "@/components/logo";
import { DemoButton } from "@/components/shell/demo-button";
import { buttonStyles } from "@/components/ui/button";
import { ManualForm } from "@/components/interview/manual-form";
import { AnalysisStage, type AnalysisState } from "@/components/interview/analysis-stage";
import { VoiceDots, type OrbState } from "@/components/interview/voice-dots";
import { useContinuousVoice } from "@/components/interview/use-continuous-voice";
import { IconArrowRight, IconBrain, IconRefresh, IconSparkles, IconVolume, IconVolumeOff, IconX } from "@/components/icons";
import { FIELD_LABELS, composeAgentReply, extractFacts, reconcileEnrichment, reparseFactValue, selectNextQuestion, recommend } from "@/lib/shared/engine";
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
}

function buildSegments(text: string, highlights: { quote: string }[] | undefined): Segment[] {
  if (!highlights?.length) return [{ text, highlight: false }];
  const lower = text.toLowerCase();
  const matches: { start: number; end: number }[] = [];
  for (const item of highlights) {
    const cleaned = item.quote.replace(/^…+/, "").replace(/…+$/, "").replace(/^«|»$/g, "").trim();
    if (!cleaned) continue;
    const index = lower.indexOf(cleaned.toLowerCase());
    if (index === -1) continue;
    matches.push({ start: index, end: index + cleaned.length });
  }
  matches.sort((a, b) => a.start - b.start);
  const merged: { start: number; end: number }[] = [];
  for (const match of matches) {
    const last = merged[merged.length - 1];
    if (last && match.start <= last.end) last.end = Math.max(last.end, match.end);
    else merged.push({ ...match });
  }
  const segments: Segment[] = [];
  let cursor = 0;
  for (const match of merged) {
    if (match.start > cursor) segments.push({ text: text.slice(cursor, match.start), highlight: false });
    segments.push({ text: text.slice(match.start, match.end), highlight: true });
    cursor = match.end;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), highlight: false });
  return segments;
}

function AnswerText({
  text,
  highlights,
  liftedQuotes,
  onMarkRef,
}: {
  text: string;
  highlights?: { quote: string; field: MemoryField }[];
  liftedQuotes?: string[];
  onMarkRef?: (quote: string, element: HTMLElement | null) => void;
}) {
  const segments = useMemo(() => buildSegments(text, highlights), [text, highlights]);
  let markIndex = 0;

  return (
    <span className="whitespace-pre-line">
      {segments.map((segment, index) => {
        if (!segment.highlight) return <span key={index}>{segment.text}</span>;
        const lifted = liftedQuotes?.includes(segment.text) ?? false;
        const delay = Math.min(markIndex * 90, 420);
        markIndex += 1;
        return (
          <mark
            key={index}
            ref={(element) => onMarkRef?.(segment.text, element)}
            className="relative mx-0.5 inline-block rounded-md bg-transparent px-1.5 py-px text-inherit"
          >
            <span
              aria-hidden="true"
              className={cn(
                "absolute inset-0 rounded-md bg-[#5f9cec]/15 transition-opacity duration-500",
                lifted ? "opacity-0" : "animate-sweep-in",
              )}
              style={{ animationDelay: `${delay}ms` }}
            />
            <span
              className={cn(
                "relative inline-block transition-all duration-500",
                lifted ? "text-mist-700" : "text-mist-200",
              )}
            >
              {segment.text}
            </span>
          </mark>
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

function FactRow({ fact }: { fact: MemoryFact }) {
  return (
    <>
      <span className="shrink-0 text-[10px] uppercase tracking-[0.18em] text-mist-600">{fact.label}</span>
      <span className="max-w-[160px] text-right text-[12.5px] leading-snug text-mist-200">{fact.display}</span>
    </>
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
  const [flyingIds, setFlyingIds] = useState<string[]>([]);
  const [landedIds, setLandedIds] = useState<string[]>([]);
  const [liftSpawns, setLiftSpawns] = useState<{ fact: MemoryFact; x: number; y: number; dx: number; dy: number; key: string }[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(true);
  const [notice, setNotice] = useState<string | null>(null);
  const [liftedQuotes, setLiftedQuotes] = useState<string[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisState | null>(null);

  const busyRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const markRefs = useRef(new Map<string, HTMLElement>());
  const answerRef = useRef<HTMLDivElement | null>(null);
  const memoryRef = useRef<HTMLElement | null>(null);
  const levelRef = useRef(0);
  const analysisTimer = useRef<number | null>(null);
  const analysisStartAxiomRef = useRef<string | null>(null);
  const reduce = useReducedMotion();

  const stopAudio = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audioRef.current = null;
    }
  }, []);

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
        setLiftedQuotes([]);
        setPhase("thinking");
        analysisStartAxiomRef.current =
          [...useAxiomStore.getState().messages].reverse().find((message) => message.role === "axiom")?.id ?? null;
        if (analysisTimer.current) window.clearTimeout(analysisTimer.current);
        setAnalysis({ stage: "spin", facts: [], top: [] });

        const store = useAxiomStore.getState();
        const known = store.memories.map((item) => ({ label: item.label, value: item.display }));
        const history = store.messages.map((message) => ({ role: message.role, text: message.text }));

        const LIFT_ORDER: MemoryField[] = [
          "name",
          "country",
          "budget",
          "ielts",
          "gpa",
          "interests",
          "grade",
          "intake",
          "priority",
          "language",
          "constraints",
        ];

        const findMark = (fact: MemoryFact): HTMLElement | null => {
          const fromPreview = preview.find((item) => item.field === fact.field);
          if (fromPreview) {
            const element = markRefs.current.get(fromPreview.quote);
            if (element) return element;
          }
          const direct = markRefs.current.get(fact.quote);
          if (direct) return direct;
          const value = fact.display?.trim().toLowerCase() ?? "";
          if (!value) return null;
          for (const [key, element] of markRefs.current) {
            const normalized = key.toLowerCase();
            if (value.includes(normalized) || normalized.includes(value)) return element;
          }
          return null;
        };

        const scheduleLift = (facts: MemoryFact[]) => {
          if (!facts.length) return;
          // Wait for the submitted sentence and its highlighted marks to enter the DOM.
          window.setTimeout(() => {
            const liftable = [...facts]
              .sort((a, b) => LIFT_ORDER.indexOf(a.field) - LIFT_ORDER.indexOf(b.field))
              .slice(0, 6);
            const withMarks = liftable
              .map((fact) => ({ fact, element: findMark(fact) }))
              .filter((entry): entry is { fact: MemoryFact; element: HTMLElement } => entry.element !== null);
            if (!withMarks.length || reduce) return;
            const target = memoryRef.current?.getBoundingClientRect();
            const targetX = target?.width ? target.left + 24 : window.innerWidth - 110;
            const targetY = target?.width ? target.top + 48 : 72;
            setFlyingIds((current) => [...current, ...withMarks.map(({ fact }) => fact.id)]);
            withMarks.forEach(({ fact, element }, index) => {
              window.setTimeout(() => {
                const rect = element.getBoundingClientRect();
                const key = element.textContent ?? fact.quote;
                setLiftedQuotes((current) => [...current, key]);
                setLiftSpawns((current) => [...current, {
                  fact, x: rect.left, y: rect.top - 8,
                  dx: targetX - rect.left, dy: targetY + index * 36 - rect.top,
                  key,
                }]);
              }, index * 160);
            });
            window.setTimeout(() => {
              setLiftSpawns((current) => current.filter((spawn) => !withMarks.some(({ fact }) => fact.id === spawn.fact.id)));
              setFlyingIds((current) => current.filter((id) => !withMarks.some(({ fact }) => fact.id === id)));
              setLandedIds((current) => [...current, ...withMarks.map(({ fact }) => fact.id)]);
              window.setTimeout(() => {
                setLandedIds((current) => current.filter((id) => !withMarks.some(({ fact }) => fact.id === id)));
              }, 1400);
            }, 1250 + withMarks.length * 160);
          }, 180);
        };

        const applyFacts = (facts: MemoryFact[]) => {
          if (!facts.length) return [] as MemoryFact[];
          const current = useAxiomStore.getState().memories;
          const fresh = facts.filter(
            (fact) => !current.some((item) => item.field === fact.field && item.value === fact.value),
          );
          if (!fresh.length) return [];
          addFacts(fresh);
          const added = useAxiomStore
            .getState()
            .memories.filter((item) => !current.some((prev) => prev.id === item.id));
          scheduleLift(added);
          return added;
        };

        const addedPreview = applyFacts(previewAll);
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
        const combined = [...addedPreview, ...addedLate];

        const top = recommend(useAxiomStore.getState().memories, { limit: 3 }).recommendations.map((item) => ({
          id: item.program.id,
          university: item.program.university,
          city: item.program.city,
          country: item.program.country,
          score: item.score,
          reason: item.reasons[0]?.text ?? null,
        }));
        setAnalysis({ stage: "result", facts: combined, top });
        if (analysisTimer.current) window.clearTimeout(analysisTimer.current);
        analysisTimer.current = window.setTimeout(() => {
          setAnalysis(null);
          analysisTimer.current = null;
        }, 3400);

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
            const finish = () => {
              if (audioRef.current === audio) audioRef.current = null;
              setPhase((current) => (current === "speaking" ? "idle" : current));
            };
            audio.addEventListener("ended", finish, { once: true });
            window.setTimeout(finish, 45000);
          });
        }
      } catch {
        setNotice("Не удалось обработать ответ. Попробуй отправить его ещё раз.");
        setPhase("idle");
        if (analysisTimer.current) window.clearTimeout(analysisTimer.current);
        analysisTimer.current = null;
        setAnalysis(null);
      } finally {
        busyRef.current = false;
      }
    },
    [addFacts, addMessage, reduce, speakReplies, stopAudio],
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
    setDraft("");
    setPhase("idle");
    setFlyingIds([]);
    setLiftSpawns([]);
    setLandedIds([]);
    setNotice(null);
    setLiftedQuotes([]);
    if (analysisTimer.current) window.clearTimeout(analysisTimer.current);
    analysisTimer.current = null;
    analysisStartAxiomRef.current = null;
    setAnalysis(null);
  }, [continuous, resetAll, stopAudio]);

  const runAnalysisTest = useCallback(() => {
    handleReset();
    window.setTimeout(() => {
      void submitAnswer(ANALYSIS_SAMPLE, "text");
    }, 360);
  }, [handleReset, submitAnswer]);

  const lastAxiom = useMemo(() => [...messages].reverse().find((message) => message.role === "axiom"), [messages]);
  const lastUser = useMemo(() => [...messages].reverse().find((message) => message.role === "user"), [messages]);
  const revealEnabled = !reduce && !analysis && lastAxiom?.id !== analysisStartAxiomRef.current;
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

  const panelFacts = memories.filter((item) => !flyingIds.includes(item.id));

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
        <main className="mx-auto w-full max-w-3xl px-4 pb-16 pt-4 sm:px-6">
          <ManualForm onCancel={() => setMode("voice")} />
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

      {liftSpawns.map((spawn) => (
        <motion.div
          key={spawn.fact.id}
          className="fixed z-[60] flex items-center gap-2.5 whitespace-nowrap border px-3 py-1.5 shadow-[0_20px_44px_-22px_rgba(0,0,0,0.95)]"
          style={{ left: spawn.x, top: spawn.y, willChange: "transform" }}
          initial={{
            opacity: 0,
            scale: 0.92,
            x: 0,
            y: 0,
            borderRadius: 6,
            backgroundColor: "rgba(111, 179, 238, 0.18)",
            borderColor: "rgba(127, 184, 240, 0.4)",
          }}
          animate={{
            opacity: [0, 1, 1, 0.9, 0],
            scale: [0.92, 1.02, 1, 0.92, 0.78],
            x: [0, 0, spawn.dx * 0.55, spawn.dx],
            y: [0, -38, spawn.dy * 0.5, spawn.dy],
            borderRadius: [6, 999, 999, 999, 999],
            backgroundColor: [
              "rgba(111, 179, 238, 0.18)",
              "rgba(11, 17, 25, 0.96)",
              "rgba(11, 17, 25, 0.96)",
              "rgba(11, 17, 25, 0.96)",
              "rgba(11, 17, 25, 0.96)",
            ],
            borderColor: [
              "rgba(127, 184, 240, 0.4)",
              "rgba(127, 184, 240, 0.3)",
              "rgba(127, 184, 240, 0.3)",
              "rgba(127, 184, 240, 0.3)",
              "rgba(127, 184, 240, 0.3)",
            ],
          }}
          transition={{ duration: 1.25, times: [0, 0.26, 0.52, 0.78, 1], ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="text-[9.5px] uppercase tracking-[0.18em] text-mist-500">{spawn.fact.label}</span>
          <span className="text-[12.5px] leading-none text-mist-100">{spawn.fact.display}</span>
        </motion.div>
      ))}

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
            onClick={runAnalysisTest}
            disabled={phase === "thinking"}
            title="Сбросить интервью и проиграть разбор примера"
            className="flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] text-violet-300 transition-colors hover:bg-white/[0.04] hover:text-violet-200 focus-visible:rounded-full disabled:opacity-40 sm:px-3"
          >
            <IconSparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Тест анализа</span>
            <span className="sr-only sm:hidden">Тест анализа</span>
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
            onClick={() => setSheetOpen(true)}
            className="relative flex h-9 items-center gap-1.5 rounded-full px-2.5 text-[12px] text-mist-500 transition-colors hover:text-mist-200 lg:hidden"
          >
            <IconBrain className="h-4 w-4 sm:hidden" />
            <span className="hidden sm:inline">Память</span>
            <span className="tabular-nums">{memories.length}</span>
            {!sheetOpen && landedIds.length
              ? landedIds.map((id) => (
                  <motion.span
                    key={id}
                    layoutId={`fact-${id}`}
                    className="absolute left-1/2 top-1/2 h-0.5 w-0.5 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0"
                  />
                ))
              : null}
          </button>
        </div>
      </header>

      <aside ref={memoryRef} className="fixed right-10 top-[22%] z-40 hidden w-[300px] lg:block" aria-label="Память AXIOM">
        <div className="mb-1 flex items-center gap-2.5 border-b border-white/10 pb-3.5">
          <span className="relative flex h-1.5 w-1.5">
            {landedIds.length ? (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#8cc5f5]/70" />
            ) : null}
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-[#8cc5f5]/70" />
          </span>
          <p className="text-[11px] uppercase tracking-[0.18em] text-mist-400">Память</p>
          <motion.span
            key={memories.length}
            initial={{ scale: 1.4, color: "#b3dafb" }}
            animate={{ scale: 1, color: "#4e5870" }}
            transition={{ type: "spring", stiffness: 320, damping: 20 }}
            className="ml-auto text-[11px] tabular-nums"
          >
            {memories.length}
          </motion.span>
        </div>
        <ul className="divide-y divide-white/[0.05]">
          <AnimatePresence initial={false}>
            {panelFacts.map((fact) => (
              <motion.li
                key={fact.id}
                layoutId={`fact-${fact.id}`}
                initial={{ opacity: 0, x: 18 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                transition={{ type: "spring", stiffness: 190, damping: 26, mass: 0.9 }}
                className="group relative flex items-center justify-between gap-3 rounded-lg px-2 py-3 transition-colors hover:bg-white/[0.03]"
              >
                {landedIds.includes(fact.id) ? (
                  <motion.span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-0 rounded-lg bg-[#6fb3ee]/[0.14]"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: 0 }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                  />
                ) : null}
                <FactRow fact={fact} />
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
              <ul className="space-y-1.5">
                {panelFacts.map((fact) => (
                  <li
                    key={fact.id}
                    className="flex items-center justify-between gap-4 rounded-xl bg-white/[0.03] px-4 py-3"
                  >
                    <FactRow fact={fact} />
                  </li>
                ))}
                {panelFacts.length === 0 ? (
                  <li className="text-[13px] text-mist-500">Просто расскажи о себе — факты появятся здесь сами.</li>
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
              <button type="button" className={buttonStyles("secondary", "md")} onClick={runAnalysisTest}>
                <IconSparkles className="h-4 w-4" />
                Протестить анализ
              </button>
              <button type="button" className={buttonStyles("ghost", "md")} onClick={handleReset}>
                Пройти интервью заново
              </button>
            </div>
          </div>
        ) : (
          <>
            {analysis ? (
              <div className="flex w-full max-w-2xl items-center justify-center px-1 py-2">
                <AnalysisStage data={analysis} />
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
              </>
            )}

            <div ref={answerRef} className="relative w-full max-w-xl" aria-live="polite">
              {lastUser ? (
                <motion.div
                  key={lastUser.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                  className="rounded-2xl bg-white/[0.03] px-5 py-4 text-left"
                >
                  <p className="mb-2 text-[10px] uppercase tracking-[0.18em] text-mist-600">Ты</p>
                  <p className="text-[14px] leading-[1.75] text-mist-300">
                    <AnswerText
                      text={lastUser.text}
                      highlights={lastUser.highlights}
                      liftedQuotes={liftedQuotes}
                      onMarkRef={(quote, element) => {
                        if (element) markRefs.current.set(quote, element);
                        else markRefs.current.delete(quote);
                      }}
                    />
                  </p>
                </motion.div>
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
              <div className="flex items-center gap-2 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-1.5 pl-4 transition-colors focus-within:border-[#7fb8f0]/40 focus-within:bg-white/[0.05]">
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
                  className="h-11 w-full bg-transparent text-[14px] text-mist-100 outline-none placeholder:text-mist-600"
                />
                <button
                  type="button"
                  onClick={() => void submitAnswer(draft, "text")}
                  disabled={!draft.trim()}
                  aria-label="Отправить"
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-mist-50 px-3.5 text-[13px] font-medium text-ink-950 transition-colors disabled:bg-white/[0.05] disabled:text-mist-600"
                >
                  Отправить
                  <IconArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-3 flex items-center justify-center gap-2 text-[11px] text-mist-600">
                <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px] tabular-nums">Enter</span>
                отправить · AXIOM отвечает голосом
              </p>
            </div>
          )}
        </footer>
      ) : null}
    </div>
  );
}
