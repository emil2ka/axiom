import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { DemoButton } from "@/components/shell/demo-button";
import { buttonStyles } from "@/components/ui/button";
import { CampusField } from "@/components/landing/campus-field";
import { FeatureShowcase } from "@/components/landing/feature-showcase";
import { HeroMemory } from "@/components/landing/hero-memory";
import { UniversityCard } from "@/components/universities/university-card";
import { IconArrowRight } from "@/components/icons";
import { groupUniversities } from "@/lib/university";
import type { UniversityGroup } from "@/lib/university";

const FEATURED_SLUGS = [
  "university-of-cambridge",
  "university-of-oxford",
  "massachusetts-institute-of-technology",
  "stanford-university",
];

export const metadata: Metadata = {
  title: "AXIOM — AI, который узнаёт тебя и строит поступление вокруг тебя",
};

export default async function LandingPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const instant = "instant" in params;
  const universities = groupUniversities();
  const featured = FEATURED_SLUGS.map((slug) => universities.find((group) => group.slug === slug)).filter(
    (group): group is UniversityGroup => Boolean(group),
  );
  const showcase = [...featured, ...universities.filter((group) => !featured.includes(group))].slice(0, 4);

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 bg-ink-950">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-7 md:flex">
            <a
              href="#journey"
              className="text-[11px] uppercase tracking-[0.16em] text-mist-500 transition-colors hover:text-mist-100"
            >
              Как это работает
            </a>
            <a
              href="#memory"
              className="text-[11px] uppercase tracking-[0.16em] text-mist-500 transition-colors hover:text-mist-100"
            >
              Память
            </a>
            <Link
              href="/universities"
              className="text-[11px] uppercase tracking-[0.16em] text-mist-500 transition-colors hover:text-mist-100"
            >
              Вузы
            </Link>
          </nav>
          <Link href="/interview" className={buttonStyles("primary", "sm")}>
            Начать
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div className="relative mx-auto min-h-[670px] w-full max-w-[1600px] sm:min-h-[650px] lg:min-h-[650px]">
            <CampusField />
            <div className="pointer-events-none absolute inset-y-0 left-0 z-30 w-full bg-gradient-to-r from-ink-950 via-ink-950/90 via-[46%] to-transparent lg:w-[74%]" />
            <div className="relative z-40 flex min-h-[670px] max-w-[630px] flex-col justify-start px-5 pb-16 pt-16 sm:min-h-[650px] sm:px-10 sm:pt-20 lg:justify-center lg:py-20 lg:pl-12 xl:pl-20">
              <h1 className="max-w-[14ch] font-display text-[38px] font-medium leading-[1.06] tracking-[-0.055em] text-mist-50 sm:text-[54px] lg:text-[58px] xl:text-[66px]">
                Поступление, собранное вокруг тебя
              </h1>
              <p className="mt-6 max-w-[35ch] text-[15px] leading-[1.7] text-mist-400">
                Расскажи о себе. Мы найдём университет и путь к нему.
              </p>
              <div className="mt-9 flex flex-col items-start gap-3 sm:flex-row">
                <Link href="/interview" className={buttonStyles("primary", "lg", "w-full sm:w-auto")}>
                  Начать интервью
                  <IconArrowRight className="h-4 w-4" />
                </Link>
                <DemoButton variant="secondary" size="lg" label="Посмотреть демо" className="w-full sm:w-auto" />
              </div>
            </div>
          </div>
        </section>

        <section id="memory" className="mx-auto w-full max-w-6xl px-4 pt-16 sm:px-6 sm:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
            <div>
              <p className="eyebrow">Память</p>
              <h2 className="mt-4 font-display text-[28px] leading-tight text-mist-50 sm:text-[34px]">
                Сказал — запомнил — перестроил
              </h2>
              <p className="mt-4 max-w-[40ch] text-sm leading-[1.8] text-mist-400">
                Важное из разговора становится частью твоего профиля. Меняй детали — маршрут обновится.
              </p>
            </div>
            <HeroMemory instant={instant} />
          </div>
        </section>

        <section id="journey" className="mt-20 border-t border-line-soft sm:mt-28">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="eyebrow">Путь</p>
                <h2 className="mt-4 font-display text-[28px] leading-tight text-mist-50 sm:text-[34px]">
                  Разговор → память → маршрут
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-[1.8] text-mist-400">
                  Шесть экранов продукта — вживую. Переключай шаги или просто смотри: каждая сцена работает
                  на реальных данных и правилах AXIOM.
                </p>
              </div>
            </div>

            <div className="mt-10 sm:mt-12">
              <FeatureShowcase />
            </div>
          </div>
        </section>

        <section id="universities" className="border-t border-line-soft">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="eyebrow">Каталог</p>
                <h2 className="mt-4 font-display text-[28px] leading-tight text-mist-50 sm:text-[34px]">
                  Вузы, о которых знает AXIOM
                </h2>
                <p className="mt-3 max-w-xl text-sm leading-[1.8] text-mist-400">
                  Кампус, программы, стоимость, стипендии и дедлайны — у каждого вуза своя страница. Открой любую и
                  посмотри, что она даёт тебе.
                </p>
              </div>
              <Link
                href="/universities"
                className="inline-flex items-center gap-1.5 text-[12px] text-violet-300 transition-colors hover:text-violet-100"
              >
                Все вузы
                <IconArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="mt-8 grid gap-5 sm:grid-cols-2">
              {showcase.map((group, index) => (
                <UniversityCard key={group.slug} group={group} priority={index < 2} />
              ))}
              <Link
                href="/universities"
                className="group flex min-h-[180px] flex-col justify-between rounded-[26px] border border-line-soft bg-white/[0.02] p-6 transition-colors hover:border-violet-400/35 sm:col-span-2 sm:min-h-0 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="font-display text-[22px] leading-tight tracking-[-.03em] text-mist-50">
                    Все {universities.length} вузов
                  </p>
                  <p className="mt-1.5 text-[13px] text-mist-400">
                    Отдельная страница-каталог: фильтр по странам и карточка каждого вуза.
                  </p>
                </div>
                <span className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-violet-300 transition-colors group-hover:text-violet-100 sm:mt-0">
                  Открыть каталог
                  <IconArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
                </span>
              </Link>
            </div>
          </div>
        </section>

        <section className="relative overflow-hidden border-t border-line-soft">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/campuses/cambridge.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-ink-950 via-ink-950/60 to-ink-950" />

          <div className="relative mx-auto w-full max-w-6xl px-4 py-24 text-center sm:px-6 sm:py-32">
            <h2 className="mx-auto max-w-2xl font-display text-[30px] leading-tight text-mist-50 sm:text-[40px]">
              Готов увидеть свой маршрут?
            </h2>
            <p className="mx-auto mt-4 max-w-[52ch] text-sm leading-[1.75] text-mist-300">
              5 минут интервью — и AXIOM покажет, куда поступать, почему это подходит и что делать на этой неделе.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link href="/interview" className={buttonStyles("primary", "lg", "w-full sm:w-auto")}>
                Начать интервью
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <DemoButton variant="secondary" size="lg" label="Демо-профиль" className="w-full sm:w-auto" />
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line-soft">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-[11.5px] leading-relaxed text-mist-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="max-w-xl">
            Данные о программах — демонстрационные. Условия и дедлайны проверяй на официальных сайтах вузов.
            Изображения кампусов — визуальные иллюстрации на основе фотографий.
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
