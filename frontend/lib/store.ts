"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_JOURNEY_WHATIF, mergeFacts, normalizeStoredMemories, reparseFactValue } from "@/lib/shared/engine";
import type {
  ChatMessage,
  JourneySnapshot,
  JourneyWhatIf,
  MemoryField,
  MemoryFact,
} from "@/lib/shared/engine";

export type WhatIfState = JourneyWhatIf;

export const DEFAULT_WHATIF: WhatIfState = DEFAULT_JOURNEY_WHATIF;

interface SeedPayload {
  memories: MemoryFact[];
  messages?: ChatMessage[];
  answeredQuestionIds?: string[];
  demoMode: boolean;
}

export interface AxiomState {
  memories: MemoryFact[];
  messages: ChatMessage[];
  answeredQuestionIds: string[];
  compareIds: string[];
  favorites: string[];
  targetProgramId: string | null;
  roadmapDone: Record<string, boolean>;
  whatIf: WhatIfState;
  demoMode: boolean;
  /** Чей профиль лежит в браузере: id аккаунта или null у гостя. */
  syncOwner: string | null;
  /** Версия строки в облаке, с которой синхронизирован этот браузер. */
  syncRevision: number;

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
  applyJourney: (snapshot: JourneySnapshot, owner: string, revision: number) => void;
  setSyncMeta: (owner: string | null, revision: number) => void;
  clearAccount: () => void;
}

/** Снимок для облака: ровно те поля, которые лежат в journeys.state и journeys.progress. */
export function pickJourney(state: AxiomState): JourneySnapshot {
  return {
    state: {
      memories: state.memories,
      messages: state.messages,
      answeredQuestionIds: state.answeredQuestionIds,
      whatIf: state.whatIf,
    },
    progress: {
      compareIds: state.compareIds,
      favorites: state.favorites,
      targetProgramId: state.targetProgramId,
      roadmapDone: state.roadmapDone,
    },
  };
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
      syncOwner: null,
      syncRevision: 0,

      addFacts: (facts) =>
        set((state) => ({ memories: mergeFacts(state.memories, facts) })),

      overrideMemory: (id, rawValue) =>
        set((state) => ({
          memories: state.memories.map((item) => {
            if (item.id !== id) return item;
            const raw = rawValue.trim();
            if (!raw) return item;
            // Разбор общий с речью: иначе «10к» превращалось в бюджет $10.
            const parsed = reparseFactValue(item.field, raw);
            if (!parsed) return item;
            if (parsed.value === item.value && parsed.display === item.display) return item;
            // Память помнит, каким факт был раньше: история видна в диагностике.
            const revision = {
              value: item.value,
              display: item.display,
              numeric: item.numeric,
              source: item.source,
              at: item.createdAt,
            };
            const history = [revision, ...(item.history ?? [])].slice(0, 12);
            return {
              ...item,
              value: parsed.value,
              display: parsed.display,
              numeric: parsed.numeric,
              source: "manual",
              createdAt: Date.now(),
              history,
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

      applyJourney: (snapshot, owner, revision) =>
        set({
          memories: normalizeStoredMemories(snapshot.state.memories),
          messages: snapshot.state.messages,
          answeredQuestionIds: snapshot.state.answeredQuestionIds,
          whatIf: snapshot.state.whatIf,
          compareIds: snapshot.progress.compareIds,
          favorites: snapshot.progress.favorites,
          targetProgramId: snapshot.progress.targetProgramId,
          roadmapDone: snapshot.progress.roadmapDone,
          demoMode: false,
          syncOwner: owner,
          syncRevision: revision,
        }),

      setSyncMeta: (owner, revision) => set({ syncOwner: owner, syncRevision: revision }),

      clearAccount: () =>
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
          syncOwner: null,
          syncRevision: 0,
        }),
    }),
    {
      name: "axiom-store-v1",
      version: 2,
      /**
       * Профиль лежит в браузере и переживает обновления кода. Факты, записанные
       * прежними версиями разбора, могли сохранить искажённые числа — бюджет 10
       * вместо 10 000, средний балл не по той шкале. Прогоняем их через текущие
       * правила, а прежние значения уводим в историю факта, ничего не теряя.
       */
      migrate: (persisted, version) => {
        const state = persisted as Partial<AxiomState> | undefined;
        if (!state || version >= 2) return persisted as AxiomState;
        return {
          ...state,
          memories: normalizeStoredMemories(state.memories ?? []),
        } as AxiomState;
      },
    },
  ),
);
