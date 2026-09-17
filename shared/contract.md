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
Ответ: `{ "recommendations": Recommendation[], "engine": "rules" | "llm", "weights": ScoreWeights, "appliedPriority": PriorityKey | null, "priorityNote": string }`

Факт памяти `priority` («стипендия важнее страны») меняет веса скоринга через
`PRIORITY_WEIGHT_MULTIPLIERS`, а не только оформление. `weights` — веса, по которым
фактически посчитан этот ответ; `appliedPriority` — какой приоритет применён;
`priorityNote` — объяснение на русском для интерфейса. Причины с `field: "priority"`
показывают, как именно приоритет повлиял на конкретную программу.

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

## POST /interview/next
Выбирает следующий вопрос интервью по состоянию памяти, а не по фиксированному списку.

Запрос: `{ "memories": MemoryFact[], "askedIds"?: string[], "resolvedConflictIds"?: string[] }`
Ответ: `InterviewTurn` — `{ question, kind, reason, expectedImpact, conflicts, progress }`

Порядок выбора: знакомство → противоречия в памяти → самый полезный пробел.
`expectedImpact` (0..1) — насколько ответ способен переставить топ-5: движок
подставляет правдоподобные ответы и измеряет расхождение выдачи. `reason`
объясняет выбор человеческим языком, поэтому поведение интервью проверяемо.

## POST /conflicts
Находит противоречия между фактами памяти на реальном датасете программ.

Запрос: `{ "memories": MemoryFact[] }`
Ответ: `{ "conflicts": MemoryConflict[] }`

Проверяется: бюджет против выбранной географии, IELTS против порогов подходящих
программ, отказ учить язык против неанглоязычных стран, интересы против
географии, старт обучения в прошлом. Каждое противоречие несёт цифру из данных
(«дешевле $22 800 в Нидерландах ничего нет»), а не общую формулировку.

## GET /programs
Ответ: `{ "programs": Program[] }`

## GET /health
Ответ: `{ "ok": true, "llm": boolean, "engine": "rules" | "llm" }`

## Правила
- Ошибки: `{ "error": string }`, статусы 400 (валидация), 500, 503 (LLM недоступен — движок отдаёт правила).
- CORS: домен фронтенда из `ALLOWED_ORIGIN` (через запятую), по умолчанию `*`.
- LLM — только опциональное обогащение (объяснения, резюме). Ранжирование и маршрут детерминированы правилами.
- Средний балл сравнивается в процентах от максимума шкалы (`gpaMinPercent` у программы против нормализованного балла профиля): сырые числа из разных шкал несравнимы.
- Явные веса из What If всегда побеждают приоритет из памяти: слайдеры — осознанное действие пользователя «здесь и сейчас». Базовый рейтинг в `/whatif` при этом считается уже с учётом памяти, поэтому diff честно показывает изменение относительно того, что пользователь реально видит на экране рекомендаций.
