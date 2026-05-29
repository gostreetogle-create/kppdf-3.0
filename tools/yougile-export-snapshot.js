#!/usr/bin/env node
/**
 * Экспорт задач доски «KPPDF — сейчас» в .opencode/yougile-snapshot.yaml.
 *
 * node tools/yougile-export-snapshot.js [--dry-run]
 *
 * Токен: YOUGILE_TOKEN (env) или .env в корне проекта.
 *
 * Используется GitHub Action для автообновления каждые 2 часа.
 * Формат snapshot: YAML с id, title, column, labels, url, updated_at.
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");
const SNAPSHOT_PATH = path.join(ROOT, ".opencode", "yougile-snapshot.yaml");
const BOARD_TITLE = "KPPDF — сейчас";
const DRY_RUN = process.argv.includes("--dry-run");

// ── Токен ────────────────────────────────────────────────────────
function loadToken() {
  if (process.env.YOUGILE_TOKEN) return process.env.YOUGILE_TOKEN;
  const envPath = path.join(ROOT, ".env");
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, "utf8").split("\n");
    for (const line of lines) {
      const m = line.match(/^YOUGILE_TOKEN\s*=\s*(.+)$/);
      if (m) return m[1].trim();
    }
  }
  console.error("❌ YOUGILE_TOKEN не найден. Установите переменную окружения или добавьте в .env");
  process.exit(1);
}

const TOKEN = loadToken();
const TEAM_URL = "https://yougile.com/team/0bdbccb0610e";

// ── API ──────────────────────────────────────────────────────────
function request(method, urlPath) {
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
    req.end();
  });
}

async function apiGet(path) {
  const r = await request("GET", path);
  if (r.status >= 400) throw new Error(`API ${r.status}: ${JSON.stringify(r.data).slice(0, 200)}`);
  return r.data;
}

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log("=== YouGile Export Snapshot ===\n");

  // 1. Найти доску
  const boards = await apiGet("/boards");
  const board = boards.find((b) => b.title === BOARD_TITLE);
  if (!board) {
    console.error(`Доска «${BOARD_TITLE}» не найдена. Сначала запустите yougile-seed-kppdf-board.js`);
    process.exit(1);
  }
  console.log(`Доска: ${board.title} (${board.id})`);

  // 2. Получить колонки
  const columns = await apiGet(`/columns?boardId=${board.id}`);
  const colMap = {};
  for (const col of columns) {
    colMap[col.id] = col.title;
  }
  console.log(`Колонок: ${columns.length}`);

  // 3. Получить все задачи (пагинация)
  let allTasks = [];
  let offset = 0;
  const limit = 100;
  while (true) {
    const page = await apiGet(`/tasks?boardId=${board.id}&limit=${limit}&offset=${offset}`);
    const content = page.content || page;
    if (!content || content.length === 0) break;
    allTasks = allTasks.concat(content);
    offset += limit;
    if (content.length < limit) break;
  }
  console.log(`Задач: ${allTasks.length}`);

  // 4. Получить метки
  const stickers = await apiGet(`/stickers?boardId=${board.id}`);
  const stickerMap = {};
  for (const s of stickers) {
    stickerMap[s.id] = s.name;
  }

  // 5. Построить snapshot
  const tasks = allTasks.map((t) => ({
    id: extractId(t.title),
    title: t.title,
    column: colMap[t.columnId] || "?",
    labels: (t.stickers || []).map((sid) => stickerMap[sid] || sid),
    completed: !!t.completed,
    yougile_url: `${TEAM_URL}#${t.id}`,
  }));

  // 6. Записать YAML
  const yaml = generateYaml(board.title, tasks);

  if (DRY_RUN) {
    console.log("\n--- PREVIEW ---");
    console.log(yaml);
    console.log("--- END ---");
    return;
  }

  fs.writeFileSync(SNAPSHOT_PATH, yaml, "utf8");
  console.log(`\n✅ Снимок записан: ${SNAPSHOT_PATH}`);
  console.log(`   Задач: ${tasks.length}`);
}

// ── Helpers ──────────────────────────────────────────────────────
function extractId(title) {
  const m = title.match(/^(UI-P\d+-\d+|BL-P\d+-\d+|PLM-\d+)/);
  return m ? m[1] : title.slice(0, 30);
}

function generateYaml(boardTitle, tasks) {
  const now = new Date().toISOString();
  const lines = [
    `# Автоснимок YouGile — источник статуса задач для AI`,
    `# Обновляется: .github/workflows/yougile-snapshot.yml (каждые 2 ч)`,
    `# НЕ редактировать вручную — статус меняется в YouGile.`,
    ``,
    `updated_at: "${now}"`,
    `board: "${boardTitle}"`,
    `tasks:`,
  ];

  for (const t of tasks) {
    lines.push(`  - id: "${t.id}"`);
    lines.push(`    title: "${t.title.replace(/"/g, '\\"')}"`);
    lines.push(`    column: "${t.column}"`);
    lines.push(`    labels: [${t.labels.map((l) => `"${l}"`).join(", ")}]`);
    lines.push(`    completed: ${t.completed}`);
    lines.push(`    yougile_url: "${t.yougile_url}"`);
  }

  return lines.join("\n") + "\n";
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
