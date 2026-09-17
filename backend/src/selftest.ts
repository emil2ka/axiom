import {
  DEFAULT_WEIGHTS,
  INTERVIEW_QUESTIONS,
  PROGRAMS,
  WHATIF_PRESETS,
  applyPriorityWeights,
  applyWhatIf,
  buildRoadmap,
  detectConflicts,
  diagnose,
  estimateImpact,
  extractFacts,
  mergeFacts,
  nextQuestion,
  recommend,
  selectNextQuestion,
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
// База уже учитывает приоритет из памяти, поэтому движение пресета проверяем
// на профиле без факта «приоритет» — иначе сравнивали бы одно и то же с самим собой.
const neutralFacts = facts.filter((item) => item.field !== "priority");
const neutralBase = recommend(neutralFacts);
const neutralAalto = neutralBase.recommendations.find((item) => item.program.id === "aalto-sci");
const wf = applyWhatIf(neutralFacts, scholarshipPreset!.params);
const wfAalto = wf.recommendations.find((item) => item.program.id === "aalto-sci");
check("пресет найден", scholarshipPreset !== undefined);
check("программа с полной стипендией поднимается", (wfAalto?.rank ?? 99) <= (neutralAalto?.rank ?? 0), `${neutralAalto?.rank} → ${wfAalto?.rank}`);
check("summary заполнен", wf.summary.length > 10, wf.summary);
check("diff содержит изменения", wf.diff.moved.length + wf.diff.entered.length > 0);
const wfSamePriority = applyWhatIf(facts, scholarshipPreset!.params);
check(
  "пресет, совпавший с памятью, честно сообщает что уже учтён",
  wfSamePriority.summary.includes("уже сохранён в памяти") || wfSamePriority.diff.moved.length > 0,
  wfSamePriority.summary,
);
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

console.log("\n[8] Приоритет из памяти управляет ранжированием");
const noPriority = recommend(neutralFacts);
const withScholarship = recommend(
  mergeFacts(neutralFacts, extractFacts("Стипендия важнее страны", { now })),
);
const withCountry = recommend(
  mergeFacts(neutralFacts, extractFacts("Страна важнее стипендии", { now })),
);

check("без приоритета appliedPriority = null", noPriority.appliedPriority === null, String(noPriority.appliedPriority));
check("приоритет «Стипендия» распознан движком", withScholarship.appliedPriority === "scholarship", String(withScholarship.appliedPriority));
check("приоритет «Страна» распознан движком", withCountry.appliedPriority === "country", String(withCountry.appliedPriority));

check(
  "вес критерия «стипендия» вырос относительно базового",
  (withScholarship.weights?.scholarship ?? 0) > (noPriority.weights?.scholarship ?? 1),
  `${noPriority.weights?.scholarship?.toFixed(3)} → ${withScholarship.weights?.scholarship?.toFixed(3)}`,
);
check(
  "вес критерия «страна» при этом упал",
  (withScholarship.weights?.country ?? 1) < (noPriority.weights?.country ?? 0),
  `${noPriority.weights?.country?.toFixed(3)} → ${withScholarship.weights?.country?.toFixed(3)}`,
);
check(
  "веса всегда нормализованы к 1",
  [noPriority, withScholarship, withCountry].every((result) => {
    const w = result.weights;
    if (!w) return false;
    const sum = w.budget + w.country + w.ielts + w.field + w.scholarship + w.timing;
    return Math.abs(sum - 1) < 1e-9;
  }),
);

const rankOf = (result: typeof noPriority, id: string): number =>
  result.recommendations.find((item) => item.program.id === id)?.rank ?? 99;
const fullScholarshipIds = PROGRAMS.filter((program) => program.scholarship === "full").map((program) => program.id);
check(
  "«стипендия важнее» реально двигает программы с полным покрытием вверх",
  fullScholarshipIds.some((id) => rankOf(withScholarship, id) < rankOf(noPriority, id)),
  fullScholarshipIds.map((id) => `${id}: ${rankOf(noPriority, id)} → ${rankOf(withScholarship, id)}`).join(", "),
);
check(
  "смена приоритета меняет сам порядок выдачи, а не только веса",
  withScholarship.recommendations.map((item) => item.program.id).join(",") !==
    withCountry.recommendations.map((item) => item.program.id).join(","),
);
check(
  "карточка объясняет решение ссылкой на факт «приоритет»",
  withScholarship.recommendations.slice(0, 5).some((item) => item.reasons.some((reason) => reason.field === "priority")),
  withScholarship.recommendations[0]?.reasons.map((reason) => reason.field).join(", "),
);
check("priorityNote читаем человеком", (withScholarship.priorityNote ?? "").includes("стипендия"), withScholarship.priorityNote);
check(
  "ignorePriority отключает влияние памяти",
  recommend(facts, { ignorePriority: true }).recommendations.map((item) => item.program.id).join(",") ===
    noPriority.recommendations.map((item) => item.program.id).join(","),
);
check(
  "приоритет «рейтинг» честно не меняет веса (нет данных в датасете)",
  JSON.stringify(applyPriorityWeights(DEFAULT_WEIGHTS, "ranking")) ===
    JSON.stringify(applyPriorityWeights(DEFAULT_WEIGHTS, null)),
);

console.log("\n[9] Адаптивное интервью");
const emptyTurn = selectNextQuestion([], [], { now });
check("с пустой памятью начинаем со знакомства", emptyTurn.kind === "opener", emptyTurn.kind);

const afterIntro = extractFacts("Меня зовут Алия, 11 класс", { now });
const gapTurn = selectNextQuestion(afterIntro, ["intro"], { now });
check("дальше идёт вопрос по пробелу", gapTurn.kind === "gap", gapTurn.kind);
check("вопрос выбран не по порядку, а по пользе", gapTurn.expectedImpact > 0, String(gapTurn.expectedImpact));
check("решение объяснено текстом", gapTurn.reason.length > 20, gapTurn.reason);

// Порядок вопросов зависит от памяти, а не от позиции в массиве.
const knowsCountry = mergeFacts(afterIntro, extractFacts("Хочу в Германию", { now }));
const knowsInterests = mergeFacts(afterIntro, extractFacts("Интересуюсь дизайном", { now }));
check(
  "разная память → разный следующий вопрос",
  selectNextQuestion(knowsCountry, ["intro"], { now }).question?.id !==
    selectNextQuestion(knowsInterests, ["intro"], { now }).question?.id,
  `${selectNextQuestion(knowsCountry, ["intro"], { now }).question?.id} vs ${selectNextQuestion(knowsInterests, ["intro"], { now }).question?.id}`,
);
check(
  "уже известное поле повторно не спрашивается",
  selectNextQuestion(knowsCountry, ["intro"], { now }).question?.id !== "country",
);

// Польза измеряется в перестановке топ-5, а не назначается вручную.
check(
  "страна влияет на выдачу сильнее, чем GPA",
  estimateImpact(afterIntro, "country") > estimateImpact(afterIntro, "gpa"),
  `country=${estimateImpact(afterIntro, "country").toFixed(3)} gpa=${estimateImpact(afterIntro, "gpa").toFixed(3)}`,
);
check("GPA честно оценён как не влияющий на рейтинг", estimateImpact(afterIntro, "gpa") === 0);
check(
  "польза всегда в диапазоне 0..1",
  (["country", "budget", "ielts", "interests", "priority", "gpa"] as const).every((field) => {
    const impact = estimateImpact(afterIntro, field);
    return impact >= 0 && impact <= 1;
  }),
);

console.log("\n[10] Противоречия в памяти");
const nlCheap = mergeFacts(
  extractFacts("Хочу в Нидерланды, интересует IT", { now }),
  extractFacts("Бюджет до $9k в год", { now }),
);
const nlConflicts = detectConflicts(nlCheap, PROGRAMS, now);
check("бюджет против страны найден", nlConflicts.some((item) => item.id === "budget-vs-country"), nlConflicts.map((item) => item.id).join(", "));
check(
  "в тексте противоречия есть конкретная цифра из датасета",
  nlConflicts.find((item) => item.id === "budget-vs-country")?.text.includes("22 800") === true,
  nlConflicts.find((item) => item.id === "budget-vs-country")?.text,
);
const conflictTurn = selectNextQuestion(nlCheap, [], { now });
check("противоречие спрашивается раньше пробелов", conflictTurn.kind === "conflict", conflictTurn.kind);
check("вопрос по противоречию предлагает варианты", (conflictTurn.question?.quickReplies.length ?? 0) >= 2);
check(
  "проговорённое противоречие больше не всплывает",
  selectNextQuestion(nlCheap, [], { now, resolvedConflictIds: ["budget-vs-country"] }).kind !== "conflict",
);

const germanOnly = mergeFacts(
  extractFacts("Хочу в Германию, интересует IT", { now }),
  extractFacts("Не хочу учить новый язык", { now }),
);
check(
  "языковое ограничение против страны найдено",
  detectConflicts(germanOnly, PROGRAMS, now).some((item) => item.id === "language-vs-country"),
  detectConflicts(germanOnly, PROGRAMS, now).map((item) => item.id).join(", "),
);
const pastIntake = extractFacts("Планирую поступление в 2020 году", { now });
check(
  "старт в прошлом распознан как противоречие",
  detectConflicts(pastIntake, PROGRAMS, now).some((item) => item.id === "intake-in-past"),
);
check("непротиворечивый профиль не выдумывает конфликтов", detectConflicts(facts, PROGRAMS, now).length === 0, detectConflicts(facts, PROGRAMS, now).map((item) => item.id).join(", "));

check(
  "старый вызов nextQuestion(ids) не сломан",
  nextQuestion([]) === INTERVIEW_QUESTIONS[0] && nextQuestion(["intro"])?.id === "country",
);

console.log(`\nИтог: ${passed} ok, ${failed} fail\n`);
if (failed > 0) process.exit(1);
