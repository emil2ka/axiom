"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconPencil, IconTrash, IconX } from "@/components/icons";
import { Button } from "@/components/ui/button";
import type { MemoryFact } from "@/lib/shared/engine";
import { cn } from "@/lib/utils";

function MemoryChip({
  fact,
  editable,
  onUpdate,
  onRemove,
}: {
  fact: MemoryFact;
  editable: boolean;
  onUpdate: (id: string, value: string) => void;
  onRemove: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(fact.display);

  const save = () => {
    if (draft.trim()) onUpdate(fact.id, draft.trim());
    setEditing(false);
  };

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ type: "spring", stiffness: 380, damping: 30 }}
      className="group rounded-xl border border-line-soft bg-white/[0.035] px-3 py-2.5"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-mist-500">{fact.label}</span>
        {editable ? (
          <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
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
        ) : null}
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
            className="h-8 w-full rounded-lg border border-line bg-ink-900 px-2.5 text-[13px] text-mist-100 outline-none placeholder:text-mist-600"
          />
          <Button size="sm" onClick={save}>
            Ок
          </Button>
          <button
            type="button"
            aria-label="Отменить"
            onClick={() => setEditing(false)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-mist-500 hover:bg-white/[0.06]"
          >
            <IconX className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <p className="mt-1 text-[13.5px] font-medium leading-snug text-mist-100">{fact.display}</p>
      )}

      {fact.quote && !editing ? (
        <p className="mt-1 line-clamp-2 text-[11px] italic leading-snug text-mist-500" title={fact.quote}>
          «{fact.quote.replace(/^…+/, "").replace(/…+$/, "")}»
        </p>
      ) : null}
    </motion.li>
  );
}

export function MemoryPanel({
  facts,
  editable = true,
  onUpdate,
  onRemove,
  className,
  title = "Память AXIOM",
  emptyHint = "Факты появятся здесь по мере разговора.",
}: {
  facts: MemoryFact[];
  editable?: boolean;
  onUpdate: (id: string, value: string) => void;
  onRemove: (id: string) => void;
  className?: string;
  title?: string;
  emptyHint?: string;
}) {
  return (
    <section className={cn("card p-4 sm:p-5", className)} aria-label={title}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display text-sm font-semibold tracking-tight text-mist-50">{title}</h2>
        <span className="rounded-full border border-line bg-white/[0.04] px-2 py-0.5 text-[11px] tabular-nums text-mist-400">
          {facts.length}
        </span>
      </div>
      {facts.length === 0 ? (
        <p className="mt-3 text-[12.5px] leading-relaxed text-mist-500">{emptyHint}</p>
      ) : (
        <ul className="mt-3 space-y-2">
          <AnimatePresence initial={false}>
            {facts.map((fact) => (
              <MemoryChip key={fact.id} fact={fact} editable={editable} onUpdate={onUpdate} onRemove={onRemove} />
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}
