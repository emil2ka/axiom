import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth/auth-screen";

export const metadata: Metadata = { title: "Создать аккаунт" };

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = typeof params.next === "string" ? params.next : null;
  const next = raw && raw.startsWith("/") ? raw : "/onboarding";

  return (
    <AuthScreen
      mode="signup"
      next={next}
      title="Создай аккаунт AXIOM"
      subtitle="Один клик через Google или код на почту. Интервью, вузы и маршрут откроются сразу после регистрации."
    />
  );
}
