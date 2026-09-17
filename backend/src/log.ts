type Level = "info" | "warn" | "error";

// Читаем при каждом вызове, а не при импорте: импорты выполняются раньше,
// чем тест успеет выставить переменную окружения.
const silent = (): boolean => process.env.LOG_SILENT === "1";

/**
 * Структурный лог одной строкой JSON: Railway и любой сборщик логов читают это
 * без парсеров. Человекочитаемый баннер остаётся только при старте.
 */
export function log(level: Level, event: string, fields: Record<string, unknown> = {}): void {
  if (silent()) return;
  const line = JSON.stringify({ ts: new Date().toISOString(), level, event, ...fields });
  if (level === "error") console.error(line);
  else console.log(line);
}

export const logInfo = (event: string, fields?: Record<string, unknown>) => log("info", event, fields);
export const logWarn = (event: string, fields?: Record<string, unknown>) => log("warn", event, fields);
export const logError = (event: string, fields?: Record<string, unknown>) => log("error", event, fields);

/** Короткий идентификатор запроса — сквозной ключ между логом и ответом клиенту. */
export function newRequestId(): string {
  return `r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
