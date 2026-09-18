import Link from "next/link";
import { Logo } from "@/components/logo";
import { UserMenu } from "@/components/shell/user-menu";
import { buttonStyles } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Оболочка для страниц вне основного пути: каталог и карточка вуза.
 * Шаговую полосу не показываем — эти экраны доступны и до интервью.
 */
export function SiteShell({
  children,
  active,
}: {
  children: React.ReactNode;
  active?: "universities";
}) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line-soft bg-ink-950/85 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Link href="/" aria-label="AXIOM — на главную" className="shrink-0">
            <Logo />
          </Link>
          <nav className="flex shrink-0 items-center gap-5 sm:gap-7">
            <Link
              href="/universities"
              className={cn(
                "hidden text-[12px] transition-colors sm:block",
                active === "universities" ? "text-mist-50" : "text-mist-400 hover:text-mist-100",
              )}
            >
              Вузы
            </Link>
            <Link href="/#journey" className="hidden text-[12px] text-mist-400 transition-colors hover:text-mist-100 md:block">
              Как это работает
            </Link>
            <UserMenu />
            <Link href="/interview" className={buttonStyles("primary", "sm")}>
              Начать
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-9">{children}</main>
      <footer className="border-t border-line-soft">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-[11.5px] leading-relaxed text-mist-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="max-w-xl">
            Данные о программах — демонстрационные, проверяй условия и дедлайны на официальных сайтах вузов. Изображения
            кампусов используются как визуальные ориентиры.
          </p>
          <p className="shrink-0">
            <a
              href="https://github.com/emil2ka/axiom"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-mist-300"
            >
              GitHub
            </a>
            <span className="mx-2">·</span>
            LOCUS Startup Hackathon 2026 · Кейс 02
          </p>
        </div>
      </footer>
    </div>
  );
}
