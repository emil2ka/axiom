import {
  DEFAULT_JOURNEY_WHATIF,
  emptyJourney,
  isEmptyJourney,
  mergeJourney,
  type JourneyProgress,
  type JourneySnapshot,
  type JourneyState,
} from "@/lib/shared/engine";
import { createClient } from "@/lib/supabase/client";
import { fetchJourney, insertJourney, saveJourney, type JourneyRow } from "@/lib/journey-api";

export type SyncStatus = "off" | "idle" | "syncing" | "saved" | "error";

const SAVE_DELAY = 700;

let status: SyncStatus = "off";
let attached: { userId: string; id: string; revision: number } | null = null;
let timer: ReturnType<typeof setTimeout> | null = null;
let pending: JourneySnapshot | null = null;
let saving = false;

const listeners = new Set<(status: SyncStatus) => void>();

export function subscribeSync(listener: (status: SyncStatus) => void): () => void {
  listeners.add(listener);
  listener(status);
  return () => {
    listeners.delete(listener);
  };
}

export function getSyncStatus(): SyncStatus {
  return status;
}

export function syncInfo(): { revision: number; attached: boolean } {
  return { revision: attached?.revision ?? 0, attached: attached !== null };
}

function setStatus(next: SyncStatus): void {
  if (status === next) return;
  status = next;
  listeners.forEach((listener) => listener(next));
}

function clearTimer(): void {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
}

export function toSnapshot(row: JourneyRow): JourneySnapshot {
  const state = (row.state ?? {}) as Partial<JourneyState>;
  const progress = (row.progress ?? {}) as Partial<JourneyProgress>;
  const whatIf =
    state.whatIf && typeof state.whatIf === "object"
      ? { ...DEFAULT_JOURNEY_WHATIF, ...state.whatIf }
      : { ...DEFAULT_JOURNEY_WHATIF };
  return {
    state: {
      memories: Array.isArray(state.memories) ? state.memories : [],
      messages: Array.isArray(state.messages) ? state.messages : [],
      answeredQuestionIds: Array.isArray(state.answeredQuestionIds) ? state.answeredQuestionIds : [],
      whatIf,
    },
    progress: {
      compareIds: Array.isArray(progress.compareIds) ? progress.compareIds : [],
      favorites: Array.isArray(progress.favorites) ? progress.favorites : [],
      targetProgramId:
        typeof progress.targetProgramId === "string" ? progress.targetProgramId : null,
      roadmapDone:
        progress.roadmapDone && typeof progress.roadmapDone === "object"
          ? progress.roadmapDone
          : {},
    },
  };
}

/**
 * Вход в аккаунт: подтянуть облачный профиль и, если это первый вход с целым
 * гостевым профилем на этом устройстве, объединить его с облаком.
 * Демо-профиль в аккаунт не утекает: он заменяется облачным состоянием.
 */
export async function attachAccount(
  userId: string,
  local: JourneySnapshot,
  localOwner: string | null,
  isDemo: boolean,
): Promise<{ snapshot: JourneySnapshot; revision: number }> {
  const supabase = createClient();
  if (!supabase) throw new Error("supabase_disabled");

  setStatus("syncing");
  try {
    const row = await fetchJourney(supabase, userId);
    if (!row) {
      // Первый вход: забираем локальный профиль, включая демо-профиль с лендинга, —
      // иначе сценарий «посмотреть демо → зарегистрироваться» оставлял бы пустой аккаунт.
      const claim = localOwner === null && !isEmptyJourney(local) ? local : emptyJourney();
      const inserted = await insertJourney(supabase, userId, claim);
      attached = { userId, id: inserted.id, revision: inserted.revision };
      setStatus("saved");
      return { snapshot: toSnapshot(inserted), revision: inserted.revision };
    }

    attached = { userId, id: row.id, revision: row.revision };

    if (!isDemo && localOwner === null && !isEmptyJourney(local)) {
      const first = await saveAttempt(supabase, userId, mergeJourney(local, toSnapshot(row)));
      if (first) return first;
      return { snapshot: toSnapshot(row), revision: row.revision };
    }

    setStatus("saved");
    return { snapshot: toSnapshot(row), revision: row.revision };
  } catch (error) {
    setStatus("error");
    throw error;
  }
}

async function saveAttempt(
  supabase: NonNullable<ReturnType<typeof createClient>>,
  userId: string,
  snapshot: JourneySnapshot,
): Promise<{ snapshot: JourneySnapshot; revision: number } | null> {
  if (!attached) return null;
  const saved = await saveJourney(supabase, attached, snapshot);
  if (saved) {
    attached = { userId, id: saved.id, revision: saved.revision };
    setStatus("saved");
    return { snapshot, revision: saved.revision };
  }
  const latest = await fetchJourney(supabase, userId);
  if (!latest) {
    setStatus("error");
    return null;
  }
  attached = { userId, id: latest.id, revision: latest.revision };
  const merged = mergeJourney(snapshot, toSnapshot(latest));
  const retried = await saveJourney(supabase, attached, merged);
  if (!retried) {
    setStatus("error");
    return null;
  }
  attached = { userId, id: retried.id, revision: retried.revision };
  setStatus("saved");
  return { snapshot: merged, revision: retried.revision };
}

/** Сохранение с задержкой: правки памяти не превращаются в шквал запросов. */
export function queueSave(snapshot: JourneySnapshot): void {
  if (!attached) return;
  pending = snapshot;
  setStatus("syncing");
  clearTimer();
  timer = setTimeout(() => {
    void flushSave();
  }, SAVE_DELAY);
}

export async function flushSave(): Promise<void> {
  clearTimer();
  if (!attached || !pending || saving) return;
  const supabase = createClient();
  if (!supabase) return;

  const snapshot = pending;
  const userId = attached.userId;
  pending = null;
  saving = true;
  try {
    const saved = await saveAttempt(supabase, userId, snapshot);
    if (!saved) setStatus("error");
  } catch {
    setStatus("error");
  } finally {
    saving = false;
    if (pending) queueSave(pending);
  }
}

export function detachAccount(): void {
  attached = null;
  pending = null;
  clearTimer();
  setStatus("idle");
}
