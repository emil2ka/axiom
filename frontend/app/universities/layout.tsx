import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Вузы",
  description:
    "Каталог университетов AXIOM: кампусы, программы, стоимость, стипендии и дедлайны — у каждого вуза своя страница.",
};

export default function UniversitiesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
