"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/shell/app-shell";
import { Button } from "@/components/ui/button";
import { Card, SectionHeading } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { IconDownload, IconRefresh, IconShield, IconTrash, IconUsers } from "@/components/icons";
import { useAuthUi } from "@/lib/auth-ui";
import { formatMoment } from "@/lib/labels";
import { pickJourney, useAxiomStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/use-user";
import { syncInfo } from "@/lib/sync";
import { diagnose } from "@/lib/shared/engine";

const PROVIDER_LABELS: Record<string, string> = {
  google: "Google",
  email: "Почта",
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, configured } = useUser();
  const openDialog = useAuthUi((state) => state.openDialog);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<Record<string, { used: number; limit: number | null }> | null>(null);

  useEffect(() => {
    if (!user) {
      setUsage(null);
      return;
    }
    let active = true;
    fetch("/api/usage")
      .then((response) => response.json())
      .then((data: { account?: Record<string, { used: number; limit: number | null }> | null }) => {
        if (active) setUsage(data.account ?? null);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user]);

  const memories = useAxiomStore((state) => state.memories);
  const roadmapDone = useAxiomStore((state) => state.roadmapDone);
  const favorites = useAxiomStore((state) => state.favorites);
  const doneSteps = Object.values(roadmapDone).filter(Boolean).length;

  const exportData = () => {
    const state = useAxiomStore.getState();
    const payload = {
      exportedAt: new Date().toISOString(),
      account: user ? { email: user.email, createdAt: user.created_at } : null,
      journey: pickJourney(state),
      diagnosis: diagnose(state.memories),
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `axiom-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const removeAccount = async () => {
    if (!window.confirm("Удалить аккаунт вместе с профилем, памятью и прогрессом? Это необратимо.")) return;
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: rpcError } = await supabase.rpc("delete_own_account");
    setBusy(false);
    if (rpcError) {
      setError(`Не получилось удалить: ${rpcError.message}. Проверь, что миграция 0002 применена.`);
      return;
    }
    await supabase.auth.signOut();
    useAxiomStore.getState().clearAccount();
    router.push("/");
  };

  const signOut = async () => {
    const supabase = createClient();
    await supabase?.auth.signOut();
    useAxiomStore.getState().clearAccount();
    router.push("/");
  };

  const resetProgress = () => {
    if (!window.confirm("Начать заново? Профиль, память и прогресс очистятся в аккаунте и на этом устройстве.")) {
      return;
    }
    useAxiomStore.getState().resetAll();
    router.push("/onboarding");
  };

  return (
    <AppShell>
      <header className="mb-7">
        <h1 className="font-display text-4xl tracking-[-.05em] text-mist-50">Профиль</h1>
        <p className="mt-2 max-w-2xl text-[13.5px] leading-relaxed text-mist-400">
          Аккаунт хранит профиль, память и прогресс в облаке. Скачай данные или удали аккаунт — всё под твоим
          контролем.
        </p>
      </header>

      {!configured ? (
        <EmptyState
          icon={<IconUsers />}
          title="Аккаунты не подключены"
          description="В этой сборке нет переменных NEXT_PUBLIC_SUPABASE_URL и NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. Приложение работает локально, без облака."
        />
      ) : loading ? (
        <p className="text-mist-400">Проверяю сессию…</p>
      ) : !user ? (
        <EmptyState
          icon={<IconUsers />}
          title="Войди в аккаунт"
          description="Google в один клик или код на почту. Прогресс, память и маршрут будут доступны с любого устройства."
          action={<Button onClick={() => openDialog()}>Войти или создать аккаунт</Button>}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <SectionHeading eyebrow="Аккаунт" title={user.email ?? "Без почты"} />
            <dl className="mt-5 space-y-3 text-[13px]">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-mist-500">Вход через</dt>
                <dd className="text-mist-200">
                  {PROVIDER_LABELS[String(user.app_metadata?.provider ?? "email")] ?? "Почта"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-mist-500">Аккаунт создан</dt>
                <dd className="text-mist-200">
                  {user.created_at ? formatMoment(Date.parse(user.created_at)) : "—"}
                </dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-mist-500">Облачная версия</dt>
                <dd className="tnum text-mist-200">
                  {syncInfo().attached ? `#${syncInfo().revision}` : "подключается…"}
                </dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={() => void signOut()}>
                Выйти
              </Button>
            </div>
          </Card>

          <Card>
            <SectionHeading eyebrow="Данные" title="Что сохранено" />
            <dl className="mt-5 space-y-3 text-[13px]">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-mist-500">Фактов в памяти</dt>
                <dd className="tnum text-mist-200">{memories.length}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-mist-500">Шагов маршрута выполнено</dt>
                <dd className="tnum text-mist-200">{doneSteps}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-mist-500">Программ в избранном</dt>
                <dd className="tnum text-mist-200">{favorites.length}</dd>
              </div>
            </dl>
            <div className="mt-6">
              <Button variant="secondary" onClick={exportData}>
                <IconDownload className="h-4 w-4" />
                Скачать мои данные
              </Button>
            </div>
          </Card>

          <Card className="lg:col-span-2">
            <SectionHeading
              eyebrow="Лимиты"
              title="AI-запросы и озвучка"
              description="Лимиты сбрасываются каждый месяц. Распознавание речи не ограничено. Гостям доступны небольшие дневные лимиты."
            />
            {usage ? (
              <ul className="mt-5 space-y-5">
                {(
                  [
                    ["llm", "Запросы к AI"],
                    ["tts", "Озвучка ответов"],
                  ] as const
                ).map(([kind, label]) => {
                  const row = usage[kind];
                  if (!row) return null;
                  const limit = row.limit ?? 0;
                  const percent = limit ? Math.min(100, Math.round((row.used / limit) * 100)) : 0;
                  return (
                    <li key={kind}>
                      <div className="flex items-center justify-between gap-4 text-[13px]">
                        <span className="text-mist-300">{label}</span>
                        <span className="tnum text-mist-400">
                          {row.used} из {row.limit ?? "∞"}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/[.07]">
                        <div
                          className={percent >= 100 ? "h-full bg-rose-400/80" : "h-full bg-violet-400/80"}
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="mt-4 text-[13px] text-mist-400">
                Статистика появится после применения миграции 0003_api_limits.sql в Supabase.
              </p>
            )}
          </Card>

          <Card className="lg:col-span-2">
            <SectionHeading
              eyebrow="Приватность"
              title="Данные и удаление"
              description="Доступ к строкам закрыт политиками на стороне базы: никто, кроме тебя, не прочитает профиль. Удаление аккаунта стирает и профиль, и память, и прогресс."
            />
            <p className="mt-4 flex items-start gap-2 text-[12.5px] leading-relaxed text-mist-400">
              <IconShield className="mt-0.5 h-4 w-4 shrink-0 text-violet-300" />
              Секретные ключи живут только на сервере Next.js. В браузер отдаётся публичный publishable-ключ, а доступ
              ограничен RLS.
            </p>
            {error ? (
              <p className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/[.07] px-4 py-3 text-[12.5px] text-rose-200">
                {error}
              </p>
            ) : null}
            <div className="mt-6 flex flex-wrap gap-3">
              <Button variant="secondary" onClick={resetProgress}>
                <IconRefresh className="h-4 w-4" />
                Начать заново
              </Button>
              <Button variant="danger" onClick={() => void removeAccount()} loading={busy}>
                <IconTrash className="h-4 w-4" />
                Удалить аккаунт и все данные
              </Button>
            </div>
          </Card>
        </div>
      )}
    </AppShell>
  );
}
