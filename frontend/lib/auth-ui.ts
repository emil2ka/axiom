"use client";

import { create } from "zustand";

interface AuthUiState {
  open: boolean;
  reason: string | null;
  openDialog: (reason?: string) => void;
  closeDialog: () => void;
}

export const useAuthUi = create<AuthUiState>((set) => ({
  open: false,
  reason: null,
  openDialog: (reason) => set({ open: true, reason: reason ?? null }),
  closeDialog: () => set({ open: false, reason: null }),
}));
