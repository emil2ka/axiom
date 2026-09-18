import type { NextRequest } from "next/server";
import { consumeQuota, quotaResponse } from "@/lib/server/quota";

export const runtime = "nodejs";

interface HistoryMessage {
  role: "user" | "axiom";
  text: string;
}

interface LlmPayload {
  messages?: HistoryMessage[];
  known?: { label: string; value: string }[];
  missing?: string[];
  finished?: boolean;
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENROUTER_API_KEY is not configured" }, { status: 500 });
  }

  let payload: LlmPayload;
  try {
    payload = (await request.json()) as LlmPayload;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const quota = await consumeQuota("llm");
  if (!quota.allowed) return quotaResponse(quota, "llm");

  const known = payload.known ?? [];
  const missing = payload.missing ?? [];
  const knownLine = known.length ? known.map((fact) => `${fact.label}: ${fact.value}`).join("; ") : "пока пусто";
  const missingLine = missing.length ? missing.join(", ") : "ничего";

  const rules = [
    "Ты — AXIOM, персональный AI-наставник по поступлению в университеты.",
    "Отвечай только по-русски, обращайся на «ты», естественно и уважительно, как внимательный консультант. Без списков, заголовков, канцелярита и фраз «записал в память».",
    "Реагируй на смысл последней реплики: замечай цель, сомнение или ограничение и объясняй одним конкретным предложением, как это повлияет на подбор.",
    "Не выдумывай факты и не обещай поступление или стипендию. Пока требования конкретных программ не проверены, не говори, что абитуриент им соответствует или куда-то проходит. Не повторяй известное и не спрашивай о том, что уже сказано в последней реплике.",
    "Затем задай один короткий уместный вопрос по ещё не выясненной теме. Если человек спросил тебя о чём-то, сначала ответь на его вопрос.",
    "Если тема упомянута расплывчато (например, «денег мало» без суммы), уточни её числом вместо перехода к другой теме.",
    "Не утверждай ничего про бесплатное обучение, доступность программ, визы и стипендии без проверенного источника. Говори только о том, как ответ поможет подбору.",
    `Уже известно: ${knownLine}.`,
    `Ещё не выяснено: ${missingLine}.`,
  ];

  if (payload.finished) {
    rules.push(
      "Все ключевые темы разобраны. Поблагодари по имени, скажи что профиль собран и предложи перейти к диагностике. Вопросов больше не задавай.",
    );
  } else {
    rules.push(
      "Ответ — максимум 35 слов, 2 коротких предложения: полезная реакция и один вопрос. Без шаблонного повторения данных анкеты.",
    );
  }

  const messages = [
    { role: "system", content: rules.join("\n") },
    ...(payload.messages ?? []).slice(-12).map((message) => ({
      role: message.role === "axiom" ? "assistant" : "user",
      content: message.text,
    })),
  ];

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://axiom.local",
        "X-Title": "AXIOM hackathon prototype",
      },
      body: JSON.stringify({
        model: process.env.OPENROUTER_MODEL ?? "z-ai/glm-5.3-flash",
        messages,
        max_tokens: 420,
        temperature: 0.45,
        reasoning: { effort: "low" },
        provider: { order: ["Z.AI"], allow_fallbacks: true },
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return Response.json({ error: `openrouter ${response.status}`, detail: detail.slice(0, 300) }, { status: 502 });
    }

    const data = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (!text) return Response.json({ error: "empty completion" }, { status: 502 });
    return Response.json({ text });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "llm failed" }, { status: 502 });
  }
}
