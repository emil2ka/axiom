"use client";

import { useEffect } from "react";
import { buildDemoMemories, buildDemoMessages } from "@/lib/demo";
import { useAxiomStore } from "@/lib/store";

export function DemoSeed() {
  useEffect(() => {
    if (!new URLSearchParams(window.location.search).has("demo")) return;
    const state = useAxiomStore.getState();
    if (state.memories.length > 0) return;
    const memories = buildDemoMemories();
    state.seed({
      memories,
      messages: buildDemoMessages(memories),
      answeredQuestionIds: [],
      demoMode: true,
    });
  }, []);

  return null;
}
