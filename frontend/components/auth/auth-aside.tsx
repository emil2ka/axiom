import { IconShield } from "@/components/icons";

const CHIPS = [
  { label: "Бюджет", value: "до $12 000" },
  { label: "IELTS", value: "6.5" },
  { label: "Страна", value: "Европа" },
  { label: "Приоритет", value: "Стипендия" },
];

export function AuthAside() {
  return (
    <aside className="relative hidden overflow-hidden border-l border-line-soft lg:block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/campuses/delft.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-45"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-ink-950 via-ink-950/70 to-ink-950/30" />

      <div className="relative flex h-full flex-col justify-end p-10 xl:p-14">
        <p className="eyebrow">Память AXIOM</p>
        <h2 className="mt-4 max-w-md font-display text-[30px] leading-[1.1] tracking-[-.04em] text-mist-50">
          Профиль, память и маршрут — на любом устройстве
        </h2>
        <p className="mt-4 max-w-md text-[13.5px] leading-relaxed text-mist-300">
          Аккаунт хранит всё, что AXIOM узнал о тебе: факты, правки, выбранную цель и прогресс по шагам. Войди с
          телефона — и продолжишь с того же места.
        </p>

        <ul className="mt-8 flex flex-wrap gap-2">
          {CHIPS.map((chip) => (
            <li
              key={chip.label}
              className="rounded-full border border-white/12 bg-ink-950/50 px-3.5 py-2 text-[12px] backdrop-blur"
            >
              <span className="text-mist-500">{chip.label}: </span>
              <span className="text-[#b3dafb]">{chip.value}</span>
            </li>
          ))}
        </ul>

        <p className="mt-8 flex items-center gap-2 text-[11.5px] text-mist-500">
          <IconShield className="h-3.5 w-3.5" />
          Доступ к данным закрыт политиками базы: профиль виден только тебе.
        </p>
      </div>
    </aside>
  );
}
