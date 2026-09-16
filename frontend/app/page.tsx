import Link from "next/link";
import type { Metadata } from "next";
import { Logo } from "@/components/logo";
import { DemoButton } from "@/components/shell/demo-button";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  IconArrowRight,
  IconBrain,
  IconCompass,
  IconMessage,
  IconRoute,
  IconScale,
  IconShield,
  IconSparkles,
  IconTarget,
  IconWand,
} from "@/components/icons";

export const metadata: Metadata = {
  title: "AXIOM — AI, который узнаёт тебя и строит поступление вокруг тебя",
};

const JOURNEY = [
  {
    icon: <IconMessage />,
    title: "AI-интервью",
    text: "Разговор голосом или текстом: страна, бюджет, IELTS, интересы, дедлайны.",
  },
  {
    icon: <IconBrain />,
    title: "Память",
    text: "AXIOM подсвечивает важные слова и превращает их в факты профиля.",
  },
  {
    icon: <IconTarget />,
    title: "Рекомендации",
    text: "Три и больше программ с объяснением «почему подходит именно тебе».",
  },
  {
    icon: <IconScale />,
    title: "Сравнение",
    text: "Стоимость, IELTS, дедлайны и стипендии — рядом, с подсветкой разницы.",
  },
  {
    icon: <IconWand />,
    title: "What If",
    text: "Меняешь бюджет или приоритет — рейтинг мгновенно перестраивается.",
  },
  {
    icon: <IconRoute />,
    title: "Маршрут",
    text: "Экзамены, документы, дедлайны и один конкретный следующий шаг.",
  },
];

const FEATURES = [
  {
    icon: <IconMessage />,
    title: "Интервью, а не анкета",
    text: "Голосовой диалог в Chrome, текстовый ввод — везде. AXIOM спрашивает по одному вопросу и слушает.",
  },
  {
    icon: <IconBrain />,
    title: "Память с подсветкой",
    text: "Сказал «хочу Европу и бюджет до $15k» — увидишь, как слова превращаются в факты профиля. Любой факт можно поправить.",
  },
  {
    icon: <IconCompass />,
    title: "Перестройка на лету",
    text: "«Стипендия теперь важнее страны» — рейтинг, объяснения и маршрут меняются на глазах.",
  },
  {
    icon: <IconShield />,
    title: "Честные данные",
    text: "Все программы помечены как демо-данные, у каждой — источник, а оценка соответствия не выдаётся за гарантию.",
  },
];

