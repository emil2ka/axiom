const MONTHS_NOMINATIVE = [
  "Январь",
  "Февраль",
  "Март",
  "Апрель",
  "Май",
  "Июнь",
  "Июль",
  "Август",
  "Сентябрь",
  "Октябрь",
  "Ноябрь",
  "Декабрь",
];

const MONTHS_GENITIVE = [
  "января",
  "февраля",
  "марта",
  "апреля",
  "мая",
  "июня",
  "июля",
  "августа",
  "сентября",
  "октября",
  "ноября",
  "декабря",
];

export function formatUsd(value: number): string {
  const rounded = Math.round(value);
  const sign = rounded < 0 ? "−" : "";
  const digits = Math.abs(rounded)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  return `${sign}$${digits}`;
}

export function formatUsdCompact(value: number): string {
  if (Math.abs(value) >= 1000) {
    const k = value / 1000;
    const text = Number.isInteger(k) ? k.toString() : k.toFixed(1).replace(/\.0$/, "");
    return `$${text}k`;
  }
  return formatUsd(value);
}

export function formatDateRu(iso: string): string {
  const date = parseIso(iso);
  if (!date) return iso;
  return `${date.getUTCDate()} ${MONTHS_GENITIVE[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function monthLabelRu(date: Date): string {
  return `${MONTHS_NOMINATIVE[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

export function shiftMonths(iso: string, delta: number): string {
  const date = parseIso(iso);
  if (!date) return "";
  const target = addMonths(date, delta);
  return monthLabelRu(target);
}

export function shiftMonthsIso(iso: string, delta: number): string {
  const date = parseIso(iso);
  if (!date) return iso;
  const target = addMonths(date, delta);
  const month = `${target.getUTCMonth() + 1}`.padStart(2, "0");
  const day = `${target.getUTCDate()}`.padStart(2, "0");
  return `${target.getUTCFullYear()}-${month}-${day}`;
}

export function addMonths(date: Date, delta: number): Date {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + delta;
  const targetYear = year + Math.floor(month / 12);
  const targetMonth = ((month % 12) + 12) % 12;
  const daysInTarget = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
  const day = Math.min(date.getUTCDate(), daysInTarget);
  return new Date(Date.UTC(targetYear, targetMonth, day));
}

export function parseIso(iso: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return null;
  const [, y, m, d] = match;
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function pluralRu(count: number, one: string, few: string, many: string): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}
