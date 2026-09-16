"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { mergeFacts } from "@/lib/shared/engine";
import type { ChatMessage, MemoryField, MemoryFact } from "@/lib/shared/engine";

export interface WhatIfState {
  presetId: string;
  budget: number | null;
  ielts: number | null;
  countryWeight: number;
  budgetWeight: number;
  scholarshipWeight: number;
}

export const DEFAULT_WHATIF: WhatIfState = {
  presetId: "balanced",
  budget: null,
  ielts: null,
  countryWeight: 1,
  budgetWeight: 1,
  scholarshipWeight: 1,
};

interface SeedPayload {
  memories: MemoryFact[];
  messages?: ChatMessage[];
  answeredQuestionIds?: string[];
  demoMode: boolean;
}

interface AxiomState {
  memories: MemoryFact[];
  messages: ChatMessage[];
  answeredQuestionIds: string[];
  compareIds: string[];
  favorites: string[];
  targetProgramId: string | null;
  roadmapDone: Record<string, boolean>;
  whatIf: WhatIfState;
  demoMode: boolean;

  addFacts: (facts: MemoryFact[]) => void;
  overrideMemory: (id: string, rawValue: string) => void;
  removeMemory: (id: string) => void;
  addMessage: (message: ChatMessage) => void;
  markAnswered: (questionId: string) => void;
  toggleCompare: (programId: string) => void;
  clearCompare: () => void;
  toggleFavorite: (programId: string) => void;
  setTargetProgram: (programId: string | null) => void;
  toggleRoadmapStep: (stepId: string) => void;
  clearRoadmapProgress: () => void;
  setWhatIf: (patch: Partial<WhatIfState>) => void;
  seed: (payload: SeedPayload) => void;
  resetAll: () => void;
}

const NUMERIC_FIELDS = new Set<MemoryField>(["budget", "ielts", "gpa"]);

function parseNumericValue(field: MemoryField, raw: string): number | undefined {
  if (!NUMERIC_FIELDS.has(field)) return undefined;
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(",", ".");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

export const useAxiomStore = create<AxiomState>()(
  persist(
    (set) => ({
      memories: [],
      messages: [],
      answeredQuestionIds: [],
      compareIds: [],
      favorites: [],
      targetProgramId: null,
      roadmapDone: {},
      whatIf: DEFAULT_WHATIF,
      demoMode: false,

      addFacts: (facts) =>
        set((state) => ({ memories: mergeFacts(state.memories, facts) })),

      overrideMemory: (id, rawValue) =>
        set((state) => ({
          memories: state.memories.map((item) => {
            if (item.id !== id) return item;
            const value = rawValue.trim();
            if (!value) return item;
            return {
              ...item,
              value,
              display: value,
              numeric: parseNumericValue(item.field, value),
              source: "manual",
              createdAt: Date.now(),
            };
          }),
        })),

      removeMemory: (id) => set((state) => ({ memories: state.memories.filter((item) => item.id !== id) })),

      addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

      markAnswered: (questionId) =>
        set((state) => ({
          answeredQuestionIds: state.answeredQuestionIds.includes(questionId)
            ? state.answeredQuestionIds
            : [...state.answeredQuestionIds, questionId],
        })),

      toggleCompare: (programId) =>
        set((state) => {
          if (state.compareIds.includes(programId)) {
            return { compareIds: state.compareIds.filter((id) => id !== programId) };
          }
          if (state.compareIds.length >= 3) return state;
          return { compareIds: [...state.compareIds, programId] };
        }),

      clearCompare: () => set({ compareIds: [] }),

      toggleFavorite: (programId) =>
        set((state) => ({
          favorites: state.favorites.includes(programId)
            ? state.favorites.filter((id) => id !== programId)
            : [...state.favorites, programId],
        })),

      setTargetProgram: (programId) => set({ targetProgramId: programId }),

      toggleRoadmapStep: (stepId) =>
        set((state) => ({ roadmapDone: { ...state.roadmapDone, [stepId]: !state.roadmapDone[stepId] } })),

      clearRoadmapProgress: () => set({ roadmapDone: {} }),

      setWhatIf: (patch) => set((state) => ({ whatIf: { ...state.whatIf, ...patch } })),

      seed: (payload) =>
        set({
          memories: payload.memories,
          messages: payload.messages ?? [],
          answeredQuestionIds: payload.answeredQuestionIds ?? [],
          demoMode: payload.demoMode,
          compareIds: [],
          favorites: [],
          targetProgramId: null,
          roadmapDone: {},
          whatIf: DEFAULT_WHATIF,
        }),

      resetAll: () =>
        set({
          memories: [],
          messages: [],
          answeredQuestionIds: [],
          compareIds: [],
          favorites: [],
          targetProgramId: null,
          roadmapDone: {},
          whatIf: DEFAULT_WHATIF,
          demoMode: false,
        }),
    }),
    {
      name: "axiom-store-v1",
      version: 1,
    },
  ),
);
