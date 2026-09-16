"use client";

import { useState } from "react";
import { AppShell } from "@/components/shell/app-shell";
import { DemoButton } from "@/components/shell/demo-button";
import { SectionHeading } from "@/components/ui/card";
import { buttonStyles } from "@/components/ui/button";
import { InfoNote } from "@/components/ui/note";
import { ChatInterview } from "@/components/interview/chat-interview";
import { ManualForm } from "@/components/interview/manual-form";
import { MemoryPanel } from "@/components/flow/memory-chips";
import { useAxiomStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";

export default function InterviewPage() {
  const hydrated = useHydrated();
  const [mode, setMode] = useState<"chat" | "manual">("chat");
  const memories = useAxiomStore((state) => state.memories);
  const overrideMemory = useAxiomStore((state) => state.overrideMemory);
  const removeMemory = useAxiomStore((state) => state.removeMemory);

  return (
    <AppShell>
      <SectionHeading
        eyebrow="Шаг 1 из 6"
        title="AI-интервью"
        description="AXIOM задаёт вопросы, слушает ответы голосом или текстом и выделяет главное — так рождается память, на которой строится весь маршрут."
        right={
          <div className="flex flex-wrap items-center gap-2">
            {mode === "chat" ? (
              <button type="button" onClick={() => setMode("manual")} className={buttonStyles("secondary", "md")}>
                Заполнить вручную
              </button>
            ) : (
              <button type="button" onClick={() => setMode("chat")} className={buttonStyles("secondary", "md")}>
                Вернуться к интервью
              </button>
            )}
            <DemoButton label="Демо-профиль" />
          </div>
        }
        className="mb-6"
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="min-w-0">
          {mode === "chat" ? <ChatInterview onOpenManual={() => setMode("manual")} /> : <ManualForm onCancel={() => setMode("chat")} />}
        </div>

        <div className="space-y-4 lg:sticky lg:top-28">
          {hydrated ? (
            <MemoryPanel
              facts={memories}
              editable
              onUpdate={overrideMemory}
              onRemove={removeMemory}
              className="max-h-[58vh] overflow-y-auto"
            />
          ) : (
            <div className="card h-64 animate-shimmer" />
          )}
          <InfoNote tone="info">
            Любой факт можно поправить или удалить — это память AXIOM, и она сразу влияет на рекомендации и маршрут.
          </InfoNote>
        </div>
      </div>
    </AppShell>
  );
}
