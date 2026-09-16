import type { InterviewQuestion, MemoryFact } from "../types";
import { describeFacts } from "./extract";

export const INTERVIEW_QUESTIONS: InterviewQuestion[] = [
  {
    id: "intro",
    text: "Привет! Я AXIOM — AI-наставник по поступлению. За несколько минут соберу твой профиль и построю личный маршрут. Для начала: как тебя зовут и в каком ты классе?",
    placeholder: "Например: Меня зовут Алия, 11 класс",
    quickReplies: [],
    core: false,
  },
  {
    id: "country",
    text: "Куда хочешь поступить — есть страна или регион, который рассматриваешь?",
    placeholder: "Например: Европа, Германия или пока не решил",
    quickReplies: ["Европа", "Германия", "Польша", "Чехия", "Ещё не решил"],
    core: true,
  },
  {
    id: "budget",
    text: "Какой бюджет на год рассматриваешь — включая обучение и проживание?",
    placeholder: "Например: до $15k в год",
    quickReplies: ["До $8k", "До $12k", "До $15k", "До $25k", "Нужна стипендия"],
    core: true,
  },
  {
    id: "ielts",
    text: "Что с IELTS — уже сдавал или ещё в планах?",
    placeholder: "Например: IELTS 6.0 или ещё не сдавал",
    quickReplies: ["IELTS 6.0", "IELTS 6.5", "Ещё не сдавал", "Планирую сдать"],
    core: true,
  },
  {
    id: "gpa",
    text: "Какая у тебя успеваемость? Напиши средний балл или GPA.",
    placeholder: "Например: 4.5 из 5",
    quickReplies: ["4.5 из 5", "4.0 из 5", "GPA 3.8"],
    core: false,
  },
  {
    id: "interests",
    text: "Что интересно по направлению — IT, дизайн, бизнес, инженерия, психология?",
    placeholder: "Например: IT и программирование, дизайн",
    quickReplies: ["IT и программирование", "Дизайн", "Бизнес и предпринимательство", "Психология", "Инженерия"],
    core: true,
  },
  {
    id: "priority",
    text: "Когда планируешь старт и что важнее всего: страна, бюджет или стипендия?",
    placeholder: "Например: осень 2027, стипендия важнее страны",
    quickReplies: ["Осень 2027, важнее стипендия", "Важнее страна", "Важнее бюджет", "Пока не думал"],
    core: false,
  },
  {
    id: "constraints",
    text: "Последний вопрос: есть ограничения, которые важно учесть? Например, не готов учить новый язык или не хочешь уезжать далеко.",
    placeholder: "Например: не хочу учить новый язык",
    quickReplies: ["Не хочу учить новый язык", "Ограничений нет", "Нужна только Европа"],
    core: false,
  },
];

export function nextQuestion(answeredIds: string[]): InterviewQuestion | null {
  return INTERVIEW_QUESTIONS.find((question) => !answeredIds.includes(question.id)) ?? null;
}

export function composeAcknowledgment(facts: MemoryFact[]): string {
  if (!facts.length) return "";
  const visible = facts.slice(0, 3);
  const tail = facts.length > 3 ? ` и ещё ${facts.length - 3}` : "";
  const templates = ["Записал: {list}{tail}.", "Сохранил в память: {list}{tail}.", "Понял — {list}{tail}."];
  const template = templates[facts.length % templates.length];
  return template.replace("{list}", describeFacts(visible)).replace("{tail}", tail);
}

export function composeAgentReply(facts: MemoryFact[], next: InterviewQuestion | null): string {
  const acknowledgment = composeAcknowledgment(facts);
  if (!next) {
    const outro = "Профиль собран — я сформировал память о тебе. Проверь факты и переходи к диагностике.";
    return acknowledgment ? `${acknowledgment}\n\n${outro}` : outro;
  }
  return acknowledgment ? `${acknowledgment}\n\n${next.text}` : next.text;
}
