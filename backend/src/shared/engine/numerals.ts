/**
 * Числительные словами → цифры.
 *
 * Web Speech API часто возвращает «пятнадцать тысяч» вместо «15000» и «шесть с
 * половиной» вместо «6.5». Без этого разбора голосовой ввод — заявленная
 * главная фишка — терял бюджет, IELTS, средний балл и класс: человек
 * проговаривал профиль, а память оставалась почти пустой.
 *
 * Работает как предобработка: текст нормализуется один раз, а все правила
 * извлечения дальше видят привычные цифры и не меняются.
 */

/** Слово → значение. Формы даём явно: падежей в русском больше, чем стоит угадывать. */
const UNITS: Record<string, number> = {
  ноль: 0, нуля: 0, нулю: 0,
  один: 1, одна: 1, одно: 1, одного: 1, одну: 1, одной: 1,
  два: 2, две: 2, двух: 2, двум: 2,
  три: 3, трёх: 3, трех: 3, трём: 3, трем: 3,
  четыре: 4, четырёх: 4, четырех: 4, четырём: 4,
  пять: 5, пяти: 5,
  шесть: 6, шести: 6,
  семь: 7, семи: 7,
  восемь: 8, восьми: 8,
  девять: 9, девяти: 9,
  десять: 10, десяти: 10,
  одиннадцать: 11, одиннадцати: 11,
  двенадцать: 12, двенадцати: 12,
  тринадцать: 13, тринадцати: 13,
  четырнадцать: 14, четырнадцати: 14,
  пятнадцать: 15, пятнадцати: 15,
  шестнадцать: 16, шестнадцати: 16,
  семнадцать: 17, семнадцати: 17,
  восемнадцать: 18, восемнадцати: 18,
  девятнадцать: 19, девятнадцати: 19,
  двадцать: 20, двадцати: 20,
  тридцать: 30, тридцати: 30,
  сорок: 40, сорока: 40,
  пятьдесят: 50, пятидесяти: 50,
  шестьдесят: 60, шестидесяти: 60,
  семьдесят: 70, семидесяти: 70,
  восемьдесят: 80, восьмидесяти: 80,
  девяносто: 90, девяноста: 90,
  сто: 100, ста: 100,
  двести: 200, двухсот: 200,
  триста: 300, трёхсот: 300, трехсот: 300,
  четыреста: 400, четырёхсот: 400, четырехсот: 400,
  пятьсот: 500, пятисот: 500,
  шестьсот: 600, шестисот: 600,
  семьсот: 700, семисот: 700,
  восемьсот: 800, восьмисот: 800,
  девятьсот: 900, девятисот: 900,
};

const SCALES: Record<string, number> = {
  тысяча: 1000, тысячи: 1000, тысяч: 1000, тысячу: 1000, тысячам: 1000, тыс: 1000,
  миллион: 1_000_000, миллиона: 1_000_000, миллионов: 1_000_000,
};

/** Порядковые — нужны только для класса: «в одиннадцатом классе». */
const ORDINALS: Record<string, number> = {
  девятый: 9, девятом: 9, девятого: 9, девятый_класс: 9,
  десятый: 10, десятом: 10, десятого: 10,
  одиннадцатый: 11, одиннадцатом: 11, одиннадцатого: 11,
  двенадцатый: 12, двенадцатом: 12, двенадцатого: 12,
};

const HALF = /^(?:половиной|половины)$/;

interface Token {
  text: string;
  start: number;
  end: number;
}

function tokenize(text: string): Token[] {
  const tokens: Token[] = [];
  const pattern = /[a-zа-яёA-ZА-ЯЁ]+|\d+(?:[.,]\d+)?/g;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    tokens.push({ text: match[0].toLowerCase(), start: match.index, end: match.index + match[0].length });
  }
  return tokens;
}

/**
 * Заменяет числительные словами на цифры, сохраняя остальной текст как есть.
 * Токенизация вместо поиска по подстроке принципиальна: «сто» встречается
 * внутри «состояние», и замена по подстроке ломала бы обычные слова.
 */
export function normalizeNumerals(text: string): string {
  const tokens = tokenize(text);
  if (!tokens.length) return text;

  const replacements: { start: number; end: number; value: string }[] = [];
  let index = 0;

  // Числительные образуют одно число, только если между ними ничего, кроме
  // пробелов: в «10-15 тысяч» дефис разделяет границы диапазона, и склеивать
  // их нельзя — иначе получается 151000.
  const onlySpaceBetween = (left: Token, right: Token): boolean =>
    /^\s*$/.test(text.slice(left.end, right.start));

  while (index < tokens.length) {
    const token = tokens[index];

    // «в одиннадцатом классе» — порядковое числительное перед словом «класс».
    const ordinal = ORDINALS[token.text];
    if (ordinal !== undefined) {
      const next = tokens[index + 1]?.text ?? "";
      if (next.startsWith("класс")) {
        replacements.push({ start: token.start, end: token.end, value: String(ordinal) });
        index += 1;
        continue;
      }
    }

    // «15 тысяч» — цифра и словесный множитель рядом.
    if (/^\d/.test(token.text)) {
      const next = tokens[index + 1];
      if (next && SCALES[next.text] !== undefined && onlySpaceBetween(token, next)) {
        const base = Number.parseFloat(token.text.replace(",", "."));
        if (Number.isFinite(base)) {
          replacements.push({ start: token.start, end: next.end, value: String(base * SCALES[next.text]) });
          index += 2;
          continue;
        }
      }
      index += 1;
      continue;
    }

    if (UNITS[token.text] === undefined && SCALES[token.text] === undefined) {
      index += 1;
      continue;
    }

    // Набираем подряд идущие числительные: «пятнадцать тысяч», «двадцать пять».
    let total = 0;
    let group = 0;
    let consumed = 0;
    let cursor = index;
    let sawUnit = false;

    while (cursor < tokens.length) {
      if (cursor > index && !onlySpaceBetween(tokens[cursor - 1], tokens[cursor])) break;
      const word = tokens[cursor].text;
      const unit = UNITS[word];
      const scale = SCALES[word];
      if (unit !== undefined) {
        group += unit;
        sawUnit = true;
      } else if (scale !== undefined) {
        group = (group === 0 ? 1 : group) * scale;
        total += group;
        group = 0;
      } else {
        break;
      }
      consumed = cursor - index + 1;
      cursor += 1;
    }

    // Одинокое «тысяч» без числительного перед ним — обычное слово, не число.
    if (!consumed || !sawUnit) {
      index += 1;
      continue;
    }

    total += group;

    // «шесть с половиной» → 6.5
    let endToken = tokens[index + consumed - 1];
    const maybeS = tokens[index + consumed];
    const maybeHalf = tokens[index + consumed + 1];
    if (
      maybeS?.text === "с" &&
      maybeHalf &&
      HALF.test(maybeHalf.text) &&
      onlySpaceBetween(endToken, maybeS) &&
      onlySpaceBetween(maybeS, maybeHalf)
    ) {
      total += 0.5;
      endToken = maybeHalf;
      consumed += 2;
    }

    const value = Number.isInteger(total) ? String(total) : total.toFixed(1);
    replacements.push({ start: tokens[index].start, end: endToken.end, value });
    index += consumed;
  }

  if (!replacements.length) return text;

  let result = "";
  let cursor = 0;
  for (const replacement of replacements) {
    result += text.slice(cursor, replacement.start) + replacement.value;
    cursor = replacement.end;
  }
  return result + text.slice(cursor);
}
