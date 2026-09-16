"use client";

import Link from "next/link";
import { AppShell } from "@/components/shell/app-shell";
import { DemoButton } from "@/components/shell/demo-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import { buttonStyles } from "@/components/ui/button";
import { IconArrowRight, IconBrain } from "@/components/icons";
import { useAxiomStore } from "@/lib/store";
import { useHydrated } from "@/lib/hooks";

export function StepGuard({
  requiredFacts = 3,
  children,
}: {
  requiredFacts?: number;
  children: React.ReactNode;
}) {
  const hydrated = useHydrated();
  const memoriesCount = useAxiomStore((state) => state.memories.length);

  if (!hydrated) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-44 w-full" />
          <Skeleton className="h-44 w-full" />
        </div>
      </AppShell>
    );
  }

  if (memoriesCount < requiredFacts) {
    return (
      <AppShell>
        <EmptyState
          icon={<IconBrain />}
          title="Память пока пуста"
          description="AXIOM строит маршрут из твоих ответов. Пройди короткое AI-интервью — или загрузи демо-профиль, чтобы сразу увидеть персональный результат."
          action={
            <div className="flex flex-col items-center gap-3 sm:flex-row">
              <Link href="/interview" className={buttonStyles("primary", "lg")}>
                Пройти интервью
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <DemoButton variant="secondary" size="lg" label="Загрузить демо-профиль" />
            </div>
          }
        />
      </AppShell>
    );
  }

  return <AppShell>{children}</AppShell>;
}
