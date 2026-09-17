import cors from "cors";
import express from "express";
import { z } from "zod";
import {
  llmDiagnosisSummary,
  llmEnabled,
  llmExtractFacts,
  llmProviderName,
} from "./llm";
import { accessLog, rateLimit, requestId } from "./http";
import { logError, logInfo } from "./log";
import { snapshot } from "./metrics";
import {
  PROGRAMS,
  applyWhatIf,
  buildRoadmap,
  detectConflicts,
  explainMemoryUpdate,
  diagnose,
  extractFacts,
  reconcileEnrichment,
  recommend,
  selectNextQuestion,
  type MemoryFact,
} from "./shared/engine/index";

const MEMORY_FIELDS = [
  "name",
  "grade",
  "country",
  "budget",
  "ielts",
  "gpa",
  "interests",
  "intake",
  "priority",
  "language",
  "constraints",
] as const;

const revisionSchema = z.object({
  value: z.string().min(1).max(600),
  display: z.string().min(1).max(600),
  numeric: z.number().nullish(),
  source: z.enum(["voice", "text", "manual", "demo"]),
  at: z.number(),
});

const memorySchema = z.object({
  id: z.string().min(1).max(80),
  field: z.enum(MEMORY_FIELDS),
  label: z.string().min(1).max(60),
  value: z.string().min(1).max(600),
  display: z.string().min(1).max(600),
  quote: z.string().max(600).default(""),
  confidence: z.number().min(0).max(1).default(0.8),
  numeric: z.number().nullish(),
  source: z.enum(["voice", "text", "manual", "demo"]),
  createdAt: z.number(),
  history: z.array(revisionSchema).max(20).optional(),
  intent: z.enum(["add", "replace"]).optional(),
});

const memoriesSchema = z.array(memorySchema).max(100);

// zod отдаёт nullish как number | null | undefined, движок работает с undefined.
// Нормализуем и сам факт, и каждую ревизию в его истории.
const toMemories = (input: z.infer<typeof memoriesSchema>): MemoryFact[] =>
  input.map((item) => ({
    ...item,
    numeric: item.numeric ?? undefined,
    history: item.history?.map((revision) => ({
      ...revision,
      numeric: revision.numeric ?? undefined,
    })),
  }));

const schemas = {
  extract: z
    .object({
      text: z.string().min(1).max(2000),
      source: z.enum(["voice", "text", "manual"]).optional(),
    })
    .strict(),
  recommend: z
    .object({
      memories: memoriesSchema,
      limit: z.number().int().min(1).max(50).optional(),
    })
    .strict(),
  whatif: z
    .object({
      memories: memoriesSchema,
      params: z
        .object({
          budget: z.number().min(0).max(500000).nullable().optional(),
          ielts: z.number().min(4).max(9).nullable().optional(),
          countries: z
            .array(z.string().min(1).max(60))
            .max(25)
            .nullable()
            .optional(),
          countryWeight: z.number().min(0).max(5).default(1),
          budgetWeight: z.number().min(0).max(5).default(1),
          scholarshipWeight: z.number().min(0).max(5).default(1),
        })
        .strict(),
    })
    .strict(),
  roadmap: z
    .object({
      memories: memoriesSchema,
      programId: z.string().min(1).max(80).optional(),
    })
    .strict(),
  diagnose: z.object({ memories: memoriesSchema }).strict(),
  interviewNext: z
    .object({
      memories: memoriesSchema,
      askedIds: z.array(z.string().min(1).max(80)).max(50).default([]),
      resolvedConflictIds: z
        .array(z.string().min(1).max(80))
        .max(20)
        .default([]),
    })
    .strict(),
  conflicts: z.object({ memories: memoriesSchema }).strict(),
  memoryUpdate: z
    .object({
      memories: memoriesSchema,
      text: z.string().min(1).max(2000).optional(),
      facts: memoriesSchema.optional(),
    })
    .strict()
    .refine((value) => value.text !== undefined || value.facts !== undefined, {
      message: "нужен text или facts",
    }),
};

export interface AppOptions {
  /** 0 отключает лимит — нужно e2e-прогону, который шлёт запросы пачкой. */
  rateLimitPerMinute?: number;
}

