"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { IconWand } from "@/components/icons";
import { buildDemoMemories, buildDemoMessages } from "@/lib/demo";
import { useAxiomStore } from "@/lib/store";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function DemoButton({
  variant = "secondary",
  size = "md",
  label = "Демо-профиль",
  redirectTo = "/diagnosis",
  className,
}: {
  variant?: Variant;
  size?: "sm" | "md" | "lg";
  label?: string;
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();
  const seed = useAxiomStore((state) => state.seed);

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => {
        const memories = buildDemoMemories();
        seed({
          memories,
          messages: buildDemoMessages(memories),
          answeredQuestionIds: [],
          demoMode: true,
        });
        router.push(redirectTo);
      }}
    >
      <IconWand className="h-4 w-4" />
      {label}
    </Button>
  );
}
