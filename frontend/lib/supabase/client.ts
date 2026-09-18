import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/** Без настроенных переменных приложение работает как раньше — локально. */
export const supabaseConfigured = Boolean(url && key);

export const createClient = (): SupabaseClient | null =>
  supabaseConfigured ? createBrowserClient(url!, key!) : null;
