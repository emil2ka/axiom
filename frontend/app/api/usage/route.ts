import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

interface UsageRow {
  kind: string;
  used: number;
  quota: number | null;
}

export async function GET() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return Response.json({ account: null, configured: false });
  }

  const cookieStore = await cookies();
  const supabase = createClient(cookieStore);
  if (!supabase) return Response.json({ account: null, configured: false });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return Response.json({ account: null, configured: true });

  const { data, error } = await supabase.rpc("api_usage_status");
  if (error) return Response.json({ account: null, configured: true, ready: false });

  const rows = (Array.isArray(data) ? data : []) as UsageRow[];
  const account: Record<string, { used: number; limit: number | null }> = {};
  for (const row of rows) account[row.kind] = { used: row.used, limit: row.quota };

  return Response.json({ account, configured: true, ready: true }, { headers: { "Cache-Control": "no-store" } });
}
