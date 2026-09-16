import { extractFacts } from "@/lib/shared/engine";
import type { ChatMessage, MemoryFact } from "@/lib/shared/engine";

const DEMO_TEXT =
  "Меня зовут Алия, я в 11 классе. Хочу поступить в Европу — важнее стипендия, бюджет до $15k в год. " +
  "IELTS 6.0, средний балл 4.5 из 5. Интересуюсь IT и программированием. Планирую поступление после 11 класса.";

export function buildDemoMemories(): MemoryFact[] {
  return extractFacts(DEMO_TEXT, { source: "demo", now: new Date("2026-09-16T12:00:00Z") });
}

export function buildDemoMessages(memories: MemoryFact[]): ChatMessage[] {
  const now = Date.now();
  return [
    {
      id: "demo-axiom-1",
      role: "axiom",
      text: "Это демо-профиль: я уже провёл интервью с Алией и собрал память. Ты можешь изменить любые факты — рекомендации пересчитаются.",
      ts: now,
    },
    {
      id: "demo-user-1",
      role: "user",
      text: DEMO_TEXT,
      highlights: memories.slice(0, 6).map((item) => ({ quote: item.quote, field: item.field })),
      ts: now + 1,
    },
  ];
}
