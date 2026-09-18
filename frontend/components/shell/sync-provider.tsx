"use client";

import { useEffect, useRef } from "react";
import { pickJourney, useAxiomStore } from "@/lib/store";
import { useUser } from "@/lib/supabase/use-user";
import { attachAccount, detachAccount, flushSave, queueSave } from "@/lib/sync";

/**
 * Облачный слой поверх локального стора: вход подтягивает профиль,
 * правки уезжают в Supabase с задержкой, гость в аккаунт не утекает,
 * демо-профиль в облако не пишется вовсе.
 */
export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { user, loading, configured } = useUser();
  const hydratedRef = useRef(false);
  const applyingRef = useRef(false);
  const ownerRef = useRef<string | null>(null);

  useEffect(() => {
    const mark = () => {
      hydratedRef.current = true;
    };
    if (useAxiomStore.persist.hasHydrated()) mark();
    return useAxiomStore.persist.onFinishHydration(mark);
  }, []);

  useEffect(() => {
    if (!configured) return;
    const unsubscribe = useAxiomStore.subscribe((state) => {
      if (!hydratedRef.current || applyingRef.current) return;
      if (state.demoMode || !ownerRef.current) return;
      queueSave(pickJourney(state));
    });
    return unsubscribe;
  }, [configured]);

  useEffect(() => {
    if (!configured || loading) return;
    if (!user) {
      ownerRef.current = null;
      detachAccount();
      return;
    }
    if (ownerRef.current === user.id) return;
    ownerRef.current = user.id;

    const state = useAxiomStore.getState();
    applyingRef.current = true;
    attachAccount(user.id, pickJourney(state), state.syncOwner, state.demoMode)
      .then(({ snapshot, revision }) => {
        useAxiomStore.getState().applyJourney(snapshot, user.id, revision);
      })
      .catch(() => {
        // Статус ошибки виден в меню: локальный профиль продолжает работать.
      })
      .finally(() => {
        applyingRef.current = false;
      });
  }, [configured, loading, user]);

  useEffect(() => {
    if (!configured) return;
    const onHidden = () => {
      if (document.visibilityState === "hidden") void flushSave();
    };
    const onPageHide = () => void flushSave();
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, [configured]);

  return children;
}
