import {
  PROGRAMS,
  applyWhatIf,
  buildRoadmap,
  diagnose,
  extractFacts,
  mergeFacts,
  recommend,
} from "@/lib/shared/engine";
import type {
  Diagnosis,
  MemoryFact,
  MemorySource,
  RecommendResult,
  Roadmap,
  WhatIfParams,
  WhatIfResult,
} from "@/lib/shared/engine";

const API_URL = (process.env.NEXT_PUBLIC_API_URL ?? "").replace(/\/+$/, "");

export const backendEnabled = API_URL.length > 0;

function timeoutSignal(ms: number): AbortSignal | undefined {
  if (typeof AbortSignal === "undefined") return undefined;
  if (typeof AbortSignal.timeout !== "function") return undefined;
  return AbortSignal.timeout(ms);
}

async function post<T>(path: string, body: unknown): Promise<T | null> {
  if (!backendEnabled) return null;
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: timeoutSignal(6000),
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function extractFactsSmart(
  text: string,
  source: MemorySource,
): Promise<{ facts: MemoryFact[]; engine: "rules" | "llm" }> {
  const local = extractFacts(text, { source });
  const remote = await post<{ facts: MemoryFact[]; engine: "rules" | "llm" }>("/extract", { text, source });
  if (remote?.facts?.length) {
    return { facts: mergeFacts(local, remote.facts), engine: remote.engine };
  }
  return { facts: local, engine: "rules" };
}

export async function recommendSmart(memories: MemoryFact[]): Promise<RecommendResult> {
  const remote = await post<RecommendResult>("/recommend", { memories });
  if (remote?.recommendations?.length) return remote;
  return recommend(memories);
}

export async function whatIfSmart(memories: MemoryFact[], params: WhatIfParams): Promise<WhatIfResult> {
  const remote = await post<WhatIfResult>("/whatif", { memories, params });
  if (remote?.recommendations?.length) return remote;
  return applyWhatIf(memories, params);
}

export async function roadmapSmart(memories: MemoryFact[], programId: string | null): Promise<Roadmap> {
  const remote = await post<Roadmap>("/roadmap", programId ? { memories, programId } : { memories });
  if (remote?.steps?.length) return remote;
  const program = programId ? PROGRAMS.find((item) => item.id === programId) ?? null : null;
  return buildRoadmap(memories, program);
}

export async function diagnoseSmart(memories: MemoryFact[]): Promise<Diagnosis & { engine?: "rules" | "llm" }> {
  const remote = await post<Diagnosis & { engine?: "rules" | "llm" }>("/diagnose", { memories });
  if (remote?.strengths) return remote;
  return diagnose(memories);
}
