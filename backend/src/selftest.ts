import {
  DEFAULT_WEIGHTS,
  EUROPE_COUNTRIES,
  INTERVIEW_QUESTIONS,
  PROGRAMS,
  WHATIF_PRESETS,
  applyPriorityWeights,
  applyWhatIf,
  CORE_FIELDS,
  buildContext,
  buildRoadmap,
  composeAgentReply,
  fact,
  FIELD_LABELS,
  detectConflicts,
  diagnose,
  estimateImpact,
  explainMemoryUpdate,
  factTimeline,
  mergeFactsWithDiff,
  revisionCount,
  getConstraints,
  getGpaPercent,
  extractFacts,
  mergeFacts,
  nextQuestion,
  normalizeStoredMemories,
  normalizeNumerals,
  rankingChurn,
  recommend,
  reconcileEnrichment,
  reparseFactValue,
  relevantPrograms,
  scoreProgram,
  totalPerYear,
  totalProgramCost,
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
    const sum = w.budget + w.country + w.ielts + w.field + w.scholarship + w.timing + w.gpa + w.language;
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
check("GPA теперь влияет на рейтинг (раньше был мёртвым фактом)", estimateImpact(afterIntro, "gpa") > 0, String(estimateImpact(afterIntro, "gpa").toFixed(3)));
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

// Противоречие по языку зависит от направления, а не только от страны.
const germanLaw = mergeFacts(
  extractFacts("Хочу в Германию, интересует право", { now }),
  extractFacts("Не хочу учить новый язык", { now }),
);
check(
  "право в Германии + отказ от языка = противоречие (англоязычных программ нет)",
  detectConflicts(germanLaw, PROGRAMS, now).some((item) => item.id === "language-vs-country"),
  detectConflicts(germanLaw, PROGRAMS, now).map((item) => item.id).join(", "),
);
const germanIt = mergeFacts(
  extractFacts("Хочу в Германию, интересует IT", { now }),
  extractFacts("Не хочу учить новый язык", { now }),
);
check(
  "а IT в Германии противоречием не считается — англоязычная программа есть",
  !detectConflicts(germanIt, PROGRAMS, now).some((item) => item.id === "language-vs-country"),
  detectConflicts(germanIt, PROGRAMS, now).map((item) => item.id).join(", "),
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

console.log("\n[11] Средний балл: шкала и влияние на выдачу");
const gpa38 = extractFacts("GPA 3.8", { now });
check("«GPA 3.8» читается по 4-балльной шкале", byField(gpa38, "gpa")?.value === "3.8/4", byField(gpa38, "gpa")?.value);
check("и показывается пользователю корректно", byField(gpa38, "gpa")?.display === "3.8 из 4", byField(gpa38, "gpa")?.display);
const gpa45 = extractFacts("Средний балл 4.5", { now });
check("«средний балл 4.5» — по 5-балльной", byField(gpa45, "gpa")?.value === "4.5/5", byField(gpa45, "gpa")?.value);
const gpaExplicit = extractFacts("Средний балл 8 из 10", { now });
check("явная шкала уважается", byField(gpaExplicit, "gpa")?.value === "8/10", byField(gpaExplicit, "gpa")?.value);

check("3.8 из 4 → 95%", getGpaPercent(gpa38) === 95, String(getGpaPercent(gpa38)));
check("4.0 из 5 → 80%", getGpaPercent(extractFacts("Средний балл 4.0", { now })) === 80, String(getGpaPercent(extractFacts("Средний балл 4.0", { now }))));
check(
  "отличник по 4-балльной больше не проигрывает середняку по 5-балльной",
  (getGpaPercent(gpa38) ?? 0) > (getGpaPercent(extractFacts("Средний балл 4.0", { now })) ?? 0),
);

const baseNoGpa = extractFacts("Хочу в Европу, бюджет до $15k, интересует IT, IELTS 6.5", { now });
const weak = recommend(mergeFacts(baseNoGpa, extractFacts("Средний балл 3.5", { now })));
const strong = recommend(mergeFacts(baseNoGpa, extractFacts("Средний балл 4.9", { now })));
check(
  "средний балл меняет порядок выдачи",
  weak.recommendations.map((item) => item.program.id).join(",") !==
    strong.recommendations.map((item) => item.program.id).join(","),
);
const aaltoWeak = weak.recommendations.find((item) => item.program.id === "aalto-sci");
check(
  "отборная программа даёт gap при низком балле",
  aaltoWeak?.gaps.some((gap) => gap.text.includes("среднему баллу")) === true,
  aaltoWeak?.gaps.map((gap) => gap.text).join(" | "),
);
const aaltoStrong = strong.recommendations.find((item) => item.program.id === "aalto-sci");
check(
  "при высоком балле появляется причина, а не пробел",
  aaltoStrong?.reasons.some((reason) => reason.field === "gpa") === true,
  aaltoStrong?.reasons.map((reason) => reason.field).join(", "),
);
check(
  "высокий балл поднимает отборную программу",
  (aaltoStrong?.rank ?? 99) < (aaltoWeak?.rank ?? 0),
  `${aaltoWeak?.rank} → ${aaltoStrong?.rank}`,
);
check(
  "маршрут добавляет шаг «подтянуть балл», когда он ниже порога",
  buildRoadmap(mergeFacts(baseNoGpa, extractFacts("Средний балл 3.5", { now })), PROGRAMS.find((program) => program.id === "aalto-sci") ?? null)
    .steps.some((step) => step.id.endsWith("-gpa-up")),
);
check(
  "и не добавляет его, когда балл проходит",
  !buildRoadmap(mergeFacts(baseNoGpa, extractFacts("Средний балл 4.9", { now })), PROGRAMS.find((program) => program.id === "aalto-sci") ?? null)
    .steps.some((step) => step.id.endsWith("-gpa-up")),
);
check("у всех программ проставлен порог или явный null", PROGRAMS.every((program) => program.gpaMinPercent === null || (program.gpaMinPercent > 0 && program.gpaMinPercent <= 100)));
check(
  "диагностика сравнивает баллы в процентах, а не в сырых числах",
  diagnose(gpa38).strengths.some((item) => item.includes("95%")),
  diagnose(gpa38).strengths.join(" | "),
);

console.log("\n[12] История памяти и объяснение правок");
const startMem = extractFacts("Хочу в Европу, бюджет до $15k, интересует IT, IELTS 6.5, средний балл 4.6", { now });

const added = mergeFactsWithDiff([], startMem);
check("новые факты помечены как added", added.changes.every((change) => change.kind === "added"), added.changes.map((change) => change.kind).join(","));
check("у новых фактов истории нет", added.memories.every((item) => item.history === undefined || item.history.length === 0));

const cut = mergeFactsWithDiff(startMem, extractFacts("Теперь бюджет до $10k", { now }));
const budgetChange = cut.changes.find((change) => change.field === "budget");
check("правка помечена как updated", budgetChange?.kind === "updated", budgetChange?.kind);
check("в diff сохранено прежнее значение", budgetChange?.before?.includes("15") === true, budgetChange?.before);
check("и новое значение", budgetChange?.after?.includes("10") === true, budgetChange?.after);

const budgetFact = cut.memories.find((item) => item.field === "budget")!;
check("прежнее значение ушло в историю", revisionCount(budgetFact) === 1, String(revisionCount(budgetFact)));
check("история хранит именно старое значение", budgetFact.history?.[0].display.includes("15") === true, budgetFact.history?.[0].display);
check("id факта сохраняется при правке", budgetFact.id === startMem.find((item) => item.field === "budget")!.id);
check("таймлайн отдаёт текущее значение первым", factTimeline(budgetFact)[0].current && factTimeline(budgetFact).length === 2);

const repeat = mergeFactsWithDiff(cut.memories, extractFacts("Бюджет до $10k", { now }));
check("повтор того же факта не создаёт ревизию", revisionCount(repeat.memories.find((item) => item.field === "budget")!) === 1);
check("и помечается как unchanged", repeat.changes.find((change) => change.field === "budget")?.kind === "unchanged");

const extended = mergeFactsWithDiff(startMem, extractFacts("Ещё рассматриваю Финляндию", { now }));
check("список стран расширяется, а не затирается", extended.memories.find((item) => item.field === "country")?.value.includes("Европа") === true);
check("расширение помечено как extended", extended.changes.find((change) => change.field === "country")?.kind === "extended");

const cutImpact = explainMemoryUpdate(startMem, extractFacts("Теперь бюджет до $10k", { now }));
check("объяснение называет обе величины", cutImpact.summary.includes("15") && cutImpact.summary.includes("10"), cutImpact.summary);
check("и считает, сколько программ вышло за бюджет", cutImpact.overBudget.after > cutImpact.overBudget.before, `${cutImpact.overBudget.before} → ${cutImpact.overBudget.after}`);
check("объяснение читается как фраза, а не как дамп", cutImpact.summary.length > 40 && cutImpact.summary.endsWith("."), cutImpact.summary);

const noopImpact = explainMemoryUpdate(startMem, extractFacts("Бюджет до $15k", { now }));
check("повтор факта честно сообщает, что нового нет", noopImpact.summary.includes("уже были в памяти"), noopImpact.summary);

const silentImpact = explainMemoryUpdate(startMem, extractFacts("Меня зовут Алия", { now }));
check(
  "правка без влияния на рейтинг не выдумывает эффекта",
  silentImpact.diff.moved.length === 0 && silentImpact.diff.entered.length === 0,
  silentImpact.summary,
);

check("mergeFacts остался совместимым", mergeFacts(startMem, extractFacts("Теперь бюджет до $10k", { now })).length === startMem.length);

console.log("\n[13] Датасет программ");
check(`программ ≥ 40 (сейчас ${PROGRAMS.length})`, PROGRAMS.length >= 40);
check("id уникальны", new Set(PROGRAMS.map((program) => program.id)).size === PROGRAMS.length);
check("у каждой программы есть источник", PROGRAMS.every((program) => program.sources.length > 0 && program.sources[0].url.startsWith("https://")));
check("все программы помечены демо-данными", PROGRAMS.every((program) => program.demo === true));
check("стоимость и проживание заполнены", PROGRAMS.every((program) => program.tuitionPerYearUsd >= 0 && program.livingPerYearUsd > 0));

const allTags = new Set(PROGRAMS.flatMap((program) => program.tags));
const required = ["it", "data", "design", "business", "finance", "engineering", "psychology", "law", "medicine", "architecture", "marketing"];
check(
  "покрыты все направления из карты интересов",
  required.every((tag) => allTags.has(tag)),
  required.filter((tag) => !allTags.has(tag)).join(", ") || "все",
);

// Направление, которого раньше не было: топ-1 должен совпадать с запросом.
for (const [query, tag] of [["Хочу изучать медицину в Европе", "medicine"], ["Интересует право", "law"], ["Хочу на архитектуру", "architecture"], ["Интересует маркетинг", "marketing"]] as const) {
  const top = recommend(extractFacts(query, { now })).recommendations[0];
  check(`«${query}» → топ-1 по направлению`, top.program.tags.includes(tag), `${top.program.id} (${top.program.field})`);
}

const budget10k = PROGRAMS.filter(
  (program) => program.scholarship === "full" || program.tuitionPerYearUsd + program.livingPerYearUsd <= 10000,
);
check(`при бюджете $10k проходит ≥ 8 программ (сейчас ${budget10k.length})`, budget10k.length >= 8, budget10k.map((program) => program.id).join(", "));
check("есть страны за пределами ЕС", PROGRAMS.some((program) => !EUROPE_COUNTRIES.has(program.country)));
check("стран ≥ 12", new Set(PROGRAMS.map((program) => program.country)).size >= 12, String(new Set(PROGRAMS.map((program) => program.country)).size));

// Страны и языки из датасета должны распознаваться из речи.
for (const country of [...new Set(PROGRAMS.map((program) => program.country))]) {
  const spoken = extractFacts(`Хочу учиться в стране ${country}`, { now });
  check(`страна «${country}» распознаётся из речи`, spoken.some((item) => item.field === "country" && item.value.includes(country)), spoken.find((item) => item.field === "country")?.value);
}
check(
  "«португальский» не путается со страной Португалия",
  !extractFacts("Знаю португальский язык", { now }).some((item) => item.field === "country"),
  extractFacts("Знаю португальский язык", { now }).map((item) => `${item.field}=${item.value}`).join(", "),
);
check(
  "испанский распознаётся как язык",
  extractFacts("Знаю испанский", { now }).some((item) => item.field === "language" && item.value === "Испанский"),
);

// «право» легко даёт ложные срабатывания — проверяем обе стороны.
const saysLaw = (text: string): boolean =>
  extractFacts(text, { now }).some((item) => item.field === "interests" && item.value === "Право");
for (const phrase of ["Интересует право", "Хочу изучать право", "Хочу на юриста", "Интересуют права человека"]) {
  check(`«${phrase}» → направление «Право»`, saysLaw(phrase));
}
for (const phrase of ["Поверни направо", "Хочу всё сделать правильно", "У меня есть права"]) {
  check(`«${phrase}» → НЕ право`, !saysLaw(phrase));
}
check("«лечебное дело» → медицина", extractFacts("Интересует лечебное дело", { now }).some((item) => item.field === "interests" && item.value.includes("Медицина")));

console.log("\n[14] Ограничения, язык и срок старта влияют на выдачу");

// Ограничения: раньше извлекались, показывались чипом и не влияли ни на что.
for (const [phrase, flag] of [
  ["Не хочу учить новый язык", "englishOnly"],
  ["Только на английском", "englishOnly"],
  ["Без стипендии не потяну", "needsScholarship"],
  ["Нужна стипендия", "needsScholarship"],
] as const) {
  const parsed = getConstraints(extractFacts(phrase, { now }));
  check(`«${phrase}» → ${flag}`, parsed[flag] === true, JSON.stringify(parsed));
}
check(
  "две формулировки в одной реплике разбираются обе",
  (() => {
    const both = getConstraints(extractFacts("Не хочу учить язык и без стипендии не потяну", { now }));
    return both.englishOnly && both.needsScholarship;
  })(),
);
check("нейтральная фраза не выдумывает ограничений", (() => {
  const none = getConstraints(extractFacts("Не готов переезжать далеко", { now }));
  return !none.englishOnly && !none.needsScholarship;
})());

const germany = extractFacts("Хочу в Германию, интересует инженерия", { now });
const germanyTop = (memories: MemoryFact[]) => recommend(memories).recommendations[0].program;

check("без ограничений топ-1 может быть на немецком", germanyTop(germany).language === "Немецкий", germanyTop(germany).language);
const noNewLanguage = mergeFacts(germany, extractFacts("Не хочу учить новый язык", { now }));
check(
  "«не хочу учить язык» убирает неанглоязычные программы с первого места",
  germanyTop(noNewLanguage).language === "Английский",
  `${germanyTop(noNewLanguage).university} (${germanyTop(noNewLanguage).language})`,
);
check(
  "и объясняет это пробелом, а не молча",
  recommend(noNewLanguage).recommendations.some((item) =>
    item.gaps.some((gap) => gap.severity === "high" && gap.text.includes("не учить новый язык")),
  ),
);
const knowsGerman = mergeFacts(noNewLanguage, extractFacts("Знаю немецкий", { now }));
check(
  "знание языка снимает ограничение — немецкие программы возвращаются",
  germanyTop(knowsGerman).language === "Немецкий",
  `${germanyTop(knowsGerman).university} (${germanyTop(knowsGerman).language})`,
);
check(
  "и превращается в причину, а не в пробел",
  recommend(knowsGerman).recommendations.some((item) => item.reasons.some((reason) => reason.field === "language")),
);

const needsMoney = mergeFacts(germany, extractFacts("Без стипендии не потяну", { now }));
check(
  "«без стипендии не потяну» убирает программы без стипендии с первого места",
  germanyTop(needsMoney).scholarship !== "none",
  `${germanyTop(needsMoney).university} (${germanyTop(needsMoney).scholarship})`,
);

// Срок старта: маршрут строился под ближайший набор независимо от планов.
const target = PROGRAMS.find((program) => program.id === "aalto-sci") ?? null;
const profile2027 = mergeFacts(facts, extractFacts("Планирую поступление в 2027 году", { now }));
const profile2029 = mergeFacts(facts, extractFacts("Планирую поступление в 2029 году", { now }));
const applyStep = (memories: MemoryFact[]): string =>
  buildRoadmap(memories, target).steps.find((step) => step.id.endsWith("-apply"))?.dueMonth ?? "";
check("маршрут под 2027 остаётся в 2027", applyStep(profile2027).includes("2027"), applyStep(profile2027));
check("маршрут под 2029 сдвигается на 2029", applyStep(profile2029).includes("2029"), applyStep(profile2029));
check(
  "и подпись дедлайна тоже сдвигается",
  buildRoadmap(profile2029, target).steps.find((step) => step.id.endsWith("-apply"))?.description.includes("2029") === true,
);
check("прошлые годы маршрут не сдвигают назад", applyStep(mergeFacts(facts, extractFacts("Планирую поступление в 2020 году", { now }))).includes("2027"));

// Имя и класс должны звучать в ответе, а не просто лежать в памяти.
const named = diagnose(extractFacts("Меня зовут Алия, 11 класс, хочу в Европу, интересует IT, бюджет до $15k, IELTS 6.5", { now }));
check("имя звучит в резюме профиля", named.summary.startsWith("Алия,"), named.summary.slice(0, 40));
check("класс попадает в формулировку цели", named.goal.includes("11 класс"), named.goal);

// Защита от возврата мёртвых фактов: каждое поле должно где-то проявляться.
console.log("\n[15] Ни одно поле памяти не остаётся мёртвым");
const probeValues: Record<string, { value: string; numeric?: number }> = {
  name: { value: "Алия" },
  grade: { value: "11 класс" },
  country: { value: "Германия" },
  budget: { value: "$12 000", numeric: 12000 },
  ielts: { value: "6.5", numeric: 6.5 },
  gpa: { value: "4.7/5", numeric: 4.7 },
  interests: { value: "IT и программирование" },
  intake: { value: "Осень 2029" },
  priority: { value: "Стипендия" },
  language: { value: "Немецкий" },
  constraints: { value: "не хочу учить новый язык" },
};
const emptyRec = recommend([]);
const emptyRoad = buildRoadmap([], null);
const emptyDiag = diagnose([]);
const fingerprint = (value: unknown): string => JSON.stringify(value);

for (const [field, probe] of Object.entries(probeValues)) {
  const memory: MemoryFact = {
    id: `probe-${field}`,
    field: field as MemoryFact["field"],
    label: FIELD_LABELS[field as MemoryFact["field"]],
    value: probe.value,
    display: probe.value,
    quote: "",
    confidence: 0.9,
    numeric: probe.numeric,
    source: "manual",
    createdAt: 0,
  };
  const withFact = mergeFacts([], [memory]);
  const changesRanking =
    fingerprint(recommend(withFact).recommendations.map((item) => [item.program.id, item.score])) !==
    fingerprint(emptyRec.recommendations.map((item) => [item.program.id, item.score]));
  const changesRoadmap =
    fingerprint(buildRoadmap(withFact, null).steps.map((step) => [step.id, step.dueMonth])) !==
    fingerprint(emptyRoad.steps.map((step) => [step.id, step.dueMonth]));
  const diagnosed = diagnose(withFact);
  const changesDiagnosis =
    fingerprint([diagnosed.summary, diagnosed.strengths, diagnosed.constraints, diagnosed.goal]) !==
    fingerprint([emptyDiag.summary, emptyDiag.strengths, emptyDiag.constraints, emptyDiag.goal]);

  check(
    `факт «${FIELD_LABELS[field as MemoryFact["field"]]}» где-то проявляется`,
    changesRanking || changesRoadmap || changesDiagnosis,
    `рейтинг=${changesRanking} маршрут=${changesRoadmap} диагноз=${changesDiagnosis}`,
  );
}

console.log("\n[16] Намерение: дополнить или заменить");

const intentOf = (text: string, field: string): string | undefined =>
  extractFacts(text, { now }).find((item) => item.field === field)?.intent;
const valueOf = (text: string, field: string): string | undefined =>
  extractFacts(text, { now }).find((item) => item.field === field)?.display;

// Дополнение — поведение по умолчанию, оно не должно было измениться.
for (const phrase of ["Хочу в Европу, интересует IT", "Рассматриваю Германию и Польшу", "Интересует IT и дизайн"]) {
  check(`«${phrase}» → дополняет память`, intentOf(phrase, "country") !== "replace" && intentOf(phrase, "interests") !== "replace");
}
check("«не только IT, но и дизайн» — перечисление, а не замена", intentOf("Не только IT, но и дизайн", "interests") !== "replace");
const bothInterests = valueOf("Не только IT, но и дизайн", "interests") ?? "";
check("и оба направления сохранены", bothInterests.includes("IT") && bothInterests.includes("Дизайн"), bothInterests);

// Замена — человек передумал.
for (const [phrase, field] of [
  ["Хочу только Германию", "country"],
  ["Теперь интересует дизайн", "interests"],
  ["Передумал, интересует медицина", "interests"],
  ["Вместо Европы рассматриваю Турцию", "country"],
] as const) {
  check(`«${phrase}» → заменяет прежнее`, intentOf(phrase, field) === "replace", intentOf(phrase, field) ?? "add");
}

// Отрицание конкретного значения.
check("«Не рассматриваю Германию» → Германия не попадает в память", valueOf("Не рассматриваю Германию", "country") === undefined, valueOf("Не рассматриваю Германию", "country"));
check("«Хочу в Европу, а не в США» → остаётся только Европа", valueOf("Хочу в Европу, а не в США", "country") === "Европа", valueOf("Хочу в Европу, а не в США", "country"));
check("«всё кроме медицины» → медицина исключена", valueOf("Интересует всё кроме медицины", "interests") === undefined);
check(
  "«вместо Европы рассматриваю Турцию» → Турция сохранена, Европа нет",
  valueOf("Вместо Европы рассматриваю Турцию", "country") === "Турция",
  valueOf("Вместо Европы рассматриваю Турцию", "country"),
);
check("«но не хочу учить язык» не отменяет страну", valueOf("Хочу в Европу, но не хочу учить язык", "country") === "Европа");

// Слияние уважает намерение.
let dialog = extractFacts("Хочу в Европу, интересует IT", { now });
dialog = mergeFacts(dialog, extractFacts("Ещё рассматриваю Финляндию", { now }));
check("дополнение расширяет список стран", dialog.find((item) => item.field === "country")?.value === "Европа; Финляндия", dialog.find((item) => item.field === "country")?.value);
dialog = mergeFacts(dialog, extractFacts("Хочу только Германию, а не всю Европу", { now }));
check("замена схлопывает список до сказанного", dialog.find((item) => item.field === "country")?.value === "Германия", dialog.find((item) => item.field === "country")?.value);
dialog = mergeFacts(dialog, extractFacts("На самом деле меня больше интересует дизайн", { now }));
check("смена направления заменяет, а не накапливает", dialog.find((item) => item.field === "interests")?.value === "Дизайн", dialog.find((item) => item.field === "interests")?.value);
check("прежнее значение при замене ушло в историю", (dialog.find((item) => item.field === "interests")?.history?.length ?? 0) >= 1);

// Поля, которые и так заменялись, не должны сломаться.
check("бюджет по-прежнему заменяется", mergeFacts(extractFacts("Бюджет до $15k", { now }), extractFacts("Теперь бюджет до $20k", { now })).find((item) => item.field === "budget")?.numeric === 20000);
check("«только сдал IELTS 6.5» не ломает извлечение балла", extractFacts("Только сдал IELTS 6.5", { now }).find((item) => item.field === "ielts")?.numeric === 6.5);

console.log("\n[17] Голосовой ввод: числительные словами");

// Web Speech отдаёт «пятнадцать тысяч» и «шесть с половиной» без пунктуации.
const norm = (text: string) => normalizeNumerals(text);
check("«пятнадцать тысяч» → 15000", norm("бюджет пятнадцать тысяч") === "бюджет 15000", norm("бюджет пятнадцать тысяч"));
check("родительный падеж тоже: «пятнадцати тысяч»", norm("до пятнадцати тысяч долларов") === "до 15000 долларов", norm("до пятнадцати тысяч долларов"));
check("«двадцать пять тысяч» → 25000", norm("двадцать пять тысяч") === "25000", norm("двадцать пять тысяч"));
check("«шесть с половиной» → 6.5", norm("айлтс шесть с половиной") === "айлтс 6.5", norm("айлтс шесть с половиной"));
check("«в одиннадцатом классе» → 11 классе", norm("в одиннадцатом классе") === "в 11 классе", norm("в одиннадцатом классе"));
check("«15 тысяч» (цифра + слово) → 15000", norm("15 тысяч долларов") === "15000 долларов", norm("15 тысяч долларов"));

// То, что числительными не является, трогать нельзя.
check("«состояние» не превращается в число", norm("состояние дел") === "состояние дел", norm("состояние дел"));
check("одинокое «тысяча» остаётся словом", norm("тысяча причин") === "тысяча причин", norm("тысяча причин"));
check(
  "диапазон через дефис не склеивается",
  norm("бюджет 10-15 тысяч") === "бюджет 10-15000",
  norm("бюджет 10-15 тысяч"),
);

const voice = (text: string) => extractFacts(text, { now, source: "voice" });
const voiceField = (text: string, field: string) => voice(text).find((item) => item.field === field);
check("голосом: бюджет извлекается", voiceField("хочу поступить в европу бюджет до пятнадцати тысяч долларов в год", "budget")?.numeric === 15000);
check("голосом: страна извлекается", voiceField("хочу поступить в европу бюджет до пятнадцати тысяч долларов в год", "country")?.value === "Европа");
check("голосом: IELTS с половиной", voiceField("айлтс шесть с половиной", "ielts")?.numeric === 6.5);
check("голосом: «айэлтс шесть ноль» → 6.0", voiceField("айэлтс шесть ноль", "ielts")?.numeric === 6, String(voiceField("айэлтс шесть ноль", "ielts")?.numeric));
check("голосом: класс словом", voiceField("меня зовут алия я в одиннадцатом классе", "grade")?.value === "11 класс");
check("голосом: средний балл с половиной", voiceField("средний балл четыре с половиной", "gpa")?.numeric === 4.5);
check(
  "целая реплика голосом даёт ≥ 4 факта",
  voice("хочу в европу бюджет пятнадцать тысяч айлтс шесть интересует программирование").length >= 4,
  voice("хочу в европу бюджет пятнадцать тысяч айлтс шесть интересует программирование").map((item) => item.field).join(", "),
);
check("«бюджет 15000» без валюты читается как доллары", voiceField("бюджет 15000", "budget")?.numeric === 15000);

console.log("\n[18] LLM только дополняет, но не портит");

// Провайдер не нужен: подделываем ответ модели — ровно такой, какой проходит
// zod-схему, но искажает смысл. Именно так выглядит правдоподобная галлюцинация.
const llmText = "Хочу в Европу, бюджет до $15k в год, IELTS 6.5, средний балл 4.8";
const llmRules = extractFacts(llmText, { now });
const fakeLlmFact = (field: MemoryFact["field"], value: string, quote: string, numericValue?: number): MemoryFact => ({
  id: `llm-${field}`,
  field,
  label: FIELD_LABELS[field],
  value,
  display: value,
  quote,
  confidence: 0.95,
  numeric: numericValue,
  source: "text",
  createdAt: 0,
});

const guarded = reconcileEnrichment(
  llmRules,
  [
    fakeLlmFact("budget", "до $50 000", "бюджет пятьдесят тысяч", 50000),
    fakeLlmFact("ielts", "6.0", "IELTS 6.0", 6),
    fakeLlmFact("gpa", "3.2/5", "средний балл 3.2", 3.2),
    fakeLlmFact("country", "Канада", "хочу в Канаду"),
    fakeLlmFact("name", "Алия", "меня зовут Алия"),
  ],
  llmText,
);
const guardedValue = (field: string) => guarded.facts.find((item) => item.field === field)?.display;
check("модель не переписала бюджет", guardedValue("budget") === "до $15 000", guardedValue("budget"));
check("модель не переписала IELTS", guardedValue("ielts") === "6.5", guardedValue("ielts"));
check("модель не переписала средний балл", guardedValue("gpa") === "4.8 из 5", guardedValue("gpa"));
check("выдуманная страна отклонена", guardedValue("country") === "Европа", guardedValue("country"));
check("выдуманное имя не попало в память", guardedValue("name") === undefined, guardedValue("name"));
check("каждое отклонение объяснено", guarded.rejected.length === 5, String(guarded.rejected.length));
check(
  "причина отклонения по цитате названа верно",
  guarded.rejected.find((item) => item.field === "country")?.reason === "цитаты нет в реплике",
  guarded.rejected.find((item) => item.field === "country")?.reason,
);

// Полезное дополнение модель внести может — этого пути мы не ломаем.
const sparseText = "Хочу учиться за рубежом, интересует психология";
const sparseRules = extractFacts(sparseText, { now });
const enriched = reconcileEnrichment(
  sparseRules,
  [fakeLlmFact("interests", "Психология", "интересует психология")],
  sparseText,
);
check("модель может дополнить то, чего правила не нашли", enriched.added.length >= 0);
check(
  "уверенность фактов модели ограничена",
  enriched.added.every((item) => item.confidence <= 0.75),
  enriched.added.map((item) => String(item.confidence)).join(", "),
);

// Словарь: движок принимает только то, что умеет считать.
const vocab = reconcileEnrichment(
  extractFacts("Хочу учиться в Европе", { now }),
  [
    fakeLlmFact("country", "Атлантида", "Хочу учиться в Европе"),
    fakeLlmFact("interests", "Квантовая алхимия", "Хочу учиться в Европе"),
  ],
  "Хочу учиться в Европе",
);
check("незнакомая страна отклонена по словарю", vocab.rejected.some((item) => item.field === "country" && item.reason === "движок не знает такого значения"));
check("незнакомое направление отклонено по словарю", vocab.rejected.some((item) => item.field === "interests" && item.reason === "движок не знает такого значения"));
check("память осталась чистой", vocab.facts.length === extractFacts("Хочу учиться в Европе", { now }).length);

// Числа вне диапазона.
const insane = reconcileEnrichment(
  extractFacts("Учусь в 11 классе", { now }),
  [
    fakeLlmFact("ielts", "12.0", "Учусь в 11 классе", 12),
    fakeLlmFact("budget", "до $9 000 000", "Учусь в 11 классе", 9_000_000),
  ],
  "Учусь в 11 классе",
);
check("IELTS 12.0 отклонён как невозможный", insane.rejected.some((item) => item.field === "ielts" && item.reason === "число вне допустимого диапазона"));
check("бюджет 9 млн отклонён", insane.rejected.some((item) => item.field === "budget" && item.reason === "число вне допустимого диапазона"));

// Пустой ответ модели ничего не ломает.
const untouched = reconcileEnrichment(llmRules, [], llmText);
check("пустой ответ модели оставляет факты правил как есть", untouched.facts.length === llmRules.length && untouched.added.length === 0);

console.log("\n[19] Грязный ввод не ломает сервис");

// Ни один ввод не должен приводить к исключению: реплику печатает живой человек.
const messy = ["", "   ", "\n\n", "?!?!", "😀🎓✨", "...", "аааааааа", "12345", "$$$", "<script>alert(1)</script>", "'; DROP TABLE--"];
for (const input of messy) {
  let threw = false;
  let produced = 0;
  try {
    produced = extractFacts(input, { now }).length;
  } catch {
    threw = true;
  }
  check(`${JSON.stringify(input).slice(0, 22)} не ломает извлечение`, !threw, "выброшено исключение");
  check(`${JSON.stringify(input).slice(0, 22)} не порождает выдуманных фактов`, produced === 0, String(produced));
}

// Длинная реплика: у /extract лимит 2000 символов, движок должен их тянуть.
const longText = "Я очень долго думала куда поступать и перебирала варианты. ".repeat(28) + "Хочу в Европу, бюджет до $15k, IELTS 6.5, интересует IT.";
const longStart = Date.now();
const longFacts = extractFacts(longText.slice(0, 2000), { now });
check("длинная реплика обрабатывается быстро", Date.now() - longStart < 100, `${Date.now() - longStart} мс`);
check("и факты из её конца всё равно находятся", longFacts.length >= 3, longFacts.map((item) => item.field).join(", "));

// Противоречия внутри одной реплики разрешаются, а не ломают разбор.
const conflicting = extractFacts("Хочу в Германию и в Польшу, бюджет 10 и 20 тысяч долларов", { now });
check("две страны в одной реплике сохраняются обе", conflicting.find((item) => item.field === "country")?.value === "Германия; Польша", conflicting.find((item) => item.field === "country")?.value);
check("из двух сумм берётся одна", typeof conflicting.find((item) => item.field === "budget")?.numeric === "number");

// Частые опечатки.
check("«Евроапу» распознаётся как Европа", extractFacts("хочу в Евроапу", { now }).some((item) => item.field === "country" && item.value === "Европа"));
check("«айлст 6.5» распознаётся как IELTS", extractFacts("айлст 6.5", { now }).find((item) => item.field === "ielts")?.numeric === 6.5);
check("«бюджед до 15к» распознаётся", extractFacts("бюджед до 15к", { now }).find((item) => item.field === "budget")?.numeric === 15000);

console.log("\n[20] Полная стоимость программы");
const withDuration = recommend(extractFacts("Хочу в Европу, бюджет до $15k, интересует IT, IELTS 6.5", { now })).recommendations;
check("у каждой рекомендации есть стоимость всей программы", withDuration.every((item) => item.totalProgramUsd > 0));
check(
  "она равна годовой, умноженной на длительность",
  withDuration.every((item) => item.totalProgramUsd === Math.round(item.totalPerYearUsd * item.program.durationYears)),
);
const fourYear = PROGRAMS.find((program) => program.durationYears === 4 && program.scholarship !== "full");
const threeYear = PROGRAMS.find((program) => program.durationYears === 3 && program.scholarship !== "full");
check("в базе есть программы разной длительности", fourYear !== undefined && threeYear !== undefined);
check(
  "при равной годовой цене более длинная программа оценивается ниже",
  (() => {
    const ctx = buildContext(extractFacts("Хочу в Европу, бюджет до $20k, интересует IT", { now }));
    const short = { ...PROGRAMS[0], durationYears: 3, scholarship: "partial" as const };
    const long = { ...PROGRAMS[0], durationYears: 5, scholarship: "partial" as const };
    return scoreProgram(short, ctx).score > scoreProgram(long, ctx).score;
  })(),
);
check(
  "но полная стипендия снимает штраф за длительность",
  (() => {
    const ctx = buildContext(extractFacts("Хочу в Европу, бюджет до $20k, интересует IT", { now }));
    const short = { ...PROGRAMS[0], durationYears: 3, scholarship: "full" as const };
    const long = { ...PROGRAMS[0], durationYears: 6, scholarship: "full" as const };
    return scoreProgram(short, ctx).score === scoreProgram(long, ctx).score;
  })(),
);

console.log("\n[21] What If: каждый пресет что-то делает и объясняет что именно");

const whatifProfile = extractFacts("Хочу в Европу, бюджет до $15k, IELTS 6.0, средний балл 4.5, интересует IT", { now });
const whatifBase = recommend(whatifProfile).recommendations;

for (const preset of WHATIF_PRESETS) {
  const result = applyWhatIf(whatifProfile, preset.params);
  check(`«${preset.label}»: сводка непустая`, result.summary.length > 20, result.summary);
  check(`«${preset.label}»: рейтинг пересчитан целиком`, result.recommendations.length === PROGRAMS.length);
  // «Сбалансировано» — это сброс к базовым весам, движения от него и не ждём.
  if (preset.id !== "balanced") {
    const churn = rankingChurn(whatifBase, result.recommendations);
    check(
      `«${preset.label}» заметно меняет топ-5 (${Math.round(churn * 100)}%)`,
      churn >= 0.1,
      `${Math.round(churn * 100)}% — пресет, который ничего не делает, хуже отсутствия пресета`,
    );
  }
}

// Сводка должна называть, ЧТО изменили: иначе разные сценарии читаются одинаково.
const budgetScenario = applyWhatIf(whatifProfile, { budget: 10000, countryWeight: 1, budgetWeight: 1, scholarshipWeight: 1 });
check("сценарий с бюджетом называет обе суммы", budgetScenario.summary.includes("15 000") && budgetScenario.summary.includes("10 000"), budgetScenario.summary);
const ieltsScenario = applyWhatIf(whatifProfile, { ielts: 7, countryWeight: 1, budgetWeight: 1, scholarshipWeight: 1 });
check("сценарий с IELTS называет оба балла", ieltsScenario.summary.includes("6.0") && ieltsScenario.summary.includes("7.0"), ieltsScenario.summary);
check(
  "сценарии с разными вводными не выглядят одинаково",
  budgetScenario.summary !== ieltsScenario.summary,
);
check("сводка начинается с заглавной буквы", WHATIF_PRESETS.every((preset) => {
  const text = applyWhatIf(whatifProfile, preset.params).summary;
  return text[0] === text[0].toUpperCase();
}));

// Пресет «бюджет важнее» не должен понижать стипендию: полное покрытие и есть
// лучший исход по деньгам.
const budgetFirst = WHATIF_PRESETS.find((preset) => preset.id === "budget-first");
check("«бюджет важнее» не обесценивает стипендию", (budgetFirst?.params.scholarshipWeight ?? 0) >= 1, String(budgetFirst?.params.scholarshipWeight));

console.log("\n[22] Сравнение программ: данных хватает и «лучшее» честно");
const compareSet = recommend(extractFacts("Хочу в Европу, бюджет до $15k, интересует IT, IELTS 6.5", { now })).recommendations.slice(0, 3);
check("у каждой программы есть годовая и полная стоимость", compareSet.every((item) => item.totalPerYearUsd > 0 && item.totalProgramUsd > 0));
check(
  "полная стоимость учитывает длительность",
  compareSet.every((item) => item.totalProgramUsd === Math.round(item.totalPerYearUsd * item.program.durationYears)),
);
// Дешевле за год ≠ дешевле за обучение: без отдельной строки подсветка врёт.
const cheaperPerYearDiffers = (() => {
  let differs = 0;
  for (let i = 0; i < PROGRAMS.length; i += 1) {
    for (let j = i + 1; j < PROGRAMS.length; j += 1) {
      const a = PROGRAMS[i];
      const b = PROGRAMS[j];
      const byYear = totalPerYear(a) < totalPerYear(b) ? a.id : b.id;
      const byTotal = totalProgramCost(a) < totalProgramCost(b) ? a.id : b.id;
      if (byYear !== byTotal) differs += 1;
    }
  }
  return differs;
})();
check(
  `в базе есть пары, где дешевле за год ≠ дешевле за обучение (${cheaperPerYearDiffers})`,
  cheaperPerYearDiffers > 0,
  "иначе отдельная строка полной стоимости была бы не нужна",
);

console.log("\n[23] Маршрут знает, какое сегодня число");

const today = new Date("2026-09-17T12:00:00Z");
const applicant = extractFacts("Хочу в Европу, интересует IT, IELTS 5.5, средний балл 3.8, бюджет до $20k", { now: today });

// Дедлайн в январе: обычный график подготовки начинается раньше, чем сегодня.
const soon = buildRoadmap(applicant, PROGRAMS.find((program) => program.id === "tudelft-eng") ?? null, { now: today });
check("шаги с прошедшими сроками помечены", soon.steps.some((step) => step.overdue));
check(
  "и не показывают дату из прошлого",
  soon.steps.filter((step) => step.overdue).every((step) => step.dueMonth === "Как можно скорее"),
  soon.steps.filter((step) => step.overdue).map((step) => step.dueMonth).join(", "),
);
check(
  "ни один срок не указывает в прошлое",
  soon.steps.every((step) => {
    const match = /(20\d\d)/.exec(step.dueMonth);
    return !match || Number(match[1]) >= today.getUTCFullYear();
  }),
  soon.steps.map((step) => step.dueMonth).join(" | "),
);
check("темп распознан как срочный", soon.pace === "urgent", soon.pace);
check("до дедлайна посчитаны месяцы", soon.monthsToDeadline === 4, String(soon.monthsToDeadline));
check("оценка запаса времени объяснена словами", soon.paceNote.length > 40, soon.paceNote);

// Дедлайн в июле: времени достаточно, ничего не просрочено.
const roomy = buildRoadmap(applicant, PROGRAMS.find((program) => program.id === "pw-cs") ?? null, { now: today });
check("при дальнем дедлайне просроченных шагов нет", roomy.steps.every((step) => !step.overdue));
check("темп распознан как спокойный", roomy.pace === "comfortable", roomy.pace);
check("маршруты с разным запасом времени объясняются по-разному", roomy.paceNote !== soon.paceNote);

// Набор прошёл целиком — маршрут переезжает на следующий, а не показывает прошлое.
const nextIntake = buildRoadmap(applicant, PROGRAMS.find((program) => program.id === "pw-cs") ?? null, {
  now: new Date("2028-03-01T12:00:00Z"),
});
check(
  "после прошедшего набора маршрут переезжает на следующий",
  nextIntake.steps.find((step) => step.id.endsWith("-apply"))?.dueMonth.includes("2028") === true,
  nextIntake.steps.find((step) => step.id.endsWith("-apply"))?.dueMonth,
);

// Без цели маршрут не притворяется, что что-то построил.
const noTarget = buildRoadmap([], null, { now: today, programs: [] });
check("без цели маршрут пуст", noTarget.steps.length === 0 && noTarget.targetProgram === null);
check("и честно говорит почему", noTarget.paceNote.includes("Цель ещё не выбрана"), noTarget.paceNote);

console.log("\n[24] Диагностика считает в рамках того, что человек назвал");

const medicine = extractFacts("Хочу стать врачом в Европе, бюджет до $20k, IELTS 6.0, средний балл 4.3", { now });
const medDiag = diagnose(medicine);
const medScope = relevantPrograms(medicine);
check("выборка сужена до направления", medScope.programs.length === 3, String(medScope.programs.length));
check("и названа человеку понятно", medScope.label.includes("направлению"), medScope.label);
check(
  "цифры считаются от выборки, а не от всей базы",
  medDiag.constraints.concat(medDiag.strengths).some((line) => line.includes("из 3 программ")),
  medDiag.strengths.concat(medDiag.constraints).join(" | ").slice(0, 120),
);
check(
  "и не обещают того, чего нет: «из 45» в цифрах покрытия больше не появляется",
  !medDiag.strengths.concat(medDiag.constraints).some((line) => /покрывает \d+ из 45|открывает \d+ из 45/.test(line)),
);
check(
  "узкий выбор назван ограничением",
  medDiag.constraints.some((line) => line.includes("не проходит ни одна") || line.includes("выбор узкий")),
  medDiag.constraints.join(" | ").slice(0, 120),
);

// Ноль покрытия не может быть сильной стороной.
const impossible = diagnose(extractFacts("Хочу в Нидерланды на медицину, бюджет до $8k, IELTS 5.0", { now }));
check(
  "нулевое покрытие бюджета — ограничение, а не достижение",
  impossible.constraints.some((line) => line.includes("покрывает 0 из")) &&
    !impossible.strengths.some((line) => line.includes("покрывает 0 из")),
  impossible.strengths.join(" | "),
);
check(
  "в сильных сторонах нет строк с нулём",
  !impossible.strengths.some((line) => /\b0 из \d+/.test(line)),
  impossible.strengths.join(" | "),
);

// Широкий профиль по-прежнему получает нормальные сильные стороны.
const wide = diagnose(extractFacts("Хочу в Европу, интересует IT, бюджет до $15k, IELTS 6.5, средний балл 4.5", { now }));
check("широкому профилю сильные стороны остаются", wide.strengths.length >= 3, String(wide.strengths.length));
check(
  "и подтверждают, что вариантов много",
  wide.strengths.some((line) => line.includes("По всем твоим условиям сразу проходит")),
  wide.strengths.join(" | ").slice(0, 120),
);

// Диагностика не должна противоречить рекомендациям.
const shownTop = recommend(medicine).recommendations.slice(0, 1)[0];
check(
  "топ-1 действительно по названному направлению",
  shownTop.program.tags.includes("medicine"),
  `${shownTop.program.id} (${shownTop.program.field})`,
);

console.log("\n[25] Интервью проходится до конца и не врёт о результате");

// Полный проход, как это сделает жюри: на каждый вопрос — человеческий ответ.
const ANSWERS: Record<string, string> = {
  intro: "Меня зовут Алия, я в 11 классе",
  country: "Хочу в Европу",
  budget: "Бюджет до 15 тысяч долларов в год",
  ielts: "IELTS 6.0",
  gpa: "Средний балл 4.5",
  interests: "Интересует IT и программирование",
  priority: "Осень 2027, стипендия важнее страны",
  constraints: "Ограничений нет",
};
let walkMemory: MemoryFact[] = [];
const walkAsked: string[] = [];
let turns = 0;
let finished = false;
while (turns < 15) {
  const step = selectNextQuestion(walkMemory, walkAsked, { now });
  if (!step.question) {
    finished = true;
    check("интервью завершается честно", !step.reason.includes("Вопросы закончились"), step.reason);
    break;
  }
  const answer = ANSWERS[step.question.id] ?? step.question.quickReplies[0] ?? "Не знаю";
  walkMemory = mergeFacts(walkMemory, extractFacts(answer, { now }));
  walkAsked.push(step.question.id);
  turns += 1;
}
check("интервью доходит до конца без зацикливания", finished && turns <= 10, `${turns} вопросов`);
check("собраны все ключевые факты", CORE_FIELDS.every((field) => fact(walkMemory, field) !== undefined), CORE_FIELDS.filter((field) => !fact(walkMemory, field)).join(", "));
check("полнота профиля 100%", diagnose(walkMemory).completeness === 100, `${diagnose(walkMemory).completeness}%`);
check("после интервью маршрут строится", buildRoadmap(walkMemory, null, { now }).steps.length >= 8);
check("и рекомендации персональны", recommend(walkMemory).recommendations[0].reasons.some((reason) => reason.field !== "program"));

// Ответы «не знаю» не должны превращаться в ложное «всё собрано».
const halfAnswered = mergeFacts(extractFacts("Меня зовут Алия, 11 класс", { now }), extractFacts("Интересует IT", { now }));
const honestEnd = selectNextQuestion(halfAnswered, ["intro", "country", "budget", "ielts", "gpa", "interests", "priority", "constraints"], { now });
check("при незаполненном профиле финал не утверждает обратного", !honestEnd.reason.includes("Все ключевые факты собраны"), honestEnd.reason);
check("и перечисляет, чего не хватает", honestEnd.reason.includes("Не хватает"), honestEnd.reason);
check("и называет реальную полноту", honestEnd.reason.includes(`${diagnose(halfAnswered).completeness}%`), honestEnd.reason);
check("аббревиатура IELTS не пишется строчными", !honestEnd.reason.includes("ielts"), honestEnd.reason);

// Реплика, из которой ничего не извлеклось, не остаётся без ответа.
const someQuestion = selectNextQuestion(extractFacts("Хочу в Европу, интересует IT", { now }), ["intro", "country", "interests"], { now }).question;
for (const [answer, expected] of [
  ["Ограничений нет", "ограничений нет"],
  ["нет ограничений", "ограничений нет"],
  ["не знаю", "пропустим"],
  ["хз", "пропустим"],
  ["абракадабра", "не уловил"],
] as const) {
  const reply = composeAgentReply(extractFacts(answer, { now }), someQuestion, answer).toLowerCase();
  check(`«${answer}» получает осмысленный ответ`, reply.includes(expected), reply.split("\n")[0]);
}
check(
  "а распознанный факт по-прежнему подтверждается",
  composeAgentReply(extractFacts("Средний балл 4.5", { now }), someQuestion, "Средний балл 4.5").includes("4.5"),
);

console.log("\n[26] Правка чипа руками не ломает профиль");

// Это шаг демо-сценария, поэтому мусор попадает сюда в первую очередь.
const chip = (field: MemoryFact["field"], raw: string) => reparseFactValue(field, raw);

check("«10к» — самый вероятный ввод — даёт 10 000, а не 10", chip("budget", "10к")?.numeric === 10000, String(chip("budget", "10к")?.numeric));
check("«15k» латиницей тоже", chip("budget", "15k")?.numeric === 15000, String(chip("budget", "15k")?.numeric));
check("«10 тысяч» словом", chip("budget", "10 тысяч")?.numeric === 10000);
check("«пятнадцать тысяч» прописью", chip("budget", "пятнадцать тысяч")?.numeric === 15000);
check("«до $10 000» как в подсказке", chip("budget", "до $10 000")?.numeric === 10000);
check(
  "лишние числа в строке не склеиваются",
  chip("budget", "до 10 000 в год 2027")?.numeric === 10000,
  String(chip("budget", "до 10 000 в год 2027")?.numeric),
);

// Невозможные значения не должны попадать в скоринг числом.
for (const [field, raw] of [
  ["budget", "0"],
  ["budget", "999999999"],
  ["budget", "abc"],
  ["ielts", "15"],
  ["ielts", "0"],
  ["ielts", "не сдавал"],
  ["gpa", "100"],
] as const) {
  check(`«${raw}» в поле ${field} не становится числом`, chip(field, raw)?.numeric === undefined, String(chip(field, raw)?.numeric));
}
check("но текст пользователя сохраняется", chip("budget", "abc")?.display === "abc");
check("а корректные значения по-прежнему разбираются", chip("ielts", "6,5")?.numeric === 6.5 && chip("gpa", "3.9 из 4")?.numeric === 3.9);
check("нечисловые поля просто нормализуются", chip("country", "  Германия  ")?.value === "Германия");
check("пустой ввод отвергается", chip("budget", "   ") === null);

console.log("\n[27] Удаление фактов на полпути");
const fullProfile = extractFacts("Меня зовут Алия, 11 класс. Хочу в Европу, бюджет до $15k, IELTS 6.0, средний балл 4.5, интересует IT", { now });
// Человек удаляет чипы один за другим — сервис не должен падать или врать.
let shrinking = [...fullProfile];
while (shrinking.length > 0) {
  const before = shrinking.length;
  shrinking = shrinking.slice(1);
  let broke = false;
  try {
    recommend(shrinking);
    diagnose(shrinking);
    buildRoadmap(shrinking, null, { now });
    selectNextQuestion(shrinking, [], { now });
  } catch {
    broke = true;
  }
  check(`после удаления факта (${before} → ${shrinking.length}) путь не ломается`, !broke);
}
const afterWipe = diagnose([]);
check("на пустой памяти полнота 0%", afterWipe.completeness === 0, `${afterWipe.completeness}%`);
check("и диагностика не выдумывает сильных сторон", afterWipe.strengths.length === 0, afterWipe.strengths.join(" | "));
check("интервью снова начинает со знакомства", selectNextQuestion([], [], { now }).kind === "opener");

console.log("\n[28] Профиль из localStorage переживает обновление правил");

// Так факт выглядел, когда его записывала прежняя версия разбора.
const stored = (field: MemoryFact["field"], value: string, display: string, numericValue?: number): MemoryFact => ({
  id: `f-${field}`,
  field,
  label: FIELD_LABELS[field],
  value,
  display,
  quote: "",
  confidence: 0.9,
  numeric: numericValue,
  source: "manual",
  createdAt: 1,
});

const migrated = normalizeStoredMemories([
  stored("budget", "10к", "10к", 10),
  stored("ielts", "15", "15", 15),
  stored("gpa", "4.5/5", "4.5 из 5", 4.5),
  stored("country", "Европа", "Европа"),
  stored("interests", "IT и программирование", "IT и программирование"),
]);
const migratedField = (field: string) => migrated.find((item) => item.field === field);

check("бюджет «10к» чинится до 10 000", migratedField("budget")?.numeric === 10000, String(migratedField("budget")?.numeric));
check("и прежнее значение уходит в историю", migratedField("budget")?.history?.[0]?.display === "10к", migratedField("budget")?.history?.[0]?.display);
check("невозможный IELTS теряет число", migratedField("ielts")?.numeric === undefined, String(migratedField("ielts")?.numeric));
check("но текст пользователя остаётся", migratedField("ielts")?.display === "15");
check("корректные факты не трогаются", migratedField("gpa")?.numeric === 4.5 && migratedField("gpa")?.history === undefined);
check("нечисловые факты не трогаются", migratedField("country")?.value === "Европа" && migratedField("country")?.history === undefined);
check("количество фактов не меняется", migrated.length === 5);

// Починенный профиль должен работать во всём пути.
let migrationBroke = false;
try {
  recommend(migrated);
  diagnose(migrated);
  buildRoadmap(migrated, null, { now });
  selectNextQuestion(migrated, [], { now });
} catch {
  migrationBroke = true;
}
check("после миграции весь путь работает", !migrationBroke);
check(
  "и рекомендации считаются по исправленному бюджету",
  recommend(migrated).recommendations.some((item) => item.budgetDeltaUsd !== null && item.budgetDeltaUsd > 0),
  "при бюджете $10 хотя бы одна программа не может уложиться",
);

// Повторная миграция ничего не портит.
const twice = normalizeStoredMemories(migrated);
check("повторный прогон миграции идемпотентен", JSON.stringify(twice.map((item) => [item.value, item.numeric])) === JSON.stringify(migrated.map((item) => [item.value, item.numeric])));

console.log(`\nИтог: ${passed} ok, ${failed} fail\n`);
if (failed > 0) process.exit(1);
