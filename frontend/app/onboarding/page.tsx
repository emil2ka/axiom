"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/logo";
import { buttonStyles } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconArrowRight, IconBrain, IconCheck, IconCircleCheck, IconX } from "@/components/icons";
import { useHydrated } from "@/lib/hooks";
import { useAxiomStore } from "@/lib/store";
import { useUser } from "@/lib/supabase/use-user";
import {
  FIELD_LABELS,
  PROGRAMS,
  knownInterestLabels,
  reparseFactValue,
} from "@/lib/shared/engine";
import type { MemoryFact, MemoryField } from "@/lib/shared/engine";
import { cn } from "@/lib/utils";

const GRADES = ["10 класс", "11 класс", "Выпускник школы", "Колледж", "Другое"];

const PRIORITIES: { value: string; hint: string }[] = [
  { value: "Страна", hint: "важно место" },
  { value: "Бюджет", hint: "важна цена" },
  { value: "Стипендия", hint: "нужно покрытие" },
  { value: "Рейтинг", hint: "важен престиж" },
];

const INPUT =
  "h-12 w-full rounded-2xl border border-line bg-white/[.03] px-4 text-[15px] text-mist-100 outline-none transition-colors placeholder:text-mist-600 focus:border-violet-400/50";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-2 text-[12.5px] transition-colors",
        active
          ? "border-violet-400/50 bg-violet-500/15 text-mist-50"
          : "border-line text-mist-400 hover:border-white/25 hover:text-mist-100",
      )}
    >
      {children}
    </button>
  );
}

