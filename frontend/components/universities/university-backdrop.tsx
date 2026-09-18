import Image from "next/image";
import { campusPhoto, campusTint } from "@/lib/university";

/**
 * Кампус на весь экран: слева здание выходит из черноты мягким градиентом,
 * к правой стороне проявляется. Лёгкий блюр гасит детали под текстом.
 */
export function UniversityBackdrop({ programId }: { programId: string }) {
  const photo = campusPhoto(programId);
  const tint = campusTint(programId);

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden">
      <Image
        src={`/campuses/${photo}.jpg`}
        alt=""
        fill
        priority
        sizes="100vw"
        className="scale-[1.06] object-cover object-center opacity-80 saturate-[.85] blur-[3px]"
      />
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `radial-gradient(58% 58% at 84% 78%, ${tint}bb 0%, transparent 72%)` }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/88 via-[36%] to-ink-950/10" />
      <div
        className="absolute inset-0"
        style={{ backgroundImage: "radial-gradient(64% 58% at 78% 52%, rgba(6,7,10,0.68) 0%, transparent 72%)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/75 via-transparent to-ink-950/90" />
    </div>
  );
}
