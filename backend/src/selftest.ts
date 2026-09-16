import {
  PROGRAMS,
  WHATIF_PRESETS,
  applyWhatIf,
  buildRoadmap,
  diagnose,
  extractFacts,
  mergeFacts,
  recommend,
  type MemoryFact,
} from "./shared/engine/index";

let passed = 0;
let failed = 0;

function check(name: string, condition: boolean, details = ""): void {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failed += 1;
    console.log(`  FAIL ${name}${details ? ` — ${details}` : ""}`);
  }
}

const DEMO_TEXT =
  "Меня зовут Алия, я в 11 классе. Хочу поступить в Европу, бюджет до $15k в год. IELTS 6.0, средний балл 4.5 из 5. Интересуюсь IT и программированием. Стипендия важнее страны.";

const now = new Date("2026-09-16T12:00:00Z");
const facts = extractFacts(DEMO_TEXT, { now });
const byField = (list: MemoryFact[], field: string): MemoryFact | undefined => list.find((item) => item.field === field);

console.log("\n[1] Извлечение фактов");
check("найдено ≥7 фактов", facts.length >= 7, `получено: ${facts.map((item) => item.field).join(", ")}`);
check("имя = Алия", byField(facts, "name")?.value === "Алия", byField(facts, "name")?.value);
check("класс = 11 класс", byField(facts, "grade")?.value === "11 класс", byField(facts, "grade")?.value);
check("страна = Европа", byField(facts, "country")?.value === "Европа", byField(facts, "country")?.value);
check("бюджет = 15000 USD", byField(facts, "budget")?.numeric === 15000, String(byField(facts, "budget")?.numeric));
check("IELTS = 6.0", byField(facts, "ielts")?.numeric === 6, String(byField(facts, "ielts")?.numeric));
check("GPA = 4.5", byField(facts, "gpa")?.numeric === 4.5, String(byField(facts, "gpa")?.numeric));
check("интересы включают IT", byField(facts, "interests")?.value.includes("IT") === true, byField(facts, "interests")?.value);
check("приоритет = Стипендия", byField(facts, "priority")?.value === "Стипендия", byField(facts, "priority")?.value);

console.log("\n[2] Граничные случаи извлечения");
const rangeMoney = extractFacts("Мой бюджет 10-15 тысяч долларов в год", { now });
check("диапазон 10–15 тысяч → 15000", byField(rangeMoney, "budget")?.numeric === 15000, String(byField(rangeMoney, "budget")?.numeric));
const noIelts = extractFacts("IELTS ещё не сдавал, планирую в этом году", { now });
check("IELTS не сдан → числовой факт отсутствует", byField(noIelts, "ielts")?.numeric === undefined);
const noMention = extractFacts("Люблю математику и физику", { now });
check("без упоминания IELTS факта нет", byField(noMention, "ielts") === undefined);
const afterSchool = extractFacts("Планирую поступление после 11 класса", { now });
check("старт после школы → Осень 2027", byField(afterSchool, "intake")?.value === "Осень 2027", byField(afterSchool, "intake")?.value);

console.log("\n[3] Слияние памяти");
const extraFacts = extractFacts("Теперь бюджет до $20k", { now });
const merged = mergeFacts(facts, extraFacts);
check("бюджет заменён, а не продублирован", byField(merged, "budget")?.numeric === 20000);
check("количество фактов выросло только на интересы", merged.length === facts.length + (byField(facts, "interests") ? 0 : 1));

