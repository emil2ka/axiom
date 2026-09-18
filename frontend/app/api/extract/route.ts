import type { NextRequest } from "next/server";

export const runtime = "nodejs";

const ALLOWED_FIELDS = [
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

const SYSTEM_PROMPT = `Ты извлекаешь факты профиля абитуриента из его ответа на вопрос AI-наставника по поступлению.

Доступные поля:
- name — как зовут абитуриента
- grade — класс или курс (например "11 класс")
- country — страна или регион поступления
- budget — бюджет в год В ДОЛЛАРАХ, только число (например 15000)
- ielts — балл IELTS, только число (например 6.5)
- gpa — успеваемость (например "4.5 из 5" или "GPA 3.8")
- interests — направления (IT, дизайн, бизнес...)
- intake — когда планирует старт (например "осень 2027")
- priority — что важнее всего: "стипендия", "страна", "бюджет"
- language — языки, которые знает или готов учить
- constraints — ограничения (не готов учить новый язык, не хочет далеко и т.д.)

Верни СТРОГО JSON без пояснений: {"facts":[{"field":"country","value":"Европа","quote":"точная подстрока из ответа"}]}
- Бери только то, что ЯВНО сказано в ответе. Не выдумывай.
- quote — точная подстрока из ответа абитуриента.
- Если про GPA говорят "4.0 из 5" или "четыре ноль" — это gpa.
- Если ничего нет — {"facts":[]}`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "OPENROUTER_API_KEY is not configured" }, { status: 500 });
  }

  let text = "";
  let question: string | null = null;
  let known: { label: string; value: string }[] = [];
  try {
    const payload = (await request.json()) as {
      text?: string;
      question?: string | null;
      known?: { label: string; value: string }[];
    };
    text = (payload.text ?? "").trim();
    question = payload.question ?? null;
    known = payload.known ?? [];
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (!text) return Response.json({ facts: [] });

  const knownLine = known.length ? known.map((item) => `${item.label}: ${item.value}`).join("; ") : "пусто";

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
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: `Вопрос AXIOM: ${question ?? "нет"}\nОтвет абитуриента: ${text}\nУже известно: ${knownLine}`,
          },
        ],
        max_tokens: 1600,
        temperature: 0.2,
        reasoning: { effort: "low" },
        provider: { order: ["Z.AI"], allow_fallbacks: true },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (!response.ok) {
      return Response.json({ facts: [] });
    }

    const data = (await response.json()) as { choices?: { message?: { content?: string } }[] };
    const raw = data.choices?.[0]?.message?.content ?? "";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start === -1 || end === -1) return Response.json({ facts: [] });

    let parsed: { facts?: { field?: string; value?: string; quote?: string }[] };
    try {
      parsed = JSON.parse(cleaned.slice(start, end + 1));
    } catch {
      return Response.json({ facts: [] });
    }

    const facts = (parsed.facts ?? [])
      .filter(
        (item) =>
          typeof item.field === "string" &&
          (ALLOWED_FIELDS as readonly string[]).includes(item.field) &&
          typeof item.value === "string" &&
          item.value.trim().length > 0,
      )
      .map((item) => ({
        field: item.field as string,
        value: item.value!.trim().slice(0, 80),
        quote: (item.quote ?? "").trim().slice(0, 120),
      }))
      .slice(0, 10);

    return Response.json({ facts });
  } catch {
    return Response.json({ facts: [] });
  }
}