function buildFact(
  field: MemoryField,
  value: string,
  display: string,
  numeric?: number,
  intent?: "replace",
): MemoryFact {
  return {
    id: `onb-${field}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
    field,
    label: FIELD_LABELS[field],
    value,
    display,
    quote: display,
    confidence: 1,
    numeric,
    source: "manual",
    createdAt: Date.now(),
    intent,
  };
}

export default function OnboardingPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { user, loading, configured } = useUser();
  const memories = useAxiomStore((state) => state.memories);
  const addFacts = useAxiomStore((state) => state.addFacts);

  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("");
  const [grade, setGrade] = useState<string | null>(null);
  const [country, setCountry] = useState<string | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [budget, setBudget] = useState("");
  const [ielts, setIelts] = useState("");
  const [priority, setPriority] = useState<string | null>(null);
  const prefilled = useRef(false);

  const countries = useMemo(
    () => ["Европа", ...[...new Set(PROGRAMS.map((program) => program.country))].sort((a, b) => a.localeCompare(b, "ru"))],
    [],
  );
  const interestOptions = useMemo(() => knownInterestLabels(), []);

  useEffect(() => {
    if (!configured || loading) return;
    if (!user) router.replace("/signup?next=/onboarding");
  }, [configured, loading, user, router]);

  useEffect(() => {
    if (!hydrated || prefilled.current) return;
    prefilled.current = true;
    const byField = new Map(memories.map((fact) => [fact.field, fact]));
    const known = (field: MemoryField) => byField.get(field);
    const nameFact = known("name");
    if (nameFact) setName(nameFact.display);
    const gradeFact = known("grade");
    if (gradeFact) setGrade(gradeFact.display);
    const countryFact = known("country");
    if (countryFact) setCountry(countryFact.display);
    const interestFact = known("interests");
    if (interestFact) setInterests(interestFact.value.split(/;\s*/).filter(Boolean));
    const budgetFact = known("budget");
    if (budgetFact) setBudget(String(budgetFact.numeric ?? budgetFact.value));
    const ieltsFact = known("ielts");
    if (ieltsFact) setIelts(String(ieltsFact.numeric ?? ieltsFact.value));
    const priorityFact = known("priority");
    if (priorityFact) setPriority(priorityFact.display);
  }, [hydrated, memories]);

  const hasProfile = hydrated && memories.length > 0 && !editing && !done;

  const toggleInterest = (label: string) =>
    setInterests((current) =>
      current.includes(label) ? current.filter((item) => item !== label) : [...current, label],
    );

  const submit = () => {
    const facts: MemoryFact[] = [];
    const trimmedName = name.trim();
    if (trimmedName) facts.push(buildFact("name", trimmedName, trimmedName));
    if (grade) facts.push(buildFact("grade", grade, grade));
    if (country) facts.push(buildFact("country", country, country));
    if (interests.length) {
      const joined = interests.join("; ");
      facts.push(buildFact("interests", joined, joined, undefined, "replace"));
    }
    const budgetParsed = budget.trim() ? reparseFactValue("budget", budget) : null;
    if (budgetParsed) {
      facts.push(buildFact("budget", budgetParsed.value, budgetParsed.display, budgetParsed.numeric));
    }
    const ieltsParsed = ielts.trim() ? reparseFactValue("ielts", ielts) : null;
    if (ieltsParsed) {
      facts.push(buildFact("ielts", ieltsParsed.value, ieltsParsed.display, ieltsParsed.numeric));
    }
    if (priority) facts.push(buildFact("priority", priority, priority));
    if (facts.length) addFacts(facts);
    setDone(true);
  };

  if (!configured) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-950 px-4">
        <EmptyState
          icon={<IconBrain />}
          title="Аккаунты не подключены"
          description="Нет переменных Supabase в окружении — форма создания профиля недоступна, интервью работает локально."
          action={
            <Link href="/interview" className={buttonStyles("primary", "lg")}>
              Пройти интервью
              <IconArrowRight className="h-4 w-4" />
            </Link>
          }
        />
      </div>
    );
  }

  if (loading || !hydrated || !user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ink-950">
        <div className="h-24 w-24 animate-shimmer rounded-full" />
      </div>
    );
  }

  const summary = [
    name.trim() ? `Имя: ${name.trim()}` : null,
    grade ? `Класс: ${grade}` : null,
    country ? `Страна: ${country}` : null,
    interests.length ? `Интересы: ${interests.join(", ")}` : null,
    budget.trim() ? `Бюджет: ${budget.trim()}` : null,
    ielts.trim() ? `IELTS: ${ielts.trim()}` : null,
    priority ? `Приоритет: ${priority}` : null,
  ].filter((item): item is string => item !== null);

  return (
    <div className="flex min-h-dvh flex-col bg-ink-950">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-5 py-5">
        <Link href="/" aria-label="AXIOM — на главную">
          <Logo />
        </Link>
        {!done && !hasProfile ? (
          <Link href="/dashboard" className="text-[12px] text-mist-500 transition-colors hover:text-mist-200">
            Пропустить
          </Link>
        ) : null}
      </header>

      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-5 pb-16">
        {done ? (
          <div className="text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-violet-400/40 bg-violet-500/[.12] text-violet-200">
              <IconCircleCheck className="h-7 w-7" />
            </span>
            <h1 className="mt-6 font-display text-[34px] leading-tight tracking-[-.045em] text-mist-50">
              Профиль создан
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-mist-400">
              AXIOM уже знает о тебе главное. Осталось пройти короткое интервью — оно уточнит детали и соберёт
              персональный маршрут.
            </p>

            {summary.length ? (
              <ul className="mx-auto mt-7 flex max-w-xl flex-wrap justify-center gap-2">
                {summary.map((item) => (
                  <li key={item} className="rounded-full border border-line bg-white/[.03] px-3.5 py-2 text-[12.5px] text-mist-200">
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/interview" className={buttonStyles("primary", "lg")}>
                Пройти AI-интервью
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/dashboard" className={buttonStyles("secondary", "lg")}>
                Пока в дашборд
              </Link>
            </div>
            <button
              type="button"
              onClick={() => {
                setDone(false);
                setStep(0);
              }}
              className="mt-5 text-[12px] text-mist-600 transition-colors hover:text-mist-300"
            >
              Изменить ответы
            </button>
          </div>
        ) : hasProfile ? (
          <div className="text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full border border-line bg-white/[.03] text-mist-300">
              <IconCheck className="h-6 w-6" />
            </span>
            <h1 className="mt-5 font-display text-[30px] leading-tight tracking-[-.045em] text-mist-50">
              Профиль уже собран
            </h1>
            <p className="mx-auto mt-3 max-w-md text-[13.5px] leading-relaxed text-mist-400">
              В памяти {memories.length} фактов. Можно сразу продолжить путь или обновить ответы.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link href="/dashboard" className={buttonStyles("primary", "lg")}>
                В дашборд
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className={buttonStyles("secondary", "lg")}
              >
                Обновить ответы
              </button>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-4">
              <p className="text-[11px] uppercase tracking-[.18em] text-mist-500">
                Шаг {step + 1} из 2
              </p>
              <div className="h-px flex-1 bg-white/[.08]">
                <div
                  className="h-px bg-violet-400/80 transition-all duration-500"
                  style={{ width: step === 0 ? "50%" : "100%" }}
                />
              </div>
            </div>

            <h1 className="mt-7 font-display text-[32px] leading-tight tracking-[-.045em] text-mist-50 sm:text-[38px]">
              {step === 0 ? "Расскажи, кто ты" : "Что для тебя важно"}
            </h1>
            <p className="mt-2.5 max-w-xl text-[13.5px] leading-relaxed text-mist-400">
              {step === 0
                ? "Это основа профиля: AXIOM подставит её в рекомендации и маршрут. Можно заполнить не всё."
                : "Эти ответы определяют, какие программы поднимутся в топ. Всё можно поменять позже."}
            </p>

            <div className="mt-8 space-y-8">
              {step === 0 ? (
                <>
                  <label className="block">
                    <span className="text-[12.5px] text-mist-400">Как тебя зовут?</span>
                    <input
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Например, Алия"
                      autoComplete="given-name"
                      className={`mt-2 ${INPUT}`}
                    />
                  </label>

                  <div>
                    <p className="text-[12.5px] text-mist-400">Класс или статус</p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {GRADES.map((option) => (
                        <Chip
                          key={option}
                          active={grade === option}
                          onClick={() => setGrade(grade === option ? null : option)}
                        >
                          {option}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[12.5px] text-mist-400">Куда хочешь поступить</p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {countries.map((option) => (
                        <Chip
                          key={option}
                          active={country === option}
                          onClick={() => setCountry(country === option ? null : option)}
                        >
                          {option}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div>
                    <p className="text-[12.5px] text-mist-400">Что интересно — можно несколько</p>
                    <div className="mt-2.5 flex flex-wrap gap-2">
                      {interestOptions.map((option) => (
                        <Chip
                          key={option}
                          active={interests.includes(option)}
                          onClick={() => toggleInterest(option)}
                        >
                          {option}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-[12.5px] text-mist-400">Бюджет в год, $</span>
                      <input
                        value={budget}
                        onChange={(event) => setBudget(event.target.value)}
                        inputMode="numeric"
                        placeholder="12 000"
                        className={`mt-2 ${INPUT}`}
                      />
                    </label>
                    <label className="block">
                      <span className="text-[12.5px] text-mist-400">IELTS, если уже есть</span>
                      <input
                        value={ielts}
                        onChange={(event) => setIelts(event.target.value)}
                        inputMode="decimal"
                        placeholder="6.5"
                        className={`mt-2 ${INPUT}`}
                      />
                    </label>
                  </div>

                  <div>
                    <p className="text-[12.5px] text-mist-400">Что важнее всего при выборе</p>
                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                      {PRIORITIES.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => setPriority(priority === option.value ? null : option.value)}
                          aria-pressed={priority === option.value}
                          className={cn(
                            "flex items-center justify-between rounded-2xl border px-4 py-3.5 text-left transition-colors",
                            priority === option.value
                              ? "border-violet-400/50 bg-violet-500/15"
                              : "border-line hover:border-white/25",
                          )}
                        >
                          <span className="text-[13.5px] text-mist-100">{option.value}</span>
                          <span className="text-[11.5px] text-mist-500">{option.hint}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="mt-10 flex items-center gap-3">
              {step === 1 ? (
                <button type="button" onClick={() => setStep(0)} className={buttonStyles("secondary", "lg")}>
                  Назад
                </button>
              ) : null}
              <button
                type="button"
                onClick={() => (step === 0 ? setStep(1) : submit())}
                className={buttonStyles("primary", "lg", "flex-1 sm:flex-none")}
              >
                {step === 0 ? "Дальше" : "Создать профиль"}
                <IconArrowRight className="h-4 w-4" />
              </button>
              {step === 1 ? (
                <button
                  type="button"
                  onClick={submit}
                  className="text-[12.5px] text-mist-500 transition-colors hover:text-mist-200"
                >
                  <IconX className="mr-1 inline h-3.5 w-3.5" />
                  Не сейчас
                </button>
              ) : null}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
