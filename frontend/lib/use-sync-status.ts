"use client";

import { useEffect, useState } from "react";
import { subscribeSync, type SyncStatus } from "@/lib/sync";

export const SYNC_STATUS_TEXT: Record<SyncStatus, string> = {
  off: "",
  idle: "облако готово",
  syncing: "сохраняю…",
  saved: "сохранено",
  error: "не сохраняется",
};

export function useSyncStatus(): SyncStatus {
  const [status, setStatus] = useState<SyncStatus>("idle");
  useEffect(() => subscribeSync(setStatus), []);
  return status;
}
