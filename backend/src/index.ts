import cors from "cors";
import express from "express";
import { z } from "zod";
import { llmDiagnosisSummary, llmEnabled, llmExtractFacts, llmProviderName } from "./llm";
import {
  PROGRAMS,
  applyWhatIf,
  buildRoadmap,
  diagnose,
  extractFacts,
  mergeFacts,
  recommend,
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
});

const memoriesSchema = z.array(memorySchema).max(100);

const toMemories = (input: z.infer<typeof memoriesSchema>): MemoryFact[] =>
  input.map((item) => ({ ...item, numeric: item.numeric ?? undefined }));

const schemas = {
  extract: z
    .object({
      text: z.string().min(1).max(2000),
      source: z.enum(["voice", "text", "manual"]).optional(),
    })
    .strict(),
  recommend: z.object({ memories: memoriesSchema, limit: z.number().int().min(1).max(50).optional() }).strict(),
  whatif: z
    .object({
      memories: memoriesSchema,
      params: z
        .object({
          budget: z.number().min(0).max(500000).nullable().optional(),
          ielts: z.number().min(4).max(9).nullable().optional(),
          countries: z.array(z.string().min(1).max(60)).max(25).nullable().optional(),
          countryWeight: z.number().min(0).max(5).default(1),
          budgetWeight: z.number().min(0).max(5).default(1),
          scholarshipWeight: z.number().min(0).max(5).default(1),
        })
        .strict(),
    })
    .strict(),
  roadmap: z.object({ memories: memoriesSchema, programId: z.string().min(1).max(80).optional() }).strict(),
  diagnose: z.object({ memories: memoriesSchema }).strict(),
};

const app = express();
app.use(express.json({ limit: "200kb" }));

const allowedOrigin = process.env.ALLOWED_ORIGIN ?? "*";
app.use(
  cors({
    origin: allowedOrigin === "*" ? true : allowedOrigin.split(",").map((origin) => origin.trim()),
  }),
);

type AsyncHandler = (req: express.Request, res: express.Response) => Promise<void>;

const wrap =
  (handler: AsyncHandler) =>
  (req: express.Request, res: express.Response): void => {
    handler(req, res).catch((error) => {
      console.error("[axiom] handler error:", error);
      if (!res.headersSent) res.status(500).json({ error: "internal_error" });
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
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const { text, source } = parsed.data;
    const ruleFacts = extractFacts(text, { source: source ?? "text" });
    const llmFacts = await llmExtractFacts(text);
    if (llmFacts && llmFacts.length) {
      const merged = mergeFacts(ruleFacts, llmFacts);
      res.json({ facts: merged, engine: "llm" });
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
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const result = recommend(toMemories(parsed.data.memories), { limit: parsed.data.limit });
    res.json(result);
  }),
);

app.post(
  "/whatif",
  wrap(async (req, res) => {
    const parsed = schemas.whatif.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const result = applyWhatIf(toMemories(parsed.data.memories), parsed.data.params);
    res.json(result);
  }),
);

app.post(
  "/roadmap",
  wrap(async (req, res) => {
    const parsed = schemas.roadmap.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const program = parsed.data.programId
      ? PROGRAMS.find((item) => item.id === parsed.data.programId) ?? null
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
      res.status(400).json({ error: "invalid_body", details: parsed.error.flatten() });
      return;
    }
    const memories = toMemories(parsed.data.memories);
    const base = diagnose(memories);
    const compact = memories.map((item) => ({ field: item.field, value: item.display }));
    const llmSummary = await llmDiagnosisSummary(JSON.stringify(compact));
    res.json({ ...base, summary: llmSummary ?? base.summary, engine: llmSummary ? "llm" : "rules" });
  }),
);

app.use((_req, res) => {
  res.status(404).json({ error: "not_found" });
});

const port = Number(process.env.PORT ?? 8787);
app.listen(port, () => {
  console.log(`[axiom] backend listening on http://localhost:${port}`);
  console.log(`[axiom] llm: ${llmEnabled() ? llmProviderName() : "disabled (rules engine)"}`);
});
