import type { NextRequest } from "next/server";

export const runtime = "nodejs";

async function synth(apiKey: string, text: string) {
  return fetch("https://api.x.ai/v1/tts", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: text.slice(0, 1200),
      voice_id: process.env.XAI_TTS_VOICE ?? "orion",
      language: "ru",
      optimize_streaming_latency: 2,
      text_normalization: true,
    }),
    signal: AbortSignal.timeout(45000),
  });
}

export async function GET(request: NextRequest) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return new Response("XAI_API_KEY is not configured", { status: 500 });

  const text = (request.nextUrl.searchParams.get("text") ?? "").trim();
  if (!text) return new Response("text is required", { status: 400 });

  try {
    const response = await synth(apiKey, text);
    if (!response.ok || !response.body) return new Response("tts failed", { status: 502 });
    return new Response(response.body, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response("tts failed", { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "XAI_API_KEY is not configured" }, { status: 500 });
  }

  let text = "";
  try {
    const payload = (await request.json()) as { text?: string };
    text = (payload.text ?? "").trim();
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }
  if (!text) return Response.json({ error: "text is required" }, { status: 400 });

  try {
    const response = await fetch("https://api.x.ai/v1/tts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text: text.slice(0, 1200),
        voice_id: process.env.XAI_TTS_VOICE ?? "orion",
        language: "ru",
        optimize_streaming_latency: 2,
        text_normalization: true,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return Response.json({ error: `xai tts ${response.status}`, detail: detail.slice(0, 300) }, { status: 502 });
    }

    const audio = await response.arrayBuffer();
    return new Response(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "tts failed" }, { status: 502 });
  }
}
