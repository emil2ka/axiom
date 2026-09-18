import Image from "next/image";
import { BUILDINGS, CAMPUS_FALLBACK, TINTS } from "@/lib/campus-art";
import { cn } from "@/lib/utils";

/**
 * Фон карточки университета: вырезанное здание справа на мягком градиенте.
 * Один и тот же приём на всех экранах — подборка, сравнение, What If, маршрут.
 */
export function CampusBackdrop({
  programId,
  className,
  imageClassName,
  priority = false,
}: {
  programId: string;
  className?: string;
  imageClassName?: string;
  priority?: boolean;
}) {
  const building = BUILDINGS[programId] ?? CAMPUS_FALLBACK;
  const tint = TINTS[programId] ?? "#252a2d";

  return (
    <>
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ backgroundImage: `radial-gradient(ellipse at 78% 72%, ${tint} 0%, #101214 62%, #0b0d0f 100%)` }}
      />
      <div
        aria-hidden="true"
        className={cn("pointer-events-none absolute inset-y-[10%] right-[-10%] w-[86%] sm:inset-y-[4%] sm:right-[-4%] sm:w-[62%]", className)}
      >
        <Image
          src={`/campuses/cutouts/${building}.webp`}
          alt=""
          fill
          priority={priority}
          sizes="(max-width: 640px) 90vw, (max-width: 1024px) 60vw, 620px"
          className={cn("object-contain object-bottom opacity-95", imageClassName)}
        />
      </div>
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink-950 via-ink-950/70 to-transparent" />
      <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-ink-950 via-ink-950/65 to-transparent" />
    </>
  );
}
