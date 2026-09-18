"use client";

import { useState } from "react";
import Link from "next/link";
import { IconArrowRight, IconCheck, IconPencil, IconTrash, IconX } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { MemoryFact, MemoryField } from "@/lib/shared/engine";
import { formatMoment, SOURCE_LABELS } from "@/lib/labels";
import { cn } from "@/lib/utils";

interface MemoryGroup {
  id: string;
  label: string;
  fields: MemoryField[];
  empty: string;
}

const GROUPS: MemoryGroup[] = [
  { id: "identity", label: "Кто ты", fields: ["name", "grade"], empty: "Имя и класс — чтобы обращаться лично и знать твой этап." },
  { id: "goal", label: "Цель", fields: ["country", "interests", "intake", "priority"], empty: "Страна, направление и срок старта задают подбор." },
  { id: "money", label: "Деньги", fields: ["budget"], empty: "Бюджет отсекает программы, которые не потянуть." },
  { id: "academics", label: "Академическое", fields: ["gpa", "ielts", "language"], empty: "Оценки и IELTS определяют, какие пороги ты проходишь." },
  { id: "constraints", label: "Ограничения", fields: ["constraints"], empty: "Например, «не хочу учить новый язык» — учту в подборе." },
];

function FactCard({
  fact,
  onUpdate,
  onRemove,
}: {
  fact: MemoryFact;
  onUpdate: (id: string, value: string) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(fact.display);
  const [historyOpen, setHistoryOpen] = useState(false);
  const history = fact.history ?? [];

  const save = () => {
    if (draft.trim() && draft.trim() !== fact.display) onUpdate(fact.id, draft.trim());
    setEditing(false);
  };

  return (
    <li className="group rounded-xl border border-line-soft bg-white/[0.02] px-3.5 py-3 transition-colors hover:border-line-strong">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] uppercase tracking-[0.16em] text-mist-500">{fact.label}</span>
        <span className="flex items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <button
            type="button"
            aria-label={`Изменить: ${fact.label}`}
            onClick={() => {
              setDraft(fact.display);
              setEditing((value) => !value);
            }}
            className="flex h-6 w-6 items-center justify-center rounded-md text-mist-500 transition-colors hover:bg-white/[0.08] hover:text-mist-200"
          >
            <IconPencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            aria-label={`Удалить: ${fact.label}`}
            onClick={() => onRemove(fact.id)}
            className="flex h-6 w-6 items-center justify-center rounded-md text-mist-500 transition-colors hover:bg-rose-400/15 hover:text-rose-300"
          >
            <IconTrash className="h-3.5 w-3.5" />
          </button>
        </span>
      </div>

      {editing ? (
        <div className="mt-2 flex items-center gap-2">
          <input
            autoFocus
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") save();
              if (event.key === "Escape") setEditing(false);
            }}
            aria-label={`Новое значение: ${fact.label}`}
            className="h-9 w-full rounded-lg border border-violet-500/40 bg-ink-950 px-2.5 text-[13px] text-mist-100 outline-none placeholder:text-mist-600"
          />
          <Button size="sm" onClick={save}>
            <IconCheck className="h-3.5 w-3.5" />
            Ок
          </Button>
          <button
            type="button"
            aria-label="Отменить"
            onClick={() => setEditing(false)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-mist-500 hover:bg-white/[0.06]"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <p className="mt-1 text-[14px] leading-snug text-mist-50">{fact.display}</p>
      )}

      <div className="mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1">
        <span className="inline-flex items-center gap-1.5 text-[10.5px] text-mist-600">
          <span className={cn("h-1 w-1 rounded-full", fact.source === "voice" ? "bg-violet-400" : fact.source === "demo" ? "bg-teal-400" : "bg-mist-500")} />
          {SOURCE_LABELS[fact.source]}
        </span>
        {history.length ? (
          <button
            type="button"
            onClick={() => setHistoryOpen((value) => !value)}
            aria-expanded={historyOpen}
            className="text-[10.5px] text-mist-500 underline decoration-mist-700 underline-offset-2 transition-colors hover:text-mist-300"
          >
            {historyOpen ? "скрыть историю" : `изменено · до этого: ${history[0].display}`}
          </button>
        ) : null}
      </div>

      {historyOpen && history.length ? (
        <ul className="mt-2 space-y-1.5 border-t border-line-soft pt-2">
          {history.map((revision, index) => (
            <li key={`${revision.at}-${index}`} className="flex items-center justify-between gap-3 text-[11px] text-mist-500">
              <span className="min-w-0 truncate text-mist-600 line-through">{revision.display}</span>
              <span className="shrink-0 text-mist-600">{formatMoment(revision.at)}</span>
            </li>
          ))}
          <li className="flex items-center justify-between gap-3 text-[11px] text-mist-400">
            <span className="truncate">{fact.display}</span>
            <span className="shrink-0 text-mist-600">{formatMoment(fact.createdAt)}</span>
          </li>
        </ul>
      ) : null}

      {fact.quote && !editing && !historyOpen ? (
        <p className="mt-1.5 line-clamp-1 text-[11px] italic leading-snug text-mist-600" title={fact.quote}>
          «{fact.quote.replace(/^…+|«|»/g, "").replace(/^[\s,.;:-]+/, "").replace(/…+$/, "").trim()}»
        </p>
      ) : null}
    </li>
  );
}

export function MemoryBoard({
  facts,
  onUpdate,
  onRemove,
  className,
}: {
  facts: MemoryFact[];
  onUpdate: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  className?: string;
}) {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({ identity: true, goal: true, money: true, academics: true, constraints: true });

  return (
    <div className={cn("space-y-3", className)}>
      {GROUPS.map((group) => {
        const groupFacts = group.fields
          .map((field) => facts.find((fact) => fact.field === field))
          .filter((fact): fact is MemoryFact => Boolean(fact));
        if (!groupFacts.length) {
          return (
            <section key={group.id} className="rounded-xl border border-dashed border-line px-4 py-3">
              <h3 className="text-[12px] font-medium text-mist-400">{group.label}</h3>
              <p className="mt-1 text-[12px] leading-relaxed text-mist-600">Пока пусто.</p>
              <Link
                href="/interview"
                className="mt-2 inline-flex items-center gap-1 text-[11.5px] text-violet-300 transition-colors hover:text-violet-200"
              >
                Рассказать в интервью
                <IconArrowRight className="h-3 w-3" />
              </Link>
            </section>
          );
        }
        return (
          <section key={group.id} className="rounded-xl border border-line-soft bg-ink-950/40 p-3.5">
            <button
              type="button"
              onClick={() => setOpenGroups((value) => ({ ...value, [group.id]: !value[group.id] }))}
              aria-expanded={openGroups[group.id]}
              className="flex w-full items-center justify-between gap-3 text-left"
            >
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-mist-400">{group.label}</h3>
              <span className="tnum text-[11px] text-mist-600">
                {groupFacts.length}
                {!openGroups[group.id] ? " · раскрыть" : ""}
              </span>
            </button>
            {openGroups[group.id] ? (
              <ul className="mt-3 space-y-2">
                {groupFacts.map((fact) => (
                  <FactCard key={fact.id} fact={fact} onUpdate={onUpdate} onRemove={onRemove} />
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
