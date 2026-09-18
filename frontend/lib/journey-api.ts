import type { SupabaseClient } from "@supabase/supabase-js";
import type { JourneySnapshot } from "@/lib/shared/engine";

const COLUMNS = "id, user_id, state, progress, revision, updated_at";

export interface JourneyRow {
  id: string;
  user_id: string;
  state: unknown;
  progress: unknown;
  revision: number;
  updated_at: string;
}

export async function fetchJourney(
  supabase: SupabaseClient,
  userId: string,
): Promise<JourneyRow | null> {
  const { data, error } = await supabase
    .from("journeys")
    .select(COLUMNS)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(`journey_fetch: ${error.message}`);
  return (data as JourneyRow | null) ?? null;
}

export async function insertJourney(
  supabase: SupabaseClient,
  userId: string,
  snapshot: JourneySnapshot,
): Promise<JourneyRow> {
  const { data, error } = await supabase
    .from("journeys")
    .insert({ user_id: userId, state: snapshot.state, progress: snapshot.progress })
    .select(COLUMNS)
    .single();
  if (error || !data) throw new Error(`journey_insert: ${error?.message ?? "no_row"}`);
  return data as JourneyRow;
}

/** Версия-условие: запись засчитывается, только если revision не менялся. */
export async function saveJourney(
  supabase: SupabaseClient,
  target: { id: string; revision: number },
  snapshot: JourneySnapshot,
): Promise<JourneyRow | null> {
  const { data, error } = await supabase
    .from("journeys")
    .update({
      state: snapshot.state,
      progress: snapshot.progress,
      revision: target.revision + 1,
    })
    .eq("id", target.id)
    .eq("revision", target.revision)
    .select(COLUMNS)
    .maybeSingle();
  if (error) throw new Error(`journey_save: ${error.message}`);
  return (data as JourneyRow | null) ?? null;
}
