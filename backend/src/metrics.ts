const STARTED_AT = Date.now();
const LATENCY_WINDOW = 200;

interface RouteStats {
  count: number;
  errors: number;
  durationsMs: number[];
}

const routes = new Map<string, RouteStats>();
const statusClasses = new Map<string, number>();

export const llmStats = { calls: 0, cacheHits: 0, retries: 0, failures: 0 };

export function recordRequest(route: string, statusCode: number, durationMs: number): void {
  const stats = routes.get(route) ?? { count: 0, errors: 0, durationsMs: [] };
  stats.count += 1;
  if (statusCode >= 500) stats.errors += 1;
  stats.durationsMs.push(durationMs);
  // Держим только последние N замеров: метрики не должны течь по памяти.
  if (stats.durationsMs.length > LATENCY_WINDOW) stats.durationsMs.shift();
  routes.set(route, stats);

  const klass = `${Math.floor(statusCode / 100)}xx`;
  statusClasses.set(klass, (statusClasses.get(klass) ?? 0) + 1);
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return Math.round(sorted[index] * 100) / 100;
}

export function snapshot(): Record<string, unknown> {
  const perRoute: Record<string, unknown> = {};
  let total = 0;
  let errors = 0;

  for (const [route, stats] of routes) {
    total += stats.count;
    errors += stats.errors;
    perRoute[route] = {
      count: stats.count,
      errors: stats.errors,
      p50ms: percentile(stats.durationsMs, 50),
      p95ms: percentile(stats.durationsMs, 95),
    };
  }

  return {
    uptimeSec: Math.round((Date.now() - STARTED_AT) / 1000),
    requests: { total, errors, byStatusClass: Object.fromEntries(statusClasses) },
    routes: perRoute,
    llm: { ...llmStats },
    memoryMb: Math.round((process.memoryUsage().rss / 1024 / 1024) * 10) / 10,
  };
}

/** Нужен тестам: метрики живут в памяти процесса и между прогонами не должны смешиваться. */
export function resetMetrics(): void {
  routes.clear();
  statusClasses.clear();
  llmStats.calls = 0;
  llmStats.cacheHits = 0;
  llmStats.retries = 0;
  llmStats.failures = 0;
}
