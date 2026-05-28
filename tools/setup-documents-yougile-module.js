#!/usr/bin/env node
/**
 * Модуль 08 Документы — связи по реестру PLM-xxx (названия не меняем).
 *
 * node tools/setup-documents-yougile-module.js
 */
const { spawnSync } = require("child_process");
const path = require("path");

const node = process.execPath;
const registry = path.join(__dirname, "yougile-registry.js");

function run(args) {
  const r = spawnSync(node, [registry, ...args], { stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status ?? 1);
}

console.log("Реестр: config/yougile-task-registry.yaml\n");
run(["repair-links"]);
console.log("\nГотово. Названия карточек не изменялись.");
