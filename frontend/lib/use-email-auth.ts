"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type AuthStage = "choose" | "sent";

export function useEmailAuth(next: string) {
  const router = useRouter();
  const [stage, setStage] = useState<AuthStage>("choose");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const callbackUrl = () =>
    `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const signInWithGoogle = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    setBusy(true);
    setError(null);
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: callbackUrl(),
        queryParams: { prompt: "select_account" },
      },
    });
    if (oauthError) {
      setError("Google сейчас недоступен. Попробуй вход по почте.");
      setBusy(false);
    }
  }, [next]);

  const sendCode = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    const address = email.trim();
    if (!address.includes("@")) {
      setError("Укажи почту — на неё придёт ссылка и код.");
      return;
    }
    setBusy(true);
    setError(null);
    const { error: otpError } = await supabase.auth.signInWithOtp({
      email: address,
      options: { emailRedirectTo: callbackUrl(), shouldCreateUser: true },
    });
    setBusy(false);
    if (otpError) {
      setError("Письмо не ушло. Проверь адрес и попробуй ещё раз.");
      return;
    }
    setStage("sent");
  }, [email, next]);

  const verifyCode = useCallback(async (): Promise<boolean> => {
    const supabase = createClient();
    if (!supabase) return false;
    const token = code.replace(/\D/g, "");
    if (token.length < 6) {
      setError("Код из письма — шесть цифр.");
      return false;
    }
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email: email.trim(),
      token,
      type: "email",
    });
    setBusy(false);
    if (verifyError) {
      setError("Код не подошёл. Проверь письмо или запроси новое.");
      return false;
    }
    router.replace(next);
    router.refresh();
    return true;
  }, [code, email, next, router]);

  const backToEmail = useCallback(() => {
    setStage("choose");
    setCode("");
    setError(null);
  }, []);

  return {
    stage,
    email,
    setEmail,
    code,
    setCode,
    busy,
    error,
    setError,
    signInWithGoogle,
    sendCode,
    verifyCode,
    backToEmail,
  };
}
