export const voiceEnabled = process.env.NEXT_PUBLIC_VOICE_ENABLED === "1";

let llmQuotaBlocked = false;
let voiceQuotaBlocked = false;

/** Один раз сообщает интерфейсу, что упёрлись в лимит AI-запросов. */
export function consumeLlmQuotaFlag(): boolean {
  const blocked = llmQuotaBlocked;
  llmQuotaBlocked = false;
  return blocked;
}

/** Один раз сообщает интерфейсу, что упёрлись в лимит озвучки. */
export function consumeVoiceQuotaFlag(): boolean {
  const blocked = voiceQuotaBlocked;
  voiceQuotaBlocked = false;
  return blocked;
}

export interface LlmHistoryMessage {
  role: "user" | "axiom";
  text: string;
}

export interface LlmFactLine {
  label: string;
  value: string;
}

export async function llmReply(payload: {
  messages: LlmHistoryMessage[];
  known: LlmFactLine[];
  missing: string[];
  finished: boolean;
}): Promise<string | null> {
  try {
    const response = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(32000),
    });
    if (response.status === 429) llmQuotaBlocked = true;
    if (!response.ok) return null;
    const data = (await response.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}

export interface ExtractedFact {
  field: string;
  value: string;
  quote: string;
}

export async function llmExtract(
  text: string,
  question: string | null,
  known: { label: string; value: string }[],
): Promise<ExtractedFact[]> {
  try {
    const response = await fetch("/api/extract", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, question, known }),
      signal: AbortSignal.timeout(22000),
    });
    if (response.status === 429) llmQuotaBlocked = true;
    if (!response.ok) return [];
    const data = (await response.json()) as { facts?: ExtractedFact[] };
    return data.facts ?? [];
  } catch {
    return [];
  }
}

export async function synthesizeSpeech(text: string): Promise<HTMLAudioElement | null> {
  if (typeof Audio === "undefined") return null;
  try {
    const response = await fetch("/api/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: text.slice(0, 900) }),
      signal: AbortSignal.timeout(32000),
    });
    if (response.status === 429) {
      voiceQuotaBlocked = true;
      return null;
    }
    if (!response.ok) return null;

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.preload = "auto";
    const release = () => URL.revokeObjectURL(url);
    const started = await new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (value: boolean) => {
        if (settled) return;
        settled = true;
        resolve(value);
      };
      audio.addEventListener("playing", () => finish(true), { once: true });
      audio.addEventListener("error", () => finish(false), { once: true });
      window.setTimeout(() => finish(false), 15000);
      audio.play().catch(() => undefined);
    });
    if (!started) {
      release();
      return null;
    }
    audio.addEventListener("ended", release, { once: true });
    return audio;
  } catch {
    return null;
  }
}

export async function transcribeAudio(blob: Blob): Promise<string | null> {
  try {
    const form = new FormData();
    const extension = blob.type.includes("mp4") ? "m4a" : blob.type.includes("ogg") ? "ogg" : "webm";
    form.append("file", blob, `answer.${extension}`);
    const response = await fetch("/api/stt", { method: "POST", body: form, signal: AbortSignal.timeout(60000) });
    if (!response.ok) return null;
    const data = (await response.json()) as { text?: string };
    return data.text?.trim() || null;
  } catch {
    return null;
  }
}
