"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Button, buttonStyles } from "@/components/ui/button";
import { ProgressBar } from "@/components/ui/progress";
import { HighlightedText } from "@/components/flow/highlighted-text";
import { VoiceButton } from "@/components/interview/voice-button";
import { IconArrowRight, IconInfo, IconSend, IconSparkles, IconX } from "@/components/icons";
import { INTERVIEW_QUESTIONS, composeAgentReply, extractFacts, nextQuestion } from "@/lib/shared/engine";
import type { ChatMessage } from "@/lib/shared/engine";
import { extractFactsSmart } from "@/lib/api";
import { useSpeechRecognition } from "@/lib/use-speech";
import { useAxiomStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";
import { cn } from "@/lib/utils";

function uid(): string {
  return `m-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function TypingDots() {
  return (
    <span className="flex items-center gap-1 px-1 py-0.5" aria-label="AXIOM печатает">
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-mist-400"
          style={{ animationDelay: `${index * 140}ms` }}
        />
      ))}
    </span>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isAxiom = message.role === "axiom";
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      className={cn("flex w-full gap-3", isAxiom ? "justify-start" : "justify-end")}
    >
      {isAxiom ? (
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-teal-400/20 text-violet-300">
          <IconSparkles className="h-4 w-4" />
        </span>
      ) : null}
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-3 text-[13.5px] leading-relaxed sm:max-w-[75%]",
          isAxiom
            ? "border border-line-soft bg-white/[0.04] text-mist-200"
            : "border border-violet-500/30 bg-violet-500/15 text-mist-100",
        )}
      >
        {isAxiom ? (
          <span className="whitespace-pre-line">{message.text}</span>
        ) : (
          <HighlightedText text={message.text} highlights={message.highlights} />
        )}
      </div>
    </motion.div>
  );
}

export function ChatInterview({ onOpenManual }: { onOpenManual: () => void }) {
  const hydrated = useHydrated();
  const messages = useAxiomStore((state) => state.messages);
  const answered = useAxiomStore((state) => state.answeredQuestionIds);
  const memories = useAxiomStore((state) => state.memories);
  const addMessage = useAxiomStore((state) => state.addMessage);
  const addFacts = useAxiomStore((state) => state.addFacts);
  const markAnswered = useAxiomStore((state) => state.markAnswered);

  const [draft, setDraft] = useState("");
  const [typing, setTyping] = useState(false);
  const sendingRef = useRef(false);
  const voiceUsedRef = useRef(false);
  const initializedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const speech = useSpeechRecognition((text) => {
    voiceUsedRef.current = true;
    setDraft((current) => (current ? `${current} ${text}` : text));
  });

  // Память передаётся в движок — вопрос выбирается по пробелам и противоречиям,
  // а не по позиции в массиве.
  const question = nextQuestion(answered, memories);
  const answeredCount = INTERVIEW_QUESTIONS.filter((item) => answered.includes(item.id)).length;
  const progress = (answeredCount / INTERVIEW_QUESTIONS.length) * 100;

  useEffect(() => {
    if (!hydrated || initializedRef.current) return;
    initializedRef.current = true;
    if (useAxiomStore.getState().messages.length === 0) {
      const first = nextQuestion([]);
      if (first) addMessage({ id: uid(), role: "axiom", text: first.text, ts: Date.now() });
    }
  }, [hydrated, addMessage]);

  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTo({ top: node.scrollHeight, behavior: "smooth" });
  }, [messages.length, typing]);

  const send = async (override?: string) => {
    const text = (override ?? draft).trim();
    if (!text || sendingRef.current) return;
    sendingRef.current = true;

    const source = voiceUsedRef.current ? "voice" : "text";
    voiceUsedRef.current = false;
    speech.stop();

    const preview = extractFacts(text, { source });
    addMessage({
      id: uid(),
      role: "user",
      text,
      highlights: preview.map((item) => ({ quote: item.quote, field: item.field })),
      ts: Date.now(),
    });
    setDraft("");
    setTyping(true);

    const stateBefore = useAxiomStore.getState();
    const currentQuestion = nextQuestion(stateBefore.answeredQuestionIds, stateBefore.memories);

    try {
      const { facts } = await extractFactsSmart(text, source);
      addFacts(facts);
      if (currentQuestion) markAnswered(currentQuestion.id);
      const stateAfter = useAxiomStore.getState();
      const next = nextQuestion(stateAfter.answeredQuestionIds, stateAfter.memories);
      await new Promise((resolve) => setTimeout(resolve, 600));
      addMessage({ id: uid(), role: "axiom", text: composeAgentReply(facts, next), ts: Date.now() });
    } catch {
      addMessage({
        id: uid(),
        role: "axiom",
        text: "Что-то пошло не так с обработкой ответа. Попробуй ещё раз или заполни профиль вручную.",
        ts: Date.now(),
      });
    } finally {
      setTyping(false);
      sendingRef.current = false;
    }
  };

  if (!hydrated) {
    return <div className="card h-[480px] animate-shimmer" />;
  }

  const finished = question === null;

  return (
    <div className="card flex h-full min-h-[520px] flex-col overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-line-soft px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-teal-400/60" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-teal-400" />
          </span>
          <p className="font-display text-sm font-semibold text-mist-50">AI-интервью</p>
          <span className="hidden text-[11.5px] text-mist-500 sm:inline">голос или текст</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11.5px] tabular-nums text-mist-500">
            {answeredCount} / {INTERVIEW_QUESTIONS.length}
          </span>
          <div className="w-24 sm:w-36">
            <ProgressBar value={progress} size="sm" />
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5" aria-live="polite">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
        {typing ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-teal-400/20 text-violet-300">
              <IconSparkles className="h-4 w-4" />
            </span>
            <span className="rounded-2xl border border-line-soft bg-white/[0.04] px-4 py-3">
              <TypingDots />
            </span>
          </motion.div>
        ) : null}
      </div>

      <div className="border-t border-line-soft px-4 py-3.5 sm:px-5">
        {speech.error ? (
          <div className="mb-3 flex items-center justify-between gap-3 rounded-xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-[12px] text-amber-200">
            <span className="flex items-center gap-2">
              <IconInfo className="h-3.5 w-3.5" />
              {speech.error}
            </span>
            <button type="button" onClick={speech.clearError} aria-label="Скрыть" className="text-amber-300 hover:text-amber-100">
              <IconX className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : null}

        {finished ? (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-teal-400/25 bg-teal-400/[0.07] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-display text-sm font-semibold text-mist-50">Профиль собран</p>
              <p className="mt-0.5 text-[12.5px] text-mist-400">
                Проверь память справа и переходи к диагностике профиля.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={onOpenManual} className={buttonStyles("ghost", "md")}>
                Уточнить вручную
              </button>
              <Link href="/diagnosis" className={buttonStyles("primary", "md")}>
                К диагностике
                <IconArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        ) : (
          <>
            {question && question.quickReplies.length && !draft ? (
              <div className="mb-3 flex flex-wrap gap-2">
                {question.quickReplies.map((reply) => (
                  <button
                    key={reply}
                    type="button"
                    onClick={() => void send(reply)}
                    className="rounded-full border border-line bg-white/[0.03] px-3 py-1.5 text-[12.5px] text-mist-300 transition-colors hover:border-violet-500/40 hover:bg-violet-500/10 hover:text-violet-200"
                  >
                    {reply}
                  </button>
                ))}
              </div>
            ) : null}

            {speech.listening || speech.interim ? (
              <p className="mb-2 text-[12px] italic text-teal-300">
                {speech.listening ? "Слушаю… " : ""}
                {speech.interim}
              </p>
            ) : null}

            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
                rows={1}
                placeholder={question?.placeholder ?? "Напиши ответ"}
                aria-label="Ответ AXIOM"
                className="max-h-32 min-h-10 w-full resize-none rounded-xl border border-line bg-ink-900/70 px-3.5 py-2.5 text-sm text-mist-100 outline-none transition-colors placeholder:text-mist-600 focus:border-violet-500/60"
              />
              <VoiceButton listening={speech.listening} supported={speech.supported} onToggle={speech.toggle} />
              <Button
                onClick={() => void send()}
                aria-label="Отправить"
                className="h-10 w-10 px-0"
                disabled={!draft.trim() || typing}
              >
                <IconSend className="h-4 w-4" />
              </Button>
            </div>
            <p className="mt-2 text-[11px] text-mist-500">
              Голос работает в Chrome; если микрофона нет — просто пиши текстом. Enter — отправить.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
