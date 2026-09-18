export const voiceEnabled = process.env.NEXT_PUBLIC_VOICE_ENABLED === "1";

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
    const audio = new Audio();
    audio.preload = "auto";
    audio.src = `/api/tts?text=${encodeURIComponent(text.slice(0, 900))}`;
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
    if (!started) return null;
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
