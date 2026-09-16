# API-контракт AXIOM

Единый источник правды: типы — `shared/types.ts`, движок — `shared/engine/`, данные — `shared/data/programs.json`.
Копии в `frontend/lib/shared/` и `backend/src/shared/` создаются скриптом `npm run sync` из корня репозитория.

## POST /extract
Извлекает факты памяти из реплики пользователя.

Запрос: `{ "text": string, "source"?: "voice" | "text" | "manual" }`
Ответ: `{ "facts": MemoryFact[], "engine": "rules" | "llm" }`

## POST /recommend
Ранжирует программы под профиль.

Запрос: `{ "memories": MemoryFact[], "limit"?: number }`
Ответ: `{ "recommendations": Recommendation[], "engine": "rules" | "llm" }`

## POST /whatif
Пересчитывает рейтинг при изменении вводных.

Запрос: `{ "memories": MemoryFact[], "params": WhatIfParams }`
Ответ: `{ "recommendations": Recommendation[], "diff": { moved, entered, dropped }, "summary": string, "engine": "rules" | "llm" }`

## POST /roadmap
Строит персональный план.

Запрос: `{ "memories": MemoryFact[], "programId"?: string }`
Ответ: `{ "targetProgram": Program | null, "steps": RoadmapStep[] }`

## POST /diagnose
Резюме профиля: сильные стороны, ограничения, цель, полнота.

Запрос: `{ "memories": MemoryFact[] }`
Ответ: `Diagnosis` (`summary` может быть обогащён LLM, при отсутствии ключа — шаблон).

## GET /programs
Ответ: `{ "programs": Program[] }`

## GET /health
Ответ: `{ "ok": true, "llm": boolean, "engine": "rules" | "llm" }`

## Правила
- Ошибки: `{ "error": string }`, статусы 400 (валидация), 500, 503 (LLM недоступен — движок отдаёт правила).
- CORS: домен фронтенда из `ALLOWED_ORIGIN` (через запятую), по умолчанию `*`.
- LLM — только опциональное обогащение (объяснения, резюме). Ранжирование и маршрут детерминированы правилами.
