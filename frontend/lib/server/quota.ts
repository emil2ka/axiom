import { createHash } from "node:crypto";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type QuotaKind = "llm" | "tts";

export interface QuotaResult {
  allowed: boolean;
  used: number;
  limit: number | null;
  scope: "account" | "guest" | "disabled";
}

interface QuotaRow {
  allowed: boolean;
  used: number;
  quota: number | null;
}

/**
 * Списывает один запрос с лимита пользователя или гостя.
 * Если Supabase не настроен или миграция ещё не применена — не блокируем:
 * демо не должно падать из-за инфраструктуры. Лимит появляется вместе с базой.
 */
export async function consumeQuota(kind: QuotaKind): Promise<QuotaResult> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    return { allowed: true, used: 0, limit: null, scope: "disabled" };
  }

  try {
    const cookieStore = await cookies();
    const supabase = createClient(cookieStore);
    if (!supabase) return { allowed: true, used: 0, limit: null, scope: "disabled" };

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const { data, error } = await supabase.rpc("consume_api_quota", { p_kind: kind });
      const row = (Array.isArray(data) ? data[0] : null) as QuotaRow | null;
      if (error || !row) return { allowed: true, used: 0, limit: null, scope: "account" };
      return { allowed: row.allowed, used: row.used, limit: row.quota, scope: "account" };
    }

    const headerList = await headers();
    const forwarded = headerList.get("x-forwarded-for") ?? headerList.get("x-real-ip") ?? "";
    const ip = forwarded.split(",")[0]?.trim() || "unknown";
    const ipHash = createHash("sha256").update(ip).digest("hex").slice(0, 40);

    const { data, error } = await supabase.rpc("consume_anon_api_quota", {
      p_ip_hash: ipHash,
      p_kind: kind,
    });
    const row = (Array.isArray(data) ? data[0] : null) as QuotaRow | null;
    if (error || !row) return { allowed: true, used: 0, limit: null, scope: "guest" };
    return { allowed: row.allowed, used: row.used, limit: row.quota, scope: "guest" };
  } catch {
    return { allowed: true, used: 0, limit: null, scope: "disabled" };
  }
}

export function quotaResponse(result: QuotaResult, kind: QuotaKind): Response {
  return Response.json(
    {
      error: "quota_exceeded",
      kind,
      used: result.used,
      limit: result.limit,
      scope: result.scope,
      message:
        result.scope === "guest"
          ? "Дневной лимит гостя исчерпан. Создай аккаунт — лимиты выше."
          : "Лимит на этот месяц исчерпан.",
    },
    { status: 429, headers: { "Cache-Control": "no-store" } },
  );
}
