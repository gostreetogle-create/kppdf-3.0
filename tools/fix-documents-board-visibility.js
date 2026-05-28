#!/usr/bin/env node
/**
 * Убирает вложенные задачи реестра с доски (columnId без сброса через PUT).
 * Смотрит config/yougile-task-registry.yaml — не по названиям.
 *
 * node tools/fix-documents-board-visibility.js
 */
const https = require("https");
const { loadRegistry } = require("./yougile-registry.js");

const TOKEN = "Za17DZkKgxjHfFSaKb+6I28QqdmUPNPeTSP77FsewPG-cnZBY2BoaEMZJ4mmJjdu";

function request(method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://yougile.com/api-v2${path}`);
    const req = https.request(
      url,
      { method, headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" } },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(data || "{}"));
          } catch {
            resolve(data);
          }
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function recreateWithoutColumn(task, rid) {
  const full = await request("GET", `/tasks/${task.uuid}`);
  const created = await request("POST", "/tasks", {
    title: full.title,
    description: full.description || "",
  });
  if (!created.id) throw new Error(`POST failed for ${rid}`);
  await request("PUT", `/tasks/${task.uuid}`, { archived: true });
  console.log(`  ${rid} → ${created.idTaskCommon || created.id} (без columnId)`);
  return { ...task, uuid: created.id };
}

async function main() {
  const { raw, tasks } = loadRegistry();
  const planCol = raw.plan_column_id;
  const nested = Object.entries(tasks).filter(([, t]) => t.kind && t.kind !== "category");

  const toFix = [];
  for (const [rid, t] of nested) {
    const live = await request("GET", `/tasks/${t.uuid}`);
    if (!live.archived && live.columnId === planCol) toFix.push({ rid, task: t, live });
  }

  if (toFix.length === 0) {
    console.log("На доске нет лишних вложенных задач реестра — OK.");
    return;
  }

  console.log(`Пересоздаём ${toFix.length} задач без columnId…`);
  for (const { rid, task } of toFix) {
    const updated = await recreateWithoutColumn(task, rid);
    tasks[rid] = updated;
  }

  // Persist uuid changes to registry file
  const { updateTaskUuid } = require("./yougile-registry.js");
  for (const { rid, task } of toFix) {
    updateTaskUuid(rid, tasks[rid].uuid);
  }

  const { cmdRepairLinks } = require("./yougile-registry.js");
  await cmdRepairLinks();
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
