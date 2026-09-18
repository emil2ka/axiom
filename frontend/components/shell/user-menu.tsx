"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconChevronDown } from "@/components/icons";
import { buttonStyles } from "@/components/ui/button";
import { useAuthUi } from "@/lib/auth-ui";
import { useHydrated } from "@/lib/hooks";
import { useAxiomStore } from "@/lib/store";
import { createClient } from "@/lib/supabase/client";
import { useUser } from "@/lib/supabase/use-user";
import { flushSave } from "@/lib/sync";
import { SYNC_STATUS_TEXT, useSyncStatus } from "@/lib/use-sync-status";
import { cn } from "@/lib/utils";

export function UserMenu() {
  const router = useRouter();
  const { user, loading, configured } = useUser();
  const status = useSyncStatus();
  const openDialog = useAuthUi((state) => state.openDialog);
  const hydrated = useHydrated();
  const memoriesCount = useAxiomStore((state) => state.memories.length);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (!configured || loading) return null;

  if (!user) {
    return hydrated && memoriesCount > 0 ? (
      <button
        type="button"
        onClick={() => openDialog("Сохранить маршрут")}
        className={buttonStyles("secondary", "sm")}
      >
        Сохранить
      </button>
    ) : (
      <Link href="/login" className="text-[12px] text-mist-400 transition-colors hover:text-mist-100">
        Войти
      </Link>
    );
  }

  const initial = (user.email ?? "?").trim().charAt(0).toUpperCase();

  const signOut = async () => {
    await flushSave();
    const supabase = createClient();
    await supabase?.auth.signOut();
    useAxiomStore.getState().clearAccount();
    setOpen(false);
    router.push("/");
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-label="Меню аккаунта"
        className="flex items-center gap-1.5"
      >
        <span
          className="grid h-8 w-8 place-items-center rounded-full border border-violet-400/40 text-[13px] font-semibold text-mist-50"
          style={{ background: "radial-gradient(120% 120% at 32% 26%, rgba(139,124,246,.85) 0%, rgba(74,58,168,.9) 100%)" }}
        >
          {initial}
        </span>
        <IconChevronDown
          className={cn("h-3.5 w-3.5 text-mist-500 transition-transform", open && "rotate-180")}
        />
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-64 rounded-2xl border border-line bg-ink-900/95 p-2 shadow-2xl backdrop-blur-xl">
          <div className="px-3 py-2">
            <p className="truncate text-[12.5px] text-mist-100">{user.email}</p>
            <p className={cn("mt-0.5 text-[11px]", status === "error" ? "text-rose-300" : "text-mist-500")}>
              {SYNC_STATUS_TEXT[status] || "локально"}
            </p>
          </div>
          <div className="my-1 h-px bg-white/[.06]" />
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2 text-[13px] text-mist-200 transition-colors hover:bg-white/[.05]"
          >
            Дашборд
          </Link>
          <Link
            href="/progress"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2 text-[13px] text-mist-200 transition-colors hover:bg-white/[.05]"
          >
            Мой прогресс
          </Link>
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="block rounded-xl px-3 py-2 text-[13px] text-mist-200 transition-colors hover:bg-white/[.05]"
          >
            Профиль и данные
          </Link>
          <div className="my-1 h-px bg-white/[.06]" />
          <button
            type="button"
            onClick={() => void signOut()}
            className="block w-full rounded-xl px-3 py-2 text-left text-[13px] text-mist-400 transition-colors hover:bg-white/[.05] hover:text-mist-100"
          >
            Выйти
          </button>
        </div>
      ) : null}
    </div>
  );
}
