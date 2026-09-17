export type MemoryField =
  | "name"
  | "grade"
  | "country"
  | "budget"
  | "ielts"
  | "gpa"
  | "interests"
  | "intake"
  | "priority"
  | "language"
  | "constraints";

export type MemorySource = "voice" | "text" | "manual" | "demo";

/** Что для абитуриента важнее всего — извлекается из памяти и меняет веса скоринга. */
export type PriorityKey = "country" | "budget" | "scholarship" | "ranking";

/** Снимок прежнего значения факта — память помнит, каким он был. */
export interface MemoryRevision {
  value: string;
  display: string;
  numeric?: number;
  source: MemorySource;
  at: number;
}

export interface MemoryFact {
  id: string;
  field: MemoryField;
  label: string;
  value: string;
  display: string;
  quote: string;
  confidence: number;
  numeric?: number;
  source: MemorySource;
  createdAt: number;
  /** Предыдущие значения, свежие первыми. Пусто, пока факт не меняли. */
  history?: MemoryRevision[];
  /**
   * Что человек имел в виду: дополнить прежнее значение или заменить его.
   * «Ещё рассматриваю Финляндию» — add, «хочу только Германию» — replace.
   * Без флага считается add, поэтому старые вызовы ведут себя как раньше.
   */
  intent?: "add" | "replace";
}

export type MemoryChangeKind = "added" | "updated" | "extended" | "unchanged";

/** Что именно произошло с одним фактом при обновлении памяти. */
export interface MemoryChange {
  field: MemoryField;
  label: string;
  kind: MemoryChangeKind;
  /** Как факт выглядел раньше. Для added — отсутствует. */
  before?: string;
  after: string;
  quote: string;
  at: number;
}

export interface MergeResult {
  memories: MemoryFact[];
  changes: MemoryChange[];
}

/** Как обновление памяти отразилось на рекомендациях. */
export interface MemoryImpact {
  changes: MemoryChange[];
  diff: {
    moved: RankDiff[];
    entered: RankDiff[];
    dropped: RankDiff[];
  };
  /** Сколько программ не укладывалось в бюджет до и после. */
  overBudget: { before: number; after: number };
  /** Человекочитаемое «что изменилось и к чему это привело». */
  summary: string;
}

export interface Profile {
  name?: string;
  grade?: string;
  memories: MemoryFact[];
}

export interface ProgramDeadline {
  intake: string;
  date: string;
  label: string;
}

export type ScholarshipLevel = "none" | "partial" | "full";

export interface Program {
  id: string;
  university: string;
  programName: string;
  country: string;
  countryCode: string;
  city: string;
  field: string;
  tags: string[];
  degree: string;
  durationYears: number;
  language: string;
  ieltsMin: number | null;
  /** Минимальный средний балл аттестата в процентах от максимума шкалы (80 = 4.0 из 5). */
  gpaMinPercent: number | null;
  tuitionPerYearUsd: number;
  livingPerYearUsd: number;
  scholarship: ScholarshipLevel;
  scholarshipNote: string;
  deadlines: ProgramDeadline[];
  summary: string;
  highlights: string[];
  sources: { label: string; url: string }[];
  demo: boolean;
}

export interface ScoreWeights {
  budget: number;
  country: number;
  ielts: number;
  field: number;
  scholarship: number;
  timing: number;
  gpa: number;
  language: number;
}

/**
 * Ограничения, разобранные из свободной речи в признаки, на которые движок
 * действительно умеет реагировать. raw хранит исходные формулировки, чтобы
 * ничего не потерялось и можно было показать пользователю его же слова.
 */
export interface ProfileConstraints {
  /** «не хочу учить новый язык», «только на английском» */
  englishOnly: boolean;
  /** «без стипендии не потяну» */
  needsScholarship: boolean;
  raw: string[];
}

export interface Reason {
  text: string;
  weight: number;
  field: MemoryField | "program";
}

export interface Gap {
  text: string;
  severity: "high" | "medium" | "low";
}

export interface Recommendation {
  program: Program;
  rank: number;
  score: number;
  fitLabel: "Отличное соответствие" | "Хорошее соответствие" | "Умеренное соответствие" | "Слабое соответствие";
  breakdown: Record<keyof ScoreWeights, number>;
  reasons: Reason[];
  gaps: Gap[];
  totalPerYearUsd: number;
  /** Стоимость всей программы: за год × длительность. Решающая цифра для семьи. */
  totalProgramUsd: number;
  budgetDeltaUsd: number | null;
}

export interface RecommendResult {
  recommendations: Recommendation[];
  engine: "rules" | "llm";
  /** Веса, по которым фактически считался этот рейтинг (после учёта приоритета из памяти). */
  weights?: ScoreWeights;
  /** Приоритет, взятый из памяти и применённый к весам. null — приоритет не задан. */
  appliedPriority?: PriorityKey | null;
  /** Человекочитаемое объяснение, как приоритет из памяти изменил ранжирование. */
  priorityNote?: string;
}

export interface WhatIfParams {
  budget?: number | null;
  ielts?: number | null;
  countries?: string[] | null;
  countryWeight: number;
  budgetWeight: number;
  scholarshipWeight: number;
}

export interface RankDiff {
  programId: string;
  name: string;
  baseRank: number;
  newRank: number;
  delta: number;
}

export interface WhatIfResult extends RecommendResult {
  diff: {
    moved: RankDiff[];
    entered: RankDiff[];
    dropped: RankDiff[];
  };
  summary: string;
}

export type RoadmapCategory = "exam" | "documents" | "deadline" | "activity";

export interface RoadmapStep {
  id: string;
  category: RoadmapCategory;
  title: string;
  description: string;
  dueMonth: string;
  why: string;
  sourceNote: string;
}

export interface Roadmap {
  targetProgram: Program | null;
  steps: RoadmapStep[];
}

export interface Diagnosis {
  summary: string;
  strengths: string[];
  constraints: string[];
  goal: string;
  completeness: number;
  knownFacts: number;
  totalCoreFacts: number;
}

export interface ChatMessage {
  id: string;
  role: "axiom" | "user";
  text: string;
  highlights?: { quote: string; field: MemoryField }[];
  ts: number;
}

export interface InterviewQuestion {
  id: string;
  text: string;
  placeholder: string;
  quickReplies: string[];
  core: boolean;
  /** Какие поля памяти закрывает ответ на этот вопрос. */
  fields?: MemoryField[];
  /** Вопрос-знакомство: задаётся первым независимо от расчёта пользы. */
  opener?: boolean;
}

/** Противоречие между фактами памяти, найденное на реальных данных программ. */
export interface MemoryConflict {
  id: string;
  fields: MemoryField[];
  /** Что именно AXIOM заметил — показывается пользователю. */
  text: string;
  /** Уточняющий вопрос, который снимает противоречие. */
  question: string;
  quickReplies: string[];
  severity: "high" | "medium";
}

export interface InterviewProgress {
  answered: number;
  total: number;
  completeness: number;
}

/** Решение адаптивного интервью: что спросить дальше и почему именно это. */
export interface InterviewTurn {
  question: InterviewQuestion | null;
  kind: "opener" | "conflict" | "gap" | "done";
  /** Объяснение выбора для интерфейса и для жюри. */
  reason: string;
  /** Насколько ответ способен изменить топ-5 рекомендаций: 0..1. */
  expectedImpact: number;
  conflicts: MemoryConflict[];
  progress: InterviewProgress;
}
