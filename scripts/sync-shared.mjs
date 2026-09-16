#!/usr/bin/env node
import { cp, mkdir, rm } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "shared");

const targets = [
  join(root, "frontend", "lib", "shared"),
  join(root, "backend", "src", "shared"),
];

const items = ["types.ts", "engine", "data"];

for (const target of targets) {
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  for (const item of items) {
    await cp(join(source, item), join(target, item), { recursive: true });
  }
  console.log(`synced shared -> ${target}`);
}

console.log("done. source of truth: /shared");