export function createApp(options: AppOptions = {}) {
  const app = express();
  app.use(express.json({ limit: "200kb" }));

  app.set("trust proxy", 1);
  app.use(requestId);
  app.use(accessLog);
  app.use(
    rateLimit({
      perMinute:
        options.rateLimitPerMinute ??
        Number(process.env.RATE_LIMIT_PER_MIN ?? 120),
      exempt: ["/health"],
    }),
  );

  const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "*";
  app.use(
    cors({
      origin:
        allowedOrigin === "*"
          ? true
          : allowedOrigin.split(",").map((origin) => origin.trim()),
    }),
  );

  type AsyncHandler = (
    req: express.Request,
    res: express.Response,
  ) => Promise<void>;

  const wrap =
    (handler: AsyncHandler) =>
    (req: express.Request, res: express.Response): void => {
      handler(req, res).catch((error) => {
        logError("handler_error", {
          requestId: req.requestId,
          path: req.path,
          message: String(error),
        });
        if (!res.headersSent)
          res
            .status(500)
            .json({ error: "internal_error", requestId: req.requestId });
      });
    };

  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      llm: llmEnabled(),
      provider: llmProviderName(),
      engine: llmEnabled() ? "llm+rules" : "rules",
      programs: PROGRAMS.length,
    });
  });

  app.get("/programs", (_req, res) => {
    res.json({ programs: PROGRAMS });
  });

  app.post(
    "/extract",
    wrap(async (req, res) => {
      const parsed = schemas.extract.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({
            error: "invalid_body",
            details: parsed.error.flatten(),
            requestId: req.requestId,
          });
        return;
      }
      const { text, source } = parsed.data;
      const ruleFacts = extractFacts(text, { source: source ?? "text" });
      const llmFacts = await llmExtractFacts(text);
      if (llmFacts && llmFacts.length) {
        // Модель может только дополнить: перезаписывать надёжно извлечённое ей
        // не разрешено, а факты без опоры на текст отбрасываются.
        const enrichment = reconcileEnrichment(ruleFacts, llmFacts, text);
        if (enrichment.rejected.length) {
          logInfo("llm_facts_rejected", {
            requestId: req.requestId,
            rejected: enrichment.rejected.map((item) => `${item.field}: ${item.reason}`),
          });
        }
        res.json({
          facts: enrichment.facts,
          engine: enrichment.added.length ? "llm" : "rules",
          enrichedFields: enrichment.added.map((item) => item.field),
        });
        return;
      }
      res.json({ facts: ruleFacts, engine: "rules" });
    }),
  );

  app.post(
    "/recommend",
    wrap(async (req, res) => {
      const parsed = schemas.recommend.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({
            error: "invalid_body",
            details: parsed.error.flatten(),
            requestId: req.requestId,
          });
        return;
      }
      const result = recommend(toMemories(parsed.data.memories), {
        limit: parsed.data.limit,
      });
      res.json(result);
    }),
  );

  app.post(
    "/whatif",
    wrap(async (req, res) => {
      const parsed = schemas.whatif.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({
            error: "invalid_body",
            details: parsed.error.flatten(),
            requestId: req.requestId,
          });
        return;
      }
      const result = applyWhatIf(
        toMemories(parsed.data.memories),
        parsed.data.params,
      );
      res.json(result);
    }),
  );

  app.post(
    "/roadmap",
    wrap(async (req, res) => {
      const parsed = schemas.roadmap.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({
            error: "invalid_body",
            details: parsed.error.flatten(),
            requestId: req.requestId,
          });
        return;
      }
      const program = parsed.data.programId
        ? (PROGRAMS.find((item) => item.id === parsed.data.programId) ?? null)
        : null;
      const result = buildRoadmap(toMemories(parsed.data.memories), program);
      res.json(result);
    }),
  );

  app.post(
    "/diagnose",
    wrap(async (req, res) => {
      const parsed = schemas.diagnose.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({
            error: "invalid_body",
            details: parsed.error.flatten(),
            requestId: req.requestId,
          });
        return;
      }
      const memories = toMemories(parsed.data.memories);
      const base = diagnose(memories);
      const compact = memories.map((item) => ({
        field: item.field,
        value: item.display,
      }));
      const llmSummary = await llmDiagnosisSummary(JSON.stringify(compact));
      res.json({
        ...base,
        summary: llmSummary ?? base.summary,
        engine: llmSummary ? "llm" : "rules",
      });
    }),
  );

  app.post(
    "/interview/next",
    wrap(async (req, res) => {
      const parsed = schemas.interviewNext.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({
            error: "invalid_body",
            details: parsed.error.flatten(),
            requestId: req.requestId,
          });
        return;
      }
      const { memories, askedIds, resolvedConflictIds } = parsed.data;
      const turn = selectNextQuestion(toMemories(memories), askedIds, {
        resolvedConflictIds,
      });
      res.json(turn);
    }),
  );

  app.post(
    "/conflicts",
    wrap(async (req, res) => {
      const parsed = schemas.conflicts.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({
            error: "invalid_body",
            details: parsed.error.flatten(),
            requestId: req.requestId,
          });
        return;
      }
      res.json({
        conflicts: detectConflicts(toMemories(parsed.data.memories)),
      });
    }),
  );

  app.post(
    "/memory/update",
    wrap(async (req, res) => {
      const parsed = schemas.memoryUpdate.safeParse(req.body);
      if (!parsed.success) {
        res
          .status(400)
          .json({
            error: "invalid_body",
            details: parsed.error.flatten(),
            requestId: req.requestId,
          });
        return;
      }
      const { memories, text, facts } = parsed.data;
      const incoming = facts
        ? toMemories(facts)
        : extractFacts(text ?? "", { source: "text" });
      res.json(explainMemoryUpdate(toMemories(memories), incoming));
    }),
  );

  // body-parser бросает при битом JSON; без своего обработчика express печатает
  // стектрейс в лог и отвечает HTML вместо JSON.
  app.use((error: unknown, req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (error && typeof error === "object" && "type" in error && (error as { type: string }).type === "entity.parse.failed") {
      res.status(400).json({ error: "invalid_json", requestId: req.requestId });
      return;
    }
    if (error && typeof error === "object" && "type" in error && (error as { type: string }).type === "entity.too.large") {
      res.status(413).json({ error: "payload_too_large", requestId: req.requestId });
      return;
    }
    if (error) {
      logError("unhandled_error", { requestId: req.requestId, path: req.path, message: String(error) });
      if (!res.headersSent) res.status(500).json({ error: "internal_error", requestId: req.requestId });
      return;
    }
    next();
  });

  app.get("/metrics", (_req, res) => {
    res.json(snapshot());
  });

  app.use((req, res) => {
    res.status(404).json({ error: "not_found", requestId: req.requestId });
  });

  return app;
}
