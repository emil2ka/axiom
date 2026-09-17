/**
 * Сквозная проверка API: поднимает настоящее приложение на свободном порту и
 * ходит в него по HTTP. selftest проверяет движок, этот скрипт — границу:
 * валидацию, коды ошибок, заголовки, лимит запросов и формат ответов.
 * Именно на границе ловятся баги, которых юнит-тесты не видят.
 */
import type { AddressInfo } from "node:net";
import { createApp } from "./app";
import { resetMetrics } from "./metrics";
import { resetRateLimit } from "./http";
import type { MemoryFact } from "./shared/engine/index";

process.env.LOG_SILENT = "1";

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

interface Reply<T = any> {
  status: number;
  headers: Headers;
  body: T;
}

async function main(): Promise<void> {
  resetMetrics();
  resetRateLimit();

  // rateLimitPerMinute: 0 — лимит проверяем отдельным приложением, иначе он
  // сработал бы на самих проверках.
  const app = createApp({ rateLimitPerMinute: 0 });
  const server = app.listen(0);
  await new Promise((resolve) => server.once("listening", resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

  const get = async (path: string): Promise<Reply> => {
    const response = await fetch(`${base}${path}`);
    return { status: response.status, headers: response.headers, body: await response.json().catch(() => null) };
  };
  const post = async (path: string, payload: unknown, headers: Record<string, string> = {}): Promise<Reply> => {
    const response = await fetch(`${base}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...headers },
      body: typeof payload === "string" ? payload : JSON.stringify(payload),
    });
    return { status: response.status, headers: response.headers, body: await response.json().catch(() => null) };
  };

  try {
    console.log("\n[1] Здоровье и данные");
    const health = await get("/health");
    check("GET /health → 200", health.status === 200, String(health.status));
    check("health сообщает режим движка", health.body?.engine === "rules" || health.body?.engine === "llm+rules", health.body?.engine);
    check("health сообщает размер базы", health.body?.programs >= 40, String(health.body?.programs));

    const programs = await get("/programs");
    check("GET /programs → 200", programs.status === 200);
    check("программы приходят целиком", Array.isArray(programs.body?.programs) && programs.body.programs.length >= 40, String(programs.body?.programs?.length));
    check("у программы есть порог балла и источник", programs.body.programs.every((p: any) => "gpaMinPercent" in p && p.sources?.length > 0));

    console.log("\n[2] Сквозной путь пользователя");
    const extracted = await post("/extract", {
      text: "Меня зовут Алия, 11 класс. Хочу в Европу, бюджет до $15k, IELTS 6.5, средний балл 4.6, интересует IT. Стипендия важнее страны.",
    });
    check("POST /extract → 200", extracted.status === 200, String(extracted.status));
    const memories: MemoryFact[] = extracted.body?.facts ?? [];
    check("извлечено ≥ 6 фактов", memories.length >= 6, String(memories.length));

    const recommended = await post("/recommend", { memories });
    check("POST /recommend → 200", recommended.status === 200);
    check("рекомендации ранжированы", recommended.body?.recommendations?.[0]?.rank === 1);
    check("возвращены применённые веса", typeof recommended.body?.weights?.budget === "number");
    check("приоритет из памяти применён", recommended.body?.appliedPriority === "scholarship", String(recommended.body?.appliedPriority));
    check("есть объяснение приоритета", (recommended.body?.priorityNote ?? "").includes("стипендия"), recommended.body?.priorityNote);

    const diagnosed = await post("/diagnose", { memories });
    check("POST /diagnose → 200", diagnosed.status === 200);
    check("полнота профиля посчитана", typeof diagnosed.body?.completeness === "number");

    const whatif = await post("/whatif", {
      memories,
      params: { budget: 10000, countryWeight: 1, budgetWeight: 1, scholarshipWeight: 1 },
    });
    check("POST /whatif → 200", whatif.status === 200);
    check("what-if объясняет изменение", (whatif.body?.summary ?? "").length > 10, whatif.body?.summary);

    const roadmap = await post("/roadmap", { memories, programId: "aalto-sci" });
    check("POST /roadmap → 200", roadmap.status === 200);
    check("маршрут построен под выбранную программу", roadmap.body?.targetProgram?.id === "aalto-sci");
    check("в маршруте есть шаги", (roadmap.body?.steps?.length ?? 0) >= 8, String(roadmap.body?.steps?.length));
    // Сильному профилю нечего подтягивать — маршрут короче. Проверяем именно эту разницу.
    const weakFacts = (await post("/extract", { text: "Хочу в Европу, интересует IT, IELTS 5.5, средний балл 3.4" })).body.facts;
    const weakRoadmap = await post("/roadmap", { memories: weakFacts, programId: "aalto-sci" });
    check(
      "слабому профилю маршрут длиннее, чем сильному",
      weakRoadmap.body.steps.length > roadmap.body.steps.length,
      `${roadmap.body.steps.length} → ${weakRoadmap.body.steps.length}`,
    );
    check(
      "и в нём появляются шаги «поднять IELTS» и «подтянуть балл»",
      weakRoadmap.body.steps.some((s: any) => s.id.endsWith("-ielts-up")) &&
        weakRoadmap.body.steps.some((s: any) => s.id.endsWith("-gpa-up")),
      weakRoadmap.body.steps.map((s: any) => s.id).join(", "),
    );

    console.log("\n[3] Память и интервью");
    const updated = await post("/memory/update", { memories, text: "Теперь бюджет до $10k" });
    check("POST /memory/update → 200", updated.status === 200);
    check("правка описана как updated", updated.body?.changes?.some((c: any) => c.field === "budget" && c.kind === "updated"));
    check("прежнее значение сохранено в истории", updated.body?.memories?.find((m: any) => m.field === "budget")?.history?.length === 1);
    check("объяснение связывает правку с последствием", (updated.body?.summary ?? "").includes("бюджет") || (updated.body?.summary ?? "").includes("Бюджет"), updated.body?.summary);

    const interview = await post("/interview/next", { memories, askedIds: ["intro"] });
    check("POST /interview/next → 200", interview.status === 200);
    check("вопрос выбран осознанно", ["gap", "conflict", "done"].includes(interview.body?.kind), interview.body?.kind);
    check("решение объяснено", (interview.body?.reason ?? "").length > 10, interview.body?.reason);

    const conflictFacts = (await post("/extract", { text: "Хочу в Нидерланды, интересует IT, бюджет до $9k" })).body.facts;
    const conflicts = await post("/conflicts", { memories: conflictFacts });
    check("POST /conflicts → 200", conflicts.status === 200);
    check("противоречие найдено", conflicts.body?.conflicts?.some((c: any) => c.id === "budget-vs-country"), JSON.stringify(conflicts.body?.conflicts?.map((c: any) => c.id)));

    console.log("\n[4] Ошибки и валидация");
    check("несуществующий роут → 404", (await get("/nope")).status === 404);
    check("пустое тело → 400", (await post("/recommend", {})).status === 400);
    check("лишнее поле → 400", (await post("/recommend", { memories: [], bogus: 1 })).status === 400);
    const broken = await post("/recommend", "{не json");
    check("битый JSON → 400", broken.status === 400, String(broken.status));
    check("и ответ остаётся JSON, а не HTML", broken.body?.error === "invalid_json", JSON.stringify(broken.body));
    const huge = await post("/recommend", { memories: [], pad: "x".repeat(300_000) });
    check("слишком большое тело → 413", huge.status === 413, String(huge.status));
    check("некорректный IELTS в what-if → 400", (await post("/whatif", { memories: [], params: { ielts: 99, countryWeight: 1, budgetWeight: 1, scholarshipWeight: 1 } })).status === 400);
    check("memory/update без text и facts → 400", (await post("/memory/update", { memories: [] })).status === 400);

    const invalid = await post("/recommend", {});
    check("в ошибке есть requestId", typeof invalid.body?.requestId === "string", JSON.stringify(invalid.body));
    check("ошибка не раскрывает внутренности", !JSON.stringify(invalid.body).includes("node_modules"));

    console.log("\n[5] Заголовки и наблюдаемость");
    const traced = await post("/recommend", { memories }, { "x-request-id": "trace-me-123" });
    check("x-request-id возвращается", traced.headers.get("x-request-id") === "trace-me-123", traced.headers.get("x-request-id") ?? "");
    check("свой request-id проставляется", ((await get("/health")).headers.get("x-request-id") ?? "").length > 0);
    // CORS-заголовок выставляется только на кросс-доменный запрос, то есть при Origin.
    const cors = await fetch(`${base}/health`, { headers: { Origin: "https://axiom.example" } });
    check("CORS разрешён для фронта", cors.headers.has("access-control-allow-origin"), cors.headers.get("access-control-allow-origin") ?? "нет заголовка");
    check("без Origin заголовок не навязывается", !(await get("/health")).headers.has("access-control-allow-origin"));

    const metrics = await get("/metrics");
    check("GET /metrics → 200", metrics.status === 200);
    check("метрики считают запросы", (metrics.body?.requests?.total ?? 0) > 10, String(metrics.body?.requests?.total));
    check("метрики знают о 4xx", (metrics.body?.requests?.byStatusClass?.["4xx"] ?? 0) > 0);
    check("есть задержки по роутам", Object.values(metrics.body?.routes ?? {}).some((r: any) => typeof r.p95ms === "number"));
    check("метрики видят состояние LLM", typeof metrics.body?.llm?.calls === "number");

    console.log("\n[6] Лимит запросов");
    const limited = createApp({ rateLimitPerMinute: 3 });
    const limitedServer = limited.listen(0);
    await new Promise((resolve) => limitedServer.once("listening", resolve));
    const limitedBase = `http://127.0.0.1:${(limitedServer.address() as AddressInfo).port}`;

    const codes: number[] = [];
    for (let i = 0; i < 5; i += 1) {
      codes.push((await fetch(`${limitedBase}/programs`)).status);
    }
    check("первые запросы проходят", codes.slice(0, 3).every((code) => code === 200), codes.join(","));
    check("сверх лимита → 429", codes.slice(3).every((code) => code === 429), codes.join(","));

    const rejected = await fetch(`${limitedBase}/programs`);
    check("429 сообщает, когда повторить", rejected.headers.has("retry-after"));
    check("health не лимитируется", (await fetch(`${limitedBase}/health`)).status === 200);

    await new Promise((resolve) => limitedServer.close(resolve));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log(`\nИтог e2e: ${passed} ok, ${failed} fail\n`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error("e2e упал:", error);
  process.exit(1);
});
