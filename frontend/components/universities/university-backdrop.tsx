import Image from "next/image";
import { BUILDINGS, CAMPUS_FALLBACK, TINTS } from "@/lib/campus-art";

/**
 * Детальная страница использует тот же вырезанный кампус, что и карточка.
 * Так новый вуз не требует отдельной фоновой фотографии и не получает пустой экран.
 */
export function UniversityBackdrop({ programId }: { programId: string }) {
  const building = BUILDINGS[programId] ?? CAMPUS_FALLBACK;
  const tint = TINTS[programId] ?? "#252a2d";

  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{ backgroundImage: `radial-gradient(62% 62% at 82% 62%, ${tint} 0%, #0c0e11 70%)` }}
      />
      <div className="absolute bottom-0 right-[-8%] top-[11%] w-[88%] sm:right-[-3%] sm:top-[5%] sm:w-[70%]">
        <Image
          src={`/campuses/cutouts/${building}.webp`}
          alt=""
          fill
          priority
          sizes="(max-width: 640px) 110vw, 75vw"
          className="object-contain object-bottom opacity-95"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/90 via-[42%] to-ink-950/12" />
      <div
        className="absolute inset-0"
        style={{ backgroundImage: "radial-gradient(64% 58% at 78% 52%, rgba(6,7,10,0.44) 0%, transparent 72%)" }}
      />
      <div className="absolute inset-0 bg-gradient-to-b from-ink-950/75 via-transparent to-ink-950/90" />
    </div>
  );
}