const DEMO_FACTS = [
  { label: "Страна", value: "Европа" },
  { label: "Бюджет", value: "до $15 000" },
  { label: "IELTS", value: "6.0" },
  { label: "Интересы", value: "IT и программирование" },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="sticky top-0 z-40 border-b border-line-soft bg-ink-950/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo />
          <nav className="hidden items-center gap-6 text-[13px] text-mist-400 md:flex">
            <a href="#journey" className="transition-colors hover:text-mist-100">
              Как это работает
            </a>
            <a href="#features" className="transition-colors hover:text-mist-100">
              Что умеет
            </a>
            <a
              href="https://github.com/emil2ka/axiom"
              target="_blank"
              rel="noreferrer"
              className="transition-colors hover:text-mist-100"
            >
              GitHub
            </a>
          </nav>
          <Link href="/interview" className={buttonStyles("primary", "md")}>
            Начать
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto w-full max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
          <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
            <div>
              <Badge tone="violet" dot>
                LOCUS Startup Hackathon 2026 · Кейс 02
              </Badge>
              <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.08] tracking-tight text-mist-50 sm:text-5xl">
                AI, который не просто отвечает, а <span className="text-gradient">узнаёт тебя</span> и строит
                поступление вокруг тебя
              </h1>
              <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-mist-400">
                AXIOM проводит живое интервью, запоминает важное — интересы, бюджет, IELTS, страну — и превращает это в
                персональный маршрут: университеты, сравнение, сценарии «а что если» и конкретный следующий шаг.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link href="/interview" className={buttonStyles("primary", "lg")}>
                  Начать интервью
                  <IconArrowRight className="h-4 w-4" />
                </Link>
                <DemoButton variant="secondary" size="lg" label="Посмотреть демо" />
              </div>
              <p className="mt-4 text-[12px] text-mist-500">
                Без регистрации · профиль хранится в твоём браузере · 5 минут до первого результата
              </p>
            </div>

            <div className="relative">
              <div
                aria-hidden="true"
                className="absolute -inset-8 -z-10 rounded-[36px] bg-gradient-to-br from-violet-500/20 via-transparent to-teal-400/15 blur-2xl"
              />
              <div className="card animate-float-slow p-5 sm:p-6">
                <div className="flex items-center justify-between">
                  <p className="flex items-center gap-2 font-display text-sm font-semibold text-mist-100">
                    <IconSparkles className="h-4 w-4 text-violet-300" />
                    Память AXIOM
                  </p>
                  <Badge tone="teal" dot>
                    live
                  </Badge>
                </div>

                <div className="mt-4 rounded-xl border border-line-soft bg-ink-900/60 p-3.5 text-[13px] leading-relaxed text-mist-300">
                  «Хочу <mark className="hl text-inherit">Европу</mark> и бюджет до{" "}
                  <mark className="hl text-inherit">$15k</mark>, IELTS 6.0»
                </div>

                <ul className="mt-4 grid grid-cols-2 gap-2.5">
                  {DEMO_FACTS.map((fact, index) => (
                    <li
                      key={fact.label}
                      className="animate-pop-in rounded-xl border border-line-soft bg-white/[0.035] px-3 py-2.5"
                      style={{ animationDelay: `${180 + index * 120}ms` }}
                    >
                      <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-mist-500">
                        {fact.label}
                      </p>
                      <p className="mt-1 text-[13px] font-medium text-mist-100">{fact.value}</p>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-center justify-between rounded-xl border border-violet-500/25 bg-violet-500/10 px-3.5 py-3">
                  <div>
                    <p className="text-[11px] text-mist-400">Топ-рекомендация</p>
                    <p className="mt-0.5 text-[13px] font-medium text-mist-100">
                      Budapest University of Technology and Economics
                    </p>
                    <p className="text-[11.5px] text-mist-400">$13 200/год · полная стипендия Stipendium Hungaricum</p>
                  </div>
                  <span className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-teal-400/70 font-display text-sm font-semibold tabular-nums text-teal-300">
                    100
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="journey" className="border-t border-line-soft py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-violet-300">Путь пользователя</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-mist-50">
              Разговор → память → маршрут
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-mist-400">
              Шесть шагов от первого экрана до конкретного действия. Каждый шаг опирается на то, что AXIOM уже знает о
              тебе.
            </p>

            <ol className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {JOURNEY.map((step, index) => (
                <li key={step.title} className="card card-hover p-5">
                  <div className="flex items-center justify-between">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                      {step.icon}
                    </span>
                    <span className="font-display text-sm tabular-nums text-mist-600">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>
                  <h3 className="mt-4 font-display text-base font-semibold text-mist-50">{step.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-mist-400">{step.text}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="features" className="border-t border-line-soft py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-teal-300">Фишки</p>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-mist-50">
              Почему AXIOM — не ещё один каталог
            </h2>
            <div className="mt-9 grid gap-4 md:grid-cols-2">
              {FEATURES.map((feature) => (
                <div key={feature.title} className="card p-5 sm:p-6">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/25 to-teal-400/20 text-violet-200">
                    {feature.icon}
                  </span>
                  <h3 className="mt-4 font-display text-base font-semibold text-mist-50">{feature.title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-mist-400">{feature.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t border-line-soft py-16">
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
            <div className="card relative overflow-hidden p-8 sm:p-12">
              <div
                aria-hidden="true"
                className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-violet-500/20 blur-3xl"
              />
              <div className="relative flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-display text-2xl font-semibold tracking-tight text-mist-50 sm:text-3xl">
                    Готов увидеть свой маршрут?
                  </h2>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-mist-400">
                    5 минут интервью — и AXIOM покажет, куда поступать, почему это подходит и что делать на этой неделе.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-3">
                  <Link href="/interview" className={buttonStyles("primary", "lg")}>
                    Начать интервью
                    <IconArrowRight className="h-4 w-4" />
                  </Link>
                  <DemoButton variant="secondary" size="lg" label="Демо-профиль" />
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line-soft">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-[11.5px] leading-relaxed text-mist-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="max-w-xl">
            Данные о программах — демонстрационные, проверяй условия и дедлайны на официальных сайтах вузов. Оценка
            соответствия — не гарантия поступления.
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
