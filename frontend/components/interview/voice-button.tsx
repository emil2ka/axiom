"use client";

import { IconMic, IconMicOff } from "@/components/icons";
import { cn } from "@/lib/utils";

export function VoiceButton({
  listening,
  supported,
  onToggle,
  className,
}: {
  listening: boolean;
  supported: boolean;
  onToggle: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={listening ? "Остановить запись" : "Ответить голосом"}
      title={supported ? (listening ? "Остановить запись" : "Ответить голосом") : "Голосовой ввод доступен в Chrome — используй текст"}
      className={cn(
        "relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all duration-200",
        listening
          ? "border-transparent bg-gradient-to-br from-violet-500 to-teal-400 text-ink-950"
          : "border-line bg-white/[0.05] text-mist-300 hover:bg-white/[0.09] hover:text-mist-100",
        !supported && "opacity-60",
        className,
      )}
    >
      {listening ? (
        <>
          <span aria-hidden="true" className="absolute inset-0 rounded-xl bg-violet-500/40 animate-pulse-ring" />
          <IconMicOff className="relative h-5 w-5" />
        </>
      ) : (
        <IconMic className="h-5 w-5" />
      )}
    </button>
  );
}
