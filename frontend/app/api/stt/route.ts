import type { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "XAI_API_KEY is not configured" }, { status: 500 });
  }

  let audio: File | null = null;
  try {
    const form = await request.formData();
    const file = form.get("file");
    if (file instanceof File) audio = file;
  } catch {
    return Response.json({ error: "invalid form data" }, { status: 400 });
  }
  if (!audio || audio.size === 0) {
    return Response.json({ error: "file is required" }, { status: 400 });
  }

  const outbound = new FormData();
  outbound.append("format", "true");
  outbound.append("language", "ru");
  outbound.append("file", audio, audio.name || "audio.mp4");

  try {
    const response = await fetch("https://api.x.ai/v1/stt", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: outbound,
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return Response.json({ error: `xai stt ${response.status}`, detail: detail.slice(0, 300) }, { status: 502 });
    }

    const data = (await response.json()) as { text?: string };
    return Response.json({ text: (data.text ?? "").trim() });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "stt failed" }, { status: 502 });
  }
}
