import type { Metadata } from "next";
import { AuthScreen } from "@/components/auth/auth-screen";

export const metadata: Metadata = { title: "Вход" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const raw = typeof params.next === "string" ? params.next : null;
  const next = raw && raw.startsWith("/") ? raw : "/dashboard";

  return (
    <AuthScreen
      mode="login"
      next={next}
      title="С возвращением"
      subtitle="Войди тем же способом, что и в прошлый раз, — профиль и прогресс подтянутся из облака."
    />
  );
}
