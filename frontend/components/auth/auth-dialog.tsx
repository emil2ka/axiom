"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { IconShield, IconSparkles, IconX } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useAuthUi } from "@/lib/auth-ui";
import { supabaseConfigured } from "@/lib/supabase/client";
import { useEmailAuth } from "@/lib/use-email-auth";

export function AuthDialog() {
  const router = useRouter();
  const pathname = usePathname();
  const open = useAuthUi((state) => state.open);
  const reason = useAuthUi((state) => state.reason);
  const closeDialog = useAuthUi((state) => state.closeDialog);
  const auth = useEmailAuth(pathname);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDialog();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeDialog]);

  useEffect(() => {
    if (!open) auth.backToEmail();
  }, [open, auth]);

  if (!open) return null;

  const verify = async () => {
    const ok = await auth.verifyCode();
    if (ok) {
      closeDialog();
      router.refresh();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-ink-975/85 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Вход в аккаунт"
    >
      <div className="card w-full max-w-md p-6 sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">Аккаунт AXIOM</p>
            <h2 className="mt-2 font-display text-2xl tracking-[-.04em] text-mist-50">
              {reason ?? "Сохранить прогресс"}
            </h2>
          </div>
          <button
            type="button"
            onClick={closeDialog}
            aria-label="Закрыть"
            className="text-mist-500 transition-colors hover:text-mist-100"
          >
            <IconX className="h-4.5 w-4.5" />
          </button>
        </div>

        <p className="mt-3 text-[13px] leading-relaxed text-mist-400">
          Профиль, память и пройденные шаги будут ждать тебя на любом устройстве. Один клик — и маршрут переживёт
          очистку браузера.
        </p>

        {!supabaseConfigured ? (
          <p className="mt-5 rounded-xl border border-amber-400/30 bg-amber-400/[.07] px-4 py-3 text-[12.5px] text-amber-200">
            В этой сборке аккаунты не подключены. Добавь NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY в
            окружение.
          </p>
        ) : (
          <>
            <button
              type="button"
              onClick={auth.signInWithGoogle}
              disabled={auth.busy}
              className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-full bg-mist-50 text-[14px] font-medium text-ink-950 transition-colors hover:bg-white disabled:opacity-50"
            >
              <span aria-hidden="true" className="grid h-4.5 w-4.5 place-items-center rounded-full bg-ink-950 text-[10px] font-bold text-mist-50">
                G
              </span>
              Продолжить с Google
            </button>

            <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-[.18em] text-mist-600">
              <span className="h-px flex-1 bg-white/[.08]" />
              или почта
              <span className="h-px flex-1 bg-white/[.08]" />
            </div>

            {auth.stage === "choose" ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  type="email"
                  value={auth.email}
                  onChange={(event) => auth.setEmail(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void auth.sendCode();
                  }}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-11 flex-1 rounded-full border border-line bg-white/[.03] px-4 text-[14px] text-mist-100 outline-none transition-colors placeholder:text-mist-600 focus:border-violet-400/50"
                />
                <Button onClick={() => void auth.sendCode()} loading={auth.busy} className="h-11">
                  Получить код
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="flex items-center gap-2 text-[12.5px] text-mist-300">
                  <IconSparkles className="h-4 w-4 text-violet-300" />
                  Письмо ушло на <span className="text-mist-100">{auth.email.trim()}</span>. Перейди по ссылке или введи
                  код из письма.
                </p>
                <div className="flex gap-3">
                  <input
                    inputMode="numeric"
                    value={auth.code}
                    onChange={(event) => auth.setCode(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter") void verify();
                    }}
                    placeholder="123456"
                    className="tnum h-11 flex-1 rounded-full border border-line bg-white/[.03] px-4 text-center text-[16px] tracking-[.3em] text-mist-100 outline-none transition-colors placeholder:tracking-[.3em] placeholder:text-mist-600 focus:border-violet-400/50"
                  />
                  <Button onClick={() => void verify()} loading={auth.busy} className="h-11">
                    Войти
                  </Button>
                </div>
                <button
                  type="button"
                  onClick={auth.backToEmail}
                  className="text-[12px] text-mist-500 transition-colors hover:text-mist-200"
                >
                  ← Другая почта
                </button>
              </div>
            )}
          </>
        )}

        {auth.error ? (
          <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/[.07] px-4 py-3 text-[12.5px] text-rose-200">
            {auth.error}
          </p>
        ) : null}

        {supabaseConfigured ? (
          <p className="mt-5 text-[12.5px] text-mist-500">
            Впервые здесь?{" "}
            <Link
              href="/signup"
              onClick={closeDialog}
              className="text-violet-300 transition-colors hover:text-violet-100"
            >
              Создать аккаунт
            </Link>
          </p>
        ) : null}

        <p className="mt-4 flex items-start gap-2 text-[11.5px] leading-relaxed text-mist-500">
          <IconShield className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Данные видны только тебе: доступ закрыт политиками на стороне базы. Аккаунт можно удалить вместе со всеми
          данными в один клик.
        </p>
      </div>
    </div>
  );
}
