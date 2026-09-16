"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FIELD_LABELS, formatUsd, knownCountryNames } from "@/lib/shared/engine";
import { INTEREST_LABEL_TO_TAGS } from "@/lib/shared/engine";
import type { MemoryField, MemoryFact } from "@/lib/shared/engine";
import { useAxiomStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const INTEREST_OPTIONS = Object.keys(INTEREST_LABEL_TO_TAGS);
const COUNTRY_OPTIONS = knownCountryNames();
const INTAKE_OPTIONS = ["Осень 2027", "Осень 2028", "Осень 2029"];
const PRIORITY_OPTIONS = ["Стипендия", "Страна", "Бюджет", "Рейтинг"];
const GRADE_OPTIONS = ["9 класс", "10 класс", "11 класс", "Выпускник школы"];

const inputClass =
  "h-10 w-full rounded-xl border border-line bg-ink-900/70 px-3 text-sm text-mist-100 outline-none transition-colors placeholder:text-mist-600 focus:border-violet-500/60";

function makeFact(field: MemoryField, value: string, display: string, numeric: number | undefined, index: number): MemoryFact {
  return {
    id: `f-${field}-manual-${Date.now().toString(36)}-${index}`,
    field,
    label: FIELD_LABELS[field],
    value,
    display,
    quote: "Добавлено вручную",
    confidence: 1,
    numeric,
    source: "manual",
    createdAt: Date.now(),
  };
}

function parseNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(",", ".");
  const value = Number.parseFloat(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

export function ManualForm({ onCancel }: { onCancel: () => void }) {
  const router = useRouter();
  const memories = useAxiomStore((state) => state.memories);
  const addFacts = useAxiomStore((state) => state.addFacts);

  const [prefill] = useState(() => {
    const get = (field: MemoryField) => memories.find((item) => item.field === field);
    return {
      name: get("name")?.display ?? "",
      grade: get("grade")?.value ?? "",
      countries: get("country")?.value.split(/;\s*/) ?? [],
      budget: get("budget")?.numeric?.toString() ?? "",
      ielts: get("ielts")?.numeric?.toString() ?? "",
      gpa: get("gpa")?.numeric?.toString() ?? "",
      interests: get("interests")?.value.split(/;\s*/) ?? [],
      intake: get("intake")?.value ?? "",
      priority: get("priority")?.value ?? "",
      constraints: get("constraints")?.value ?? "",
    };
  });

  const [name, setName] = useState(prefill.name);
  const [grade, setGrade] = useState(prefill.grade);
  const [countries, setCountries] = useState<string[]>(prefill.countries);
  const [budget, setBudget] = useState(prefill.budget);
  const [ielts, setIelts] = useState(prefill.ielts);
  const [gpa, setGpa] = useState(prefill.gpa);
  const [interests, setInterests] = useState<string[]>(prefill.interests);
  const [intake, setIntake] = useState(prefill.intake);
  const [priority, setPriority] = useState(prefill.priority);
  const [constraints, setConstraints] = useState(prefill.constraints);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const toggle = (list: string[], value: string, setter: (next: string[]) => void) => {
    setter(list.includes(value) ? list.filter((item) => item !== value) : [...list, value]);
  };

  const submit = () => {
    const facts: MemoryFact[] = [];
    let index = 0;
    const push = (field: MemoryField, value: string, display: string, numeric?: number) => {
      facts.push(makeFact(field, value, display, numeric, index));
      index += 1;
    };

    if (name.trim()) push("name", name.trim(), name.trim());
    if (grade) push("grade", grade, grade);
    if (countries.length) push("country", countries.join("; "), countries.join("; "));
    const budgetValue = parseNumber(budget);
    if (budgetValue) push("budget", formatUsd(budgetValue), `до ${formatUsd(budgetValue)}`, budgetValue);
    const ieltsValue = parseNumber(ielts);
    if (ieltsValue) push("ielts", ieltsValue.toFixed(1), ieltsValue.toFixed(1), ieltsValue);
    const gpaValue = parseNumber(gpa);
    if (gpaValue) push("gpa", `${gpaValue}/5`, `${gpaValue} из 5`, gpaValue);
    if (interests.length) push("interests", interests.join("; "), interests.join("; "));
    if (intake) push("intake", intake, intake);
    if (priority) push("priority", priority, priority);
    if (constraints.trim()) push("constraints", constraints.trim(), constraints.trim());

    addFacts(facts);
    router.push("/diagnosis");
  };

  const chipClass = (active: boolean) =>
    cn(
      "rounded-full border px-3 py-1.5 text-[12.5px] transition-colors",
      active
        ? "border-violet-500/50 bg-violet-500/20 text-violet-200"
        : "border-line bg-white/[0.03] text-mist-400 hover:bg-white/[0.07] hover:text-mist-200",
    );

  return (
    <Card className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="space-y-2">
          <span className="text-[12.5px] text-mist-400">Имя</span>
          <input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} placeholder="Алия" />
        </label>
        <label className="space-y-2">
          <span className="text-[12.5px] text-mist-400">Класс</span>
          <select className={inputClass} value={grade} onChange={(event) => setGrade(event.target.value)}>
            <option value="">Не выбрано</option>
            {GRADE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-[12.5px] text-mist-400">Бюджет в год, USD</span>
          <input
            className={inputClass}
            value={budget}
            inputMode="numeric"
            onChange={(event) => setBudget(event.target.value)}
            placeholder="15000"
          />
        </label>
        <label className="space-y-2">
          <span className="text-[12.5px] text-mist-400">IELTS</span>
          <input
            className={inputClass}
            value={ielts}
            inputMode="decimal"
            onChange={(event) => setIelts(event.target.value)}
            placeholder="6.0"
          />
        </label>
        <label className="space-y-2">
          <span className="text-[12.5px] text-mist-400">Средний балл (из 5)</span>
          <input
            className={inputClass}
            value={gpa}
            inputMode="decimal"
            onChange={(event) => setGpa(event.target.value)}
            placeholder="4.5"
          />
        </label>
        <label className="space-y-2">
          <span className="text-[12.5px] text-mist-400">Старт обучения</span>
          <select className={inputClass} value={intake} onChange={(event) => setIntake(event.target.value)}>
            <option value="">Не выбрано</option>
            {INTAKE_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-2">
          <span className="text-[12.5px] text-mist-400">Главный приоритет</span>
          <select className={inputClass} value={priority} onChange={(event) => setPriority(event.target.value)}>
            <option value="">Не выбрано</option>
            {PRIORITY_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2.5">
        <span className="text-[12.5px] text-mist-400">Страны и регионы</span>
        <div className="flex flex-wrap gap-2">
          {COUNTRY_OPTIONS.map((option) => (
            <button key={option} type="button" onClick={() => toggle(countries, option, setCountries)} className={chipClass(countries.includes(option))}>
              {option}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <span className="text-[12.5px] text-mist-400">Интересы</span>
        <div className="flex flex-wrap gap-2">
          {INTEREST_OPTIONS.map((option) => (
            <button key={option} type="button" onClick={() => toggle(interests, option, setInterests)} className={chipClass(interests.includes(option))}>
              {option}
            </button>
          ))}
        </div>
      </div>

      <label className="block space-y-2">
        <span className="text-[12.5px] text-mist-400">Ограничения</span>
        <textarea
          className={cn(inputClass, "h-auto min-h-20 py-2.5")}
          value={constraints}
          onChange={(event) => setConstraints(event.target.value)}
          placeholder="Например: не хочу учить новый язык"
        />
      </label>

      <div className="flex flex-wrap items-center gap-3">
        <Button size="lg" onClick={submit}>
          Сохранить профиль
        </Button>
        <Button size="lg" variant="ghost" onClick={onCancel}>
          Вернуться к интервью
        </Button>
      </div>
    </Card>
  );
}
