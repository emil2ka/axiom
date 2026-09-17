import type { NextFunction, Request, Response } from "express";
import { logError, logInfo, newRequestId } from "./log";
import { recordRequest } from "./metrics";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      requestId?: string;
    }
  }
}

/** Сквозной id запроса: уходит и в лог, и в заголовок ответа. */
export function requestId(req: Request, res: Response, next: NextFunction): void {
  const incoming = req.header("x-request-id");
  const id = incoming && incoming.length <= 80 ? incoming : newRequestId();
  req.requestId = id;
  res.setHeader("x-request-id", id);
  next();
}

/** Лог доступа + метрики. Тело не логируем: в нём профиль пользователя. */
export function accessLog(req: Request, res: Response, next: NextFunction): void {
  const startedAt = process.hrtime.bigint();
  res.on("finish", () => {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const route = `${req.method} ${req.route?.path ?? req.path}`;
    recordRequest(route, res.statusCode, durationMs);
    const fields = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Math.round(durationMs * 100) / 100,
    };
    if (res.statusCode >= 500) logError("request_failed", fields);
    else logInfo("request", fields);
  });
  next();
}

interface Bucket {
  hits: number[];
}

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;
const MAX_CLIENTS = 5000;

export interface RateLimitOptions {
  perMinute: number;
  /** Пути, которые не лимитируем: health-check платформы не должен упираться в лимит. */
  exempt?: string[];
}

/**
 * Скользящее окно в памяти процесса. Для одного инстанса этого достаточно;
 * при горизонтальном масштабировании понадобится общий Redis — здесь честно
 * фиксируем ограничение, а не делаем вид, что лимит распределённый.
 */
export function rateLimit(options: RateLimitOptions) {
  const exempt = new Set(options.exempt ?? []);

  return (req: Request, res: Response, next: NextFunction): void => {
    if (options.perMinute <= 0 || exempt.has(req.path)) {
      next();
      return;
    }

    const key = req.ip ?? req.socket.remoteAddress ?? "unknown";
    const now = Date.now();
    const bucket = buckets.get(key) ?? { hits: [] };
    bucket.hits = bucket.hits.filter((at) => now - at < WINDOW_MS);

    if (bucket.hits.length >= options.perMinute) {
      const retryAfterSec = Math.max(1, Math.ceil((WINDOW_MS - (now - bucket.hits[0])) / 1000));
      buckets.set(key, bucket);
      res.setHeader("retry-after", String(retryAfterSec));
      res.status(429).json({ error: "rate_limited", retryAfterSec, requestId: req.requestId });
      return;
    }

    bucket.hits.push(now);
    buckets.set(key, bucket);

    // Грубая защита от роста мапы, если клиентов очень много.
    if (buckets.size > MAX_CLIENTS) {
      for (const [client, value] of buckets) {
        if (!value.hits.some((at) => now - at < WINDOW_MS)) buckets.delete(client);
      }
    }

    res.setHeader("x-ratelimit-limit", String(options.perMinute));
    res.setHeader("x-ratelimit-remaining", String(Math.max(0, options.perMinute - bucket.hits.length)));
    next();
  };
}

export function resetRateLimit(): void {
  buckets.clear();
}
