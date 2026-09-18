import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { UniversityView } from "@/components/universities/university-view";
import { findUniversity, groupUniversities, primaryProgram } from "@/lib/university";

export function generateStaticParams() {
  return groupUniversities().map((group) => ({ slug: group.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const group = findUniversity(slug);
  if (!group) return {};
  return {
    title: group.name,
    description: `${group.name} — ${group.city}, ${group.country}: программы, стоимость, стипендии и дедлайны в AXIOM.`,
  };
}

export default async function UniversityPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const group = findUniversity(slug);
  if (!group) notFound();

  const query = await searchParams;
  const preferred = typeof query.program === "string" ? query.program : undefined;
  const anchor = primaryProgram(group, preferred);

  return <UniversityView key={group.slug} group={group} initialProgramId={anchor.id} />;
}
