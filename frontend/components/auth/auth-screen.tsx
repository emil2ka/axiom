import Link from "next/link";
import { AuthAside } from "@/components/auth/auth-aside";
import { AuthForm } from "@/components/auth/auth-form";
import { Logo } from "@/components/logo";

export function AuthScreen({
  mode,
  next,
  title,
  subtitle,
}: {
  mode: "signup" | "login";
  next: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <div className="flex flex-col px-5 py-6 sm:px-10 lg:px-14">
        <Link href="/" aria-label="AXIOM — на главную" className="self-start">
          <Logo />
        </Link>
        <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center py-10">
          <p className="eyebrow">{mode === "signup" ? "Новый аккаунт" : "Вход"}</p>
          <h1 className="mt-3 font-display text-[32px] leading-tight tracking-[-.045em] text-mist-50 sm:text-[36px]">
            {title}
          </h1>
          <p className="mt-2.5 text-[13.5px] leading-relaxed text-mist-400">{subtitle}</p>
          <AuthForm mode={mode} next={next} />
        </div>
        <p className="text-[11.5px] text-mist-600">AXIOM · LOCUS Startup Hackathon 2026 · Кейс 02</p>
      </div>
      <AuthAside />
    </div>
  );
}
