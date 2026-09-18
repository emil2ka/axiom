import { cn } from "@/lib/utils";
import { IconCheck, IconMic } from "@/components/icons";

function InterviewScene() {
  return (
    <div className="flex h-full flex-col justify-end gap-2.5">
      <div className="max-w-[86%] rounded-xl rounded-bl-md border border-line-soft bg-white/[0.03] px-3.5 py-2.5 text-[12px] leading-relaxed text-mist-300">
        Куда хочешь поступить и что для тебя важно?
      </div>
      <div className="ml-auto max-w-[86%] rounded-xl rounded-br-md border border-violet-500/25 bg-violet-500/[0.12] px-3.5 py-2.5 text-[12px] leading-relaxed text-mist-100">
        Хочу Европу, бюджет до $15k. Интересует IT.
      </div>
      <div className="mt-1 flex items-center gap-2.5 rounded-full border border-line-soft bg-white/[0.03] py-1.5 pl-4 pr-1.5">
        <span className="text-[12px] text-mist-600">Ответить голосом или текстом…</span>
        <span className="ml-auto flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-violet-500 text-ink-950">
          <IconMic className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}

const FACTS = [
  { label: "Страна", value: "Европа" },
  { label: "Бюджет", value: "до $15 000" },
  { label: "IELTS", value: "6.0" },
  { label: "Интересы", value: "IT" },
];

function MemoryScene() {
  return (
    <div className="flex h-full flex-col justify-center gap-3.5">
      <p className="font-display text-[15.5px] leading-[1.65] text-mist-200">
        Хочу <mark className="hl text-inherit">Европу</mark> и бюджет до{" "}
        <mark className="hl text-inherit">$15k</mark>
      </p>
      <div className="grid grid-cols-2 gap-2">
        {FACTS.map((fact) => (
          <div key={fact.label} className="rounded-lg border border-line-soft bg-white/[0.02] px-2.5 py-2">
            <p className="text-[9px] uppercase tracking-[0.16em] text-mist-500">{fact.label}</p>
            <p className="mt-0.5 text-[12px] text-mist-100">{fact.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  { title: "Транскрипт с апостилем", done: true },
  { title: "CV и скан паспорта", done: true },
  { title: "Мотивационное письмо", done: false },
];

function RoadmapScene() {
  return (
    <div className="flex h-full flex-col justify-center gap-3">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-mist-500">Прогресс маршрута</span>
        <span className="tabular-nums text-mist-300">2 из 9</span>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full w-[24%] rounded-full bg-violet-500" />
      </div>
      <div className="mt-1.5 space-y-2.5">
        {STEPS.map((step) => (
          <div key={step.title} className="flex items-center gap-2.5">
            <span
              className={cn(
                "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border",
                step.done ? "border-violet-500 bg-violet-500 text-ink-950" : "border-line text-transparent",
              )}
            >
              <IconCheck className="h-3 w-3" />
            </span>
            <span
              className={cn(
                "text-[12.5px]",
                step.done ? "text-mist-500 line-through decoration-mist-600" : "text-mist-200",
              )}
            >
              {step.title}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const SCENES = [
  {
    number: "01",
    title: "Интервью",
    text: "Разговор голосом или текстом — как переписка, только умнее.",
    art: <InterviewScene />,
  },
  {
    number: "02",
    title: "Память",
    text: "Важные слова становятся фактами профиля. Любой можно поправить.",
    art: <MemoryScene />,
  },
  {
    number: "03",
    title: "Маршрут",
    text: "Экзамены, документы, дедлайны — и один конкретный следующий шаг.",
    art: <RoadmapScene />,
  },
];

export function FlowVignettes() {
  return (
    <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-3 lg:gap-5 lg:overflow-visible">
      {SCENES.map((scene) => (
        <article
          key={scene.number}
          className="group w-[82%] min-w-[82%] snap-center sm:w-[62%] sm:min-w-[62%] lg:w-auto lg:min-w-0"
        >
          <div className="card overflow-hidden p-4 transition-colors duration-300 group-hover:border-violet-500/30">
            <div className="h-[212px]">{scene.art}</div>
          </div>
          <div className="mt-4 flex items-baseline gap-3">
            <span className="font-display text-[13px] tabular-nums text-violet-400">{scene.number}</span>
            <h3 className="font-display text-[17px] text-mist-50">{scene.title}</h3>
          </div>
          <p className="mt-1.5 text-[13px] leading-[1.7] text-mist-400">{scene.text}</p>
        </article>
      ))}
    </div>
  );
}
