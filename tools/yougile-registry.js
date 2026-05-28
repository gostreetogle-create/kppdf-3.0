#!/usr/bin/env node
/**
 * Реестр YouGile: config/yougile-task-registry.yaml
 * ID карточки = PLM-xxx из ссылки YouGile.
 *
 * node tools/yougile-registry.js show
 * node tools/yougile-registry.js show PLM-126
 * node tools/yougile-registry.js resolve PLM-126
 * node tools/yougile-registry.js repair-links
 * node tools/yougile-registry.js clean-titles
 */
const fs = require("fs");
const path = require("path");
const https = require("https");
const yaml = require("js-yaml");

const ROOT = path.resolve(__dirname, "..");
const REGISTRY_PATH = path.join(ROOT, "config", "yougile-task-registry.yaml");
const TOKEN = "Za17DZkKgxjHfFSaKb+6I28QqdmUPNPeTSP77FsewPG-cnZBY2BoaEMZJ4mmJjdu";
const TEAM_URL = "https://yougile.com/team/0bdbccb0610e";

function loadRegistry() {
  const raw = yaml.load(fs.readFileSync(REGISTRY_PATH, "utf8"));
  const tasks = {};
  for (const [plm, t] of Object.entries(raw.tasks || {})) {
    tasks[plm] = { plm, ...t };
  }
  const byUuid = Object.fromEntries(Object.entries(tasks).map(([plm, t]) => [t.uuid, { plm, ...t }]));
  return { raw, tasks, byUuid, hierarchy: raw.hierarchy || {} };
}

function normalizePlm(arg) {
  if (!arg) return null;
  const s = String(arg).trim();
  const m = s.match(/^PLM-(\d+)$/i);
  if (m) return `PLM-${m[1]}`;
  const hash = s.match(/#PLM-(\d+)/i);
  if (hash) return `PLM-${hash[1]}`;
  return null;
}

function resolvePlm(arg, tasks) {
  const plm = normalizePlm(arg);
  if (plm && tasks[plm]) return plm;
  return Object.entries(tasks).find(([, t]) => t.uuid === arg)?.[0] || null;
}

function request(method, urlPath, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`https://yougile.com/api-v2${urlPath}`);
    const req = https.request(
      url,
      {
        method,
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(data || "{}") });
          } catch {
            resolve({ status: res.statusCode, data });
          }
        });
      },
    );
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function getTask(uuid) {
  return (await request("GET", `/tasks/${uuid}`)).data;
}

/** Убрать старые префиксы [ID-0xx] и [PLM-xxx] из заголовка. */
function cleanTitle(title) {
  return (title || "")
    .replace(/^\[(ID-\d+|PLM-\d+)\]\s*/i, "")
    .trim();
}

function cleanDescription(description) {
  return (description || "")
    .replace(/\*\*Project ID:\*\* ID-\d+\s*\n?/g, "")
    .replace(/\*\*PLM:\*\* PLM-\d+\s*\n?/g, "")
    .trim();
}

async function cmdShow(filterPlm) {
  const { tasks } = loadRegistry();
  const ids = filterPlm ? [resolvePlm(filterPlm, tasks)] : Object.keys(tasks).sort((a, b) => {
    const na = Number(a.replace(/\D/g, ""));
    const nb = Number(b.replace(/\D/g, ""));
    return na - nb;
  });
  for (const plm of ids) {
    const t = tasks[plm];
    if (!t) {
      console.error("Не найден:", filterPlm);
      process.exit(1);
    }
    let title = "?";
    try {
      title = (await getTask(t.uuid)).title || title;
    } catch {
      /* offline */
    }
    console.log(`${plm}\t${t.kind || "-"}\t${title}`);
    console.log(`\tuuid: ${t.uuid}`);
  }
}

async function cmdResolve(arg) {
  const { tasks } = loadRegistry();
  const plm = resolvePlm(arg, tasks);
  if (!plm) {
    console.error("Не найден в реестре:", arg);
    process.exit(1);
  }
  const t = tasks[plm];
  const live = await getTask(t.uuid);
  console.log(`${plm}\t${live.title}`);
  console.log(`\tuuid: ${t.uuid}`);
  console.log(`\turl: ${TEAM_URL}/#${plm}`);
}

async function cmdRepairLinks() {
  const { tasks, hierarchy, raw } = loadRegistry();
  const crm = raw.crm_ui_list;

  for (const [parentPlm, childPlms] of Object.entries(hierarchy)) {
    const parent = tasks[parentPlm];
    if (!parent) throw new Error(`Нет в реестре: ${parentPlm}`);
    const subtasks = childPlms.map((c) => {
      if (!tasks[c]) throw new Error(`Нет в реестре: ${c}`);
      return tasks[c].uuid;
    });
    await request("PUT", `/tasks/${parent.uuid}`, { subtasks });
    console.log("OK subtasks", parentPlm, "→", childPlms.join(", "));
  }

  if (crm?.uuid && crm.exclude_child) {
    const ex = tasks[crm.exclude_child]?.uuid;
    const ui = await getTask(crm.uuid);
    if (ex && (ui.subtasks || []).includes(ex)) {
      await request("PUT", `/tasks/${crm.uuid}`, {
        subtasks: (ui.subtasks || []).filter((id) => id !== ex),
      });
      console.log("OK убран", crm.exclude_child, "из CRM UI");
    }
  }
  console.log("\nСвязи пересобраны по реестру (названия не трогали).");
}

async function cmdCleanTitles() {
  const { tasks } = loadRegistry();
  for (const [plm, t] of Object.entries(tasks)) {
    const live = await getTask(t.uuid);
    const title = cleanTitle(live.title);
    const description = cleanDescription(live.description);
    const patch = {};
    if (title && title !== live.title) patch.title = title;
    if (description !== (live.description || "").trim()) patch.description = description || undefined;
    if (!Object.keys(patch).length) continue;
    await request("PUT", `/tasks/${t.uuid}`, patch);
    console.log("cleaned", plm, "→", title);
  }
}

async function main() {
  const [cmd, arg] = process.argv.slice(2);
  if (!cmd || cmd === "show") return cmdShow(arg);
  if (cmd === "resolve") return cmdResolve(arg);
  if (cmd === "repair-links") return cmdRepairLinks();
  if (cmd === "clean-titles") return cmdCleanTitles();
  console.log("Usage: node tools/yougile-registry.js show [PLM-126]");
  console.log("       node tools/yougile-registry.js resolve PLM-126");
  console.log("       node tools/yougile-registry.js repair-links");
  console.log("       node tools/yougile-registry.js clean-titles");
  process.exit(1);
}

function updateTaskUuid(plm, newUuid) {
  let yamlText = fs.readFileSync(REGISTRY_PATH, "utf8");
  const block = new RegExp(`(${plm}:\\s*\\n(?:    \\w+:.+\\n)*?    uuid:\\s*")([a-f0-9-]+)(")`, "m");
  if (!block.test(yamlText)) throw new Error(`uuid not found for ${plm}`);
  yamlText = yamlText.replace(block, `$1${newUuid}$3`);
  fs.writeFileSync(REGISTRY_PATH, yamlText);
}

module.exports = { loadRegistry, REGISTRY_PATH, resolvePlm, normalizePlm, cmdRepairLinks, updateTaskUuid };

if (require.main === module) {
  main().catch((e) => {
    console.error(e.message || e);
    process.exit(1);
  });
}
