"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconSparkles } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { supabaseConfigured } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/use-user";
import { useEmailAuth } from "@/lib/use-email-auth";

const INPUT =
  "h-12 w-full rounded-2xl border border-line bg-white/[.03] px-4 text-[14.5px] text-mist-100 outline-none transition-colors placeholder:text-mist-600 focus:border-violet-400/50";

export function AuthForm({ mode, next }: { mode: "signup" | "login"; next: string }) {
  const router = useRouter();
  const { user, loading } = useUser();
  const auth = useEmailAuth(next);

  useEffect(() => {
    if (loading || !user) return;
    router.replace(mode === "signup" ? "/onboarding" : next);
  }, [loading, user, mode, next, router]);

  if (!supabaseConfigured) {
    return (
      <p className="mt-8 rounded-2xl border border-amber-400/30 bg-amber-400/[.07] px-4 py-3 text-[12.5px] leading-relaxed text-amber-200">
        Аккаунты не подключены: нет NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Приложение работает
        локально, без облака.
      </p>
    );
  }

  return (
    <div className="mt-8">
      <button
        type="button"
        onClick={auth.signInWithGoogle}
        disabled={auth.busy}
        className="flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl bg-mist-50 text-[14.5px] font-medium text-ink-950 transition-colors hover:bg-white disabled:opacity-50"
      >
        <span aria-hidden="true" className="grid h-5 w-5 place-items-center rounded-full bg-ink-950 text-[11px] font-bold text-mist-50">
          G
        </span>
        Продолжить с Google
      </button>

      <div className="my-6 flex items-center gap-3 text-[11px] uppercase tracking-[.18em] text-mist-600">
        <span className="h-px flex-1 bg-white/[.08]" />
        или по почте
        <span className="h-px flex-1 bg-white/[.08]" />
      </div>

      {auth.stage === "choose" ? (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void auth.sendCode();
          }}
        >
          <label className="block">
            <span className="text-[12px] text-mist-500">Почта</span>
            <input
              type="email"
              value={auth.email}
              onChange={(event) => auth.setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
          <Button type="submit" size="lg" loading={auth.busy} className="w-full rounded-2xl">
            Получить код
          </Button>
        </form>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void auth.verifyCode();
          }}
        >
          <p className="flex items-start gap-2 text-[12.5px] leading-relaxed text-mist-300">
            <IconSparkles className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
            Письмо ушло на <span className="text-mist-100">{auth.email.trim()}</span>. Перейди по ссылке из письма или
            введи код ниже. Если письма нет — загляни в спам.
          </p>
          <input
            inputMode="numeric"
            value={auth.code}
            onChange={(event) => auth.setCode(event.target.value)}
            placeholder="123456"
            aria-label="Код из письма"
            className={`${INPUT} tnum text-center text-[18px] tracking-[.35em] placeholder:tracking-[.35em]`}
          />
          <Button type="submit" size="lg" loading={auth.busy} className="w-full rounded-2xl">
            Войти
          </Button>
          <button
            type="button"
            onClick={auth.backToEmail}
            className="text-[12.5px] text-mist-500 transition-colors hover:text-mist-200"
          >
            ← Другая почта или повторное письмо
          </button>
        </form>
      )}

      {auth.error ? (
        <p className="mt-4 rounded-2xl border border-rose-400/30 bg-rose-400/[.07] px-4 py-3 text-[12.5px] leading-relaxed text-rose-200">
          {auth.error}
        </p>
      ) : null}

      <p className="mt-6 text-[13px] text-mist-500">
        {mode === "signup" ? (
          <>
            Уже есть аккаунт?{" "}
            <Link href="/login" className="text-violet-300 transition-colors hover:text-violet-100">
              Войти
            </Link>
          </>
        ) : (
          <>
            Впервые здесь?{" "}
            <Link href="/signup" className="text-violet-300 transition-colors hover:text-violet-100">
              Создать аккаунт
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
