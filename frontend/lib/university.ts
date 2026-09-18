import { BUILDINGS, CAMPUS_FALLBACK, TINTS } from "@/lib/campus-art";
import { PROGRAMS } from "@/lib/shared/engine";
import type { Program, ProgramDeadline } from "@/lib/shared/engine";

export interface UniversityGroup {
  slug: string;
  name: string;
  city: string;
  country: string;
  programs: Program[];
}

/** "/universities/aalto-university" — читаемый адрес вместо id программы. */
export function universitySlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function groupUniversities(programs: Program[] = PROGRAMS): UniversityGroup[] {
  const groups = new Map<string, UniversityGroup>();
  for (const program of programs) {
    const slug = universitySlug(program.university);
    const existing = groups.get(slug);
    if (existing) {
      existing.programs.push(program);
      continue;
    }
    groups.set(slug, {
      slug,
      name: program.university,
      city: program.city,
      country: program.country,
      programs: [program],
    });
  }
  return [...groups.values()];
}

export function findUniversity(slug: string, programs: Program[] = PROGRAMS): UniversityGroup | null {
  return groupUniversities(programs).find((group) => group.slug === slug) ?? null;
}

/** Ссылка на страницу вуза с выбранной программой — карточки ведут на неё. */
export function universityHref(program: Program): string {
  return `/universities/${universitySlug(program.university)}?program=${encodeURIComponent(program.id)}`;
}

export function primaryProgram(group: UniversityGroup, preferredId?: string | null): Program {
  return group.programs.find((program) => program.id === preferredId) ?? group.programs[0];
}

export function yearlyTotal(program: Program): number {
  return program.tuitionPerYearUsd + program.livingPerYearUsd;
}

export function programTotal(program: Program): number {
  return Math.round(yearlyTotal(program) * program.durationYears);
}

export function minYearlyTotal(group: UniversityGroup): number {
  return Math.min(...group.programs.map(yearlyTotal));
}

export function nearestDeadline(programs: Program[]): { program: Program; deadline: ProgramDeadline } | null {
  let best: { program: Program; deadline: ProgramDeadline } | null = null;
  for (const program of programs) {
    for (const deadline of program.deadlines) {
      if (!best || deadline.date < best.deadline.date) best = { program, deadline };
    }
  }
  return best;
}

const PHOTO_ALIASES: Record<string, string> = { "warsaw-tech-full": "warsaw-tech" };

/** Фото кампуса для полноэкранного фона: /campuses/{photo}.jpg */
export function campusPhoto(programId: string): string {
  const art = BUILDINGS[programId] ?? CAMPUS_FALLBACK;
  return PHOTO_ALIASES[art] ?? art;
}

export function campusTint(programId: string): string {
  return TINTS[programId] ?? "#252a2d";
}
