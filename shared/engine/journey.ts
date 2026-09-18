import type { ChatMessage, MemoryFact } from "../types";
import { mergeFacts, normalizeStoredMemories } from "./extract";

/** Настройки «А если иначе?», которые переживают смену устройства. */
export interface JourneyWhatIf {
  presetId: string;
  budget: number | null;
  ielts: number | null;
  countryWeight: number;
  budgetWeight: number;
  scholarshipWeight: number;
}

export interface JourneyState {
  memories: MemoryFact[];
  messages: ChatMessage[];
  answeredQuestionIds: string[];
  whatIf: JourneyWhatIf;
}

export interface JourneyProgress {
  compareIds: string[];
  favorites: string[];
  targetProgramId: string | null;
  roadmapDone: Record<string, boolean>;
}

export interface JourneySnapshot {
  state: JourneyState;
  progress: JourneyProgress;
}

export const DEFAULT_JOURNEY_WHATIF: JourneyWhatIf = {
  presetId: "balanced",
  budget: null,
  ielts: null,
  countryWeight: 1,
  budgetWeight: 1,
  scholarshipWeight: 1,
};

export const MESSAGE_LIMIT = 200;
const COMPARE_LIMIT = 3;

export function emptyJourneyState(): JourneyState {
  return {
    memories: [],
    messages: [],
    answeredQuestionIds: [],
    whatIf: { ...DEFAULT_JOURNEY_WHATIF },
  };
}

export function emptyJourneyProgress(): JourneyProgress {
  return {
    compareIds: [],
    favorites: [],
    targetProgramId: null,
    roadmapDone: {},
  };
}

export function emptyJourney(): JourneySnapshot {
  return { state: emptyJourneyState(), progress: emptyJourneyProgress() };
}

function union(first: string[], second: string[]): string[] {
  return [...new Set([...first, ...second])];
}

export function isDefaultJourneyWhatIf(value: JourneyWhatIf): boolean {
  return (
    value.presetId === DEFAULT_JOURNEY_WHATIF.presetId &&
    value.budget === DEFAULT_JOURNEY_WHATIF.budget &&
    value.ielts === DEFAULT_JOURNEY_WHATIF.ielts &&
    value.countryWeight === DEFAULT_JOURNEY_WHATIF.countryWeight &&
    value.budgetWeight === DEFAULT_JOURNEY_WHATIF.budgetWeight &&
    value.scholarshipWeight === DEFAULT_JOURNEY_WHATIF.scholarshipWeight
  );
}

/** Одна и та же реплика с двух устройств не должна задваиваться: ключ — id. */
export function mergeMessages(local: ChatMessage[], remote: ChatMessage[]): ChatMessage[] {
  const byId = new Map<string, ChatMessage>();
  for (const message of [...remote, ...local]) {
    const known = byId.get(message.id);
    if (!known || message.ts >= known.ts) byId.set(message.id, message);
  }
  return [...byId.values()].sort((a, b) => a.ts - b.ts).slice(-MESSAGE_LIMIT);
}

export function mergeRoadmapDone(
  local: Record<string, boolean>,
  remote: Record<string, boolean>,
): Record<string, boolean> {
  const merged: Record<string, boolean> = {};
  for (const source of [remote, local]) {
    for (const [stepId, done] of Object.entries(source)) {
      if (done) merged[stepId] = true;
    }
  }
  return merged;
}

export function isEmptyJourney(snapshot: JourneySnapshot): boolean {
  const doneSteps = Object.values(snapshot.progress.roadmapDone).some(Boolean);
  return (
    snapshot.state.memories.length === 0 &&
    snapshot.state.messages.length === 0 &&
    snapshot.state.answeredQuestionIds.length === 0 &&
    snapshot.progress.compareIds.length === 0 &&
    snapshot.progress.favorites.length === 0 &&
    snapshot.progress.targetProgramId === null &&
    !doneSteps
  );
}

/**
 * Слияние гостевого профиля с облачным при входе в аккаунт.
 *
 * Локальные факты считаются свежее: человек правил их только что, на этом
 * устройстве. Прогресс не спорит, а складывается: отметки шагов, избранное и
 * сравнение объединяются, повторных сообщений и чипов не появляется.
 */
export function mergeJourney(local: JourneySnapshot, remote: JourneySnapshot | null): JourneySnapshot {
  if (!remote) {
    return {
      state: {
        memories: normalizeStoredMemories(local.state.memories),
        messages: mergeMessages(local.state.messages, []),
        answeredQuestionIds: union([], local.state.answeredQuestionIds),
        whatIf: { ...local.state.whatIf },
      },
      progress: {
        compareIds: union([], local.progress.compareIds).slice(0, COMPARE_LIMIT),
        favorites: union([], local.progress.favorites),
        targetProgramId: local.progress.targetProgramId,
        roadmapDone: mergeRoadmapDone(local.progress.roadmapDone, {}),
      },
    };
  }

  const whatIf =
    isDefaultJourneyWhatIf(remote.state.whatIf) && !isDefaultJourneyWhatIf(local.state.whatIf)
      ? { ...local.state.whatIf }
      : { ...remote.state.whatIf };

  return {
    state: {
      memories: mergeFacts(remote.state.memories, local.state.memories),
      messages: mergeMessages(local.state.messages, remote.state.messages),
      answeredQuestionIds: union(remote.state.answeredQuestionIds, local.state.answeredQuestionIds),
      whatIf,
    },
    progress: {
      compareIds: union(remote.progress.compareIds, local.progress.compareIds).slice(0, COMPARE_LIMIT),
      favorites: union(remote.progress.favorites, local.progress.favorites),
      targetProgramId: remote.progress.targetProgramId ?? local.progress.targetProgramId,
      roadmapDone: mergeRoadmapDone(local.progress.roadmapDone, remote.progress.roadmapDone),
    },
  };
}
