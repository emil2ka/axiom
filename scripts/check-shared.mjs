#!/usr/bin/env node
/**
 * Сверяет копии shared/ в обоих проектах с источником правды.
 *
 * Копии закоммичены в репозиторий, чтобы клон собирался без лишних шагов, но
 * из-за этого они могут молча разойтись: правишь shared/engine, забываешь
 * npm run sync — и фронт продолжает считать по старым правилам. Расхождение
 * между тем, что показывает демо, и тем, что покрыто тестами, — худший вид
 * ошибки, потому что тесты при этом зелёные.
 */
import { readdir, readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "shared");

const targets = [join(root, "frontend", "lib", "shared"), join(root, "backend", "src", "shared")];
const items = ["types.ts", "engine", "data"];

async function collect(base, current = base, acc = new Map()) {
  const entries = await readdir(current, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(current, entry.name);
    if (entry.isDirectory()) await collect(base, full, acc);
    else acc.set(relative(base, full), await readFile(full, "utf8"));
  }
  return acc;
}

/** shared/ содержит и папки (engine, data), и одиночный файл types.ts. */
async function safeCollect(base) {
  try {
    const info = await stat(base);
    if (info.isFile()) return new Map([["", await readFile(base, "utf8")]]);
    return await collect(base);
  } catch {
    return null;
  }
}

const problems = [];

for (const item of items) {
  const expected = await safeCollect(join(source, item));
  if (expected === null) {
    problems.push(`нет источника: shared/${item}`);
    continue;
  }
  for (const target of targets) {
    const actual = await safeCollect(join(target, item));
    const where = relative(root, join(target, item));
    if (actual === null) {
      problems.push(`${where}: копии нет — выполни npm run sync`);
      continue;
    }
    for (const [file, content] of expected) {
      const label = file ? `${where}/${file}` : where;
      if (!actual.has(file)) problems.push(`${label}: файла нет в копии`);
      else if (actual.get(file) !== content) problems.push(`${label}: копия отличается от shared/`);
    }
    for (const file of actual.keys()) {
      if (!expected.has(file)) problems.push(`${where}/${file}: лишний файл, которого нет в shared/`);
    }
  }
}

if (problems.length) {
  console.error("Копии shared/ разошлись с источником правды:\n");
  for (const problem of problems) console.error(`  · ${problem}`);
  console.error("\nВыполни `npm run sync` из корня и закоммить результат.\n");
  process.exit(1);
}

console.log("shared/ и обе копии совпадают");