console.log("\n[4] Рекомендации");
const base = recommend(facts);
check(`оценены все программы (${base.recommendations.length})`, base.recommendations.length >= 10);
check("ранги последовательны", base.recommendations.every((item, index) => item.rank === index + 1));
check("у каждой рекомендации есть причины", base.recommendations.every((item) => item.reasons.length > 0));
check("у каждой рекомендации есть оценка 0–100", base.recommendations.every((item) => item.score >= 0 && item.score <= 100));
check(
  "шортлист совпадает с интересами IT/Data",
  base.recommendations
    .slice(0, 3)
    .every((item) => item.program.tags.some((tag) => ["it", "data"].includes(tag))),
  base.recommendations
    .slice(0, 3)
    .map((item) => `${item.program.id}:${item.score}`)
    .join(" "),
);
const twente = base.recommendations.find((item) => item.program.id === "utwente-cs");
check("дорогая программа получает gap по бюджету", twente?.gaps.some((gap) => gap.text.includes("Превышает бюджет")) === true);
const limited = recommend(facts, { limit: 3 });
check("лимит работает", limited.recommendations.length === 3);

console.log("\n[5] What If");
const scholarshipPreset = WHATIF_PRESETS.find((preset) => preset.id === "scholarship-first");
const baseAalto = base.recommendations.find((item) => item.program.id === "aalto-sci");
const wf = applyWhatIf(facts, scholarshipPreset!.params);
const wfAalto = wf.recommendations.find((item) => item.program.id === "aalto-sci");
check("пресет найден", scholarshipPreset !== undefined);
check("программа с полной стипендией поднимается", (wfAalto?.rank ?? 99) <= (baseAalto?.rank ?? 0), `${baseAalto?.rank} → ${wfAalto?.rank}`);
check("summary заполнен", wf.summary.length > 10, wf.summary);
check("diff содержит изменения", wf.diff.moved.length + wf.diff.entered.length > 0);
const baseOut = base.recommendations.filter((item) => (item.budgetDeltaUsd ?? 0) < 0).length;
const wf10k = applyWhatIf(facts, { budget: 10000, countryWeight: 1, budgetWeight: 1, scholarshipWeight: 1 });
const newOut = wf10k.recommendations.filter((item) => (item.budgetDeltaUsd ?? 0) < 0).length;
check("бюджет $10k увеличивает число программ вне бюджета", newOut > baseOut, `${baseOut} → ${newOut}`);

console.log("\n[6] Roadmap");
const withoutIelts = facts.filter((item) => item.field !== "ielts");
const roadmap = buildRoadmap(withoutIelts, null);
check("целевая программа выбрана", roadmap.targetProgram !== null, roadmap.targetProgram?.id);
check("есть шаг подготовки к IELTS", roadmap.steps.some((step) => step.id.endsWith("-ielts-prep")));
check("шаги ≥ 12", roadmap.steps.length >= 12, String(roadmap.steps.length));
const categories = new Set(roadmap.steps.map((step) => step.category));
check(
  "все категории покрыты",
  ["exam", "documents", "deadline", "activity"].every((category) => categories.has(category as never)),
);
const applyIndex = roadmap.steps.findIndex((step) => step.id.endsWith("-apply"));
const transcriptIndex = roadmap.steps.findIndex((step) => step.id.endsWith("-transcript"));
const visaIndex = roadmap.steps.findIndex((step) => step.id.endsWith("-visa"));
check("транскрипт раньше подачи, виза позже", transcriptIndex < applyIndex && applyIndex < visaIndex);
const roadmapWithIelts = buildRoadmap(facts, PROGRAMS.find((program) => program.id === "aalto-sci") ?? null);
check(
  "при IELTS 6.0 и пороге 6.5 есть шаг «поднять»",
  roadmapWithIelts.steps.some((step) => step.id.endsWith("-ielts-up")),
  roadmapWithIelts.steps.map((step) => step.id).join(", "),
);

console.log("\n[7] Диагностика");
const diag = diagnose(facts);
check("полнота профиля ≥ 80%", diag.completeness >= 80, `${diag.completeness}%`);
check("сильные стороны ≥ 3", diag.strengths.length >= 3, diag.strengths.join(" | "));
check("ограничения ≥ 1", diag.constraints.length >= 1, diag.constraints.join(" | "));
check("цель сформулирована", diag.goal.length > 20, diag.goal);

console.log(`\nИтог: ${passed} ok, ${failed} fail\n`);
if (failed > 0) process.exit(1);
