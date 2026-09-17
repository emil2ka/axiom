import { createApp } from "./app";
import { llmEnabled, llmProviderName } from "./llm";
import { logInfo, logWarn } from "./log";
import { PROGRAMS } from "./shared/engine/index";

const port = Number(process.env.PORT ?? 8787);
const app = createApp();

const server = app.listen(port, () => {
  logInfo("server_started", {
    port,
    programs: PROGRAMS.length,
    llm: llmEnabled() ? llmProviderName() : "disabled",
    rateLimitPerMin: Number(process.env.RATE_LIMIT_PER_MIN ?? 120),
  });
  console.log(`[axiom] backend listening on http://localhost:${port}`);
  console.log(`[axiom] llm: ${llmEnabled() ? llmProviderName() : "disabled (rules engine)"}`);
});

/**
 * Railway шлёт SIGTERM при редеплое. Без этого обработчика процесс умирает
 * посреди запроса и клиент видит оборванное соединение вместо ответа.
 */
const SHUTDOWN_TIMEOUT_MS = 10_000;
let shuttingDown = false;

function shutdown(signal: string): void {
  if (shuttingDown) return;
  shuttingDown = true;
  logInfo("shutdown_started", { signal });

  const forceExit = setTimeout(() => {
    logWarn("shutdown_forced", { afterMs: SHUTDOWN_TIMEOUT_MS });
    process.exit(1);
  }, SHUTDOWN_TIMEOUT_MS);
  forceExit.unref();

  server.close((error) => {
    clearTimeout(forceExit);
    if (error) {
      logWarn("shutdown_error", { message: String(error) });
      process.exit(1);
    }
    logInfo("shutdown_complete", { signal });
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
