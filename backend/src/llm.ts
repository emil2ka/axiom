import { z } from "zod";
import type { MemoryFact } from "./shared/types";
import { FIELD_LABELS } from "./shared/engine/index";

const MEMORY_FIELDS = [
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
] as const;

const llmFactSchema = z.object({
  field: z.enum(MEMORY_FIELDS),
  value: z.string().min(1).max(160),
  display: z.string().min(1).max(160).optional(),
  numeric: z.number().nullable().optional(),
  quote: z.string().min(1).max(240).optional(),
  confidence: z.number().min(0).max(1).optional(),
});

const llmFactsSchema = z.object({ facts: z.array(llmFactSchema).max(12) });
const llmSummarySchema = z.object({ summary: z.string().min(20).max(900) });

type Provider = "gemini" | "openai" | "none";

function provider(): Provider {
  const explicit = process.env.LLM_PROVIDER?.toLowerCase();
  if (explicit === "gemini" && process.env.GEMINI_API_KEY) return "gemini";
  if (explicit === "openai" && process.env.OPENAI_API_KEY) return "openai";
  if (process.env.GEMINI_API_KEY) return "gemini";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "none";
}

export function llmEnabled(): boolean {
  return provider() !== "none";
}

export function llmProviderName(): string {
  return provider();
}

async function callGemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.0-flash";
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 },
        }),
        signal: AbortSignal.timeout(12000),
      },
    );
    if (!response.ok) return null;
    const data = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? null;
  } catch {
    return null;
  }
}

async function callOpenAi(prompt: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.2,
      }),
      signal: AbortSignal.timeout(12000),
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    return data.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

async function callLlm(prompt: string): Promise<string | null> {
  const current = provider();
  if (current === "gemini") return callGemini(prompt);
  if (current === "openai") return callOpenAi(prompt);
  return null;
}

function safeJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    return null;
  }
}

const EXTRACT_PROMPT = (text: string) => `Ты — AXIOM, AI-наставник по поступлению в вузы.
Извлеки из реплики абитуриента только явно выраженные факты.
Верни строго JSON вида:
{"facts":[{"field":"country|budget|ielts|gpa|interests|intake|priority|language|constraints|name|grade","value":"короткое каноническое значение","display":"как показать пользователю","numeric":число_или_null,"quote":"точная фраза из реплики","confidence":0.0-1.0}]}
Правила: country — название страны или региона на русском; budget — в USD, число в numeric; ielts — число (например 6.5); gpa — число; interests — короткое направление на русском; priority — одно из: Страна, Бюджет, Стипендия, Рейтинг. Не выдумывай факты, которых нет в тексте. Максимум 8 фактов.
Реплика: «${text}»`;

export async function llmExtractFacts(text: string): Promise<MemoryFact[] | null> {
  const raw = await callLlm(EXTRACT_PROMPT(text));
  if (!raw) return null;
  const parsed = safeJson(raw);
  const result = llmFactsSchema.safeParse(parsed);
  if (!result.success) return null;
  const now = Date.now();
  return result.data.facts.map((item, index) => ({
    id: `f-${item.field}-llm-${now.toString(36)}-${index}`,
    field: item.field,
    label: FIELD_LABELS[item.field],
    value: item.value,
    display: item.display ?? item.value,
    quote: item.quote ?? text.slice(0, 140),
    confidence: item.confidence ?? 0.8,
    numeric: item.numeric ?? undefined,
    source: "text" as const,
    createdAt: now,
  }));
}

const SUMMARY_PROMPT = (profileJson: string) => `Ты — AXIOM, AI-наставник по поступлению. Перед тобой структурированный профиль абитуриента.
Напиши резюме профиля на русском: 2–3 предложения. Укажи: кто абитуриент, какая цель, 1–2 сильные стороны и 1 главное ограничение. Без гарантий поступления и без выдуманных фактов.
Верни строго JSON: {"summary":"текст"}
Профиль: ${profileJson}`;

export async function llmDiagnosisSummary(profileJson: string): Promise<string | null> {
  const raw = await callLlm(SUMMARY_PROMPT(profileJson));
  if (!raw) return null;
  const parsed = safeJson(raw);
  const result = llmSummarySchema.safeParse(parsed);
  if (!result.success) return null;
  return result.data.summary;
}
