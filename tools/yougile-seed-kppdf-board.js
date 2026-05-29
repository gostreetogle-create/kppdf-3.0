#!/usr/bin/env node
/**
 * Seed доски «KPPDF — сейчас» в YouGile:
 * создаёт доску, колонки и 18 стартовых карточек из UI-CONSISTENCY-PLAN + CHECKLIST-BACKLOG.
 *
 * node tools/yougile-seed-kppdf-board.js [--dry-run]
 *
 * Токен: YOUGILE_TOKEN из .env или process.env (не хардкод).
 * Формат .env: YOUGILE_TOKEN=...
 */

const fs = require("fs");
const path = require("path");
const https = require("https");

const ROOT = path.resolve(__dirname, "..");

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
const DRY_RUN = process.argv.includes("--dry-run");

// ── API ──────────────────────────────────────────────────────────
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

async function apiGet(path) {
  return (await request("GET", path)).data;
}
async function apiPost(path, body) {
  return (await request("POST", path, body)).data;
}
async function apiPut(path, body) {
  return (await request("PUT", path, body)).data;
}

// ── Колонки ──────────────────────────────────────────────────────
const COLUMNS = [
  { title: "🚫 Блокеры", color: 9 },   // красный
  { title: "📋 Дальше", color: 11 },    // серый
  { title: "🔄 В работе", color: 5 },   // синий
  { title: "👀 На проверке", color: 4 },// жёлтый
  { title: "✅ Сделано", color: 3 },    // зелёный
];

// ── Seed-карточки ────────────────────────────────────────────────
// Формат: { id, title, description, column (0-based index в COLUMNS), stickers }
const SEED_CARDS = [
  // ── Сделано (колонка 4) — что уже реализовано в коде ──
  {
    id: "UI-P0-02",
    title: "UI-P0-02 · kp-search — единое поле поиска",
    description: `## ID\nUI-P0-02\n\n## Что сделать\nСоздать app-kp-search компонент — обёртка pInputText с иконкой, debounce 300ms, size small/large.\n\n## Где в коде\n- src/app/shared/ui/kp-search.component.ts\n- src/app/shared/ui/kp-search.component.scss\n\n## Спецификация\n.opencode/audit/UI-CONSISTENCY-PLAN.md#p0-02\n\n## Freeze\nui-kit = wip → можно менять shared/ui`,
    column: 4,
    stickers: ["UI"],
  },
  {
    id: "UI-P0-05",
    title: "UI-P0-05 · kp-tag — обёртка p-tag",
    description: `## ID\nUI-P0-05\n\n## Что сделать\nСоздать app-kp-tag компонент — обёртка PrimeNG p-tag, severity info/success/warn/danger/secondary/contrast.\n\n## Где в коде\n- src/app/shared/ui/kp-tag.component.ts\n\n## Спецификация\n.opencode/audit/UI-CONSISTENCY-PLAN.md#p0-05\n\n## Freeze\nui-kit = wip`,
    column: 4,
    stickers: ["UI"],
  },
  {
    id: "UI-P0-07",
    title: "UI-P0-07 · kp-tab-group — segmented control",
    description: `## ID\nUI-P0-07\n\n## Что сделать\nСоздать app-kp-tab-group компонент — segmented кнопки на kp-button, tabChange output, ARIA.\n\n## Где в коде\n- src/app/shared/ui/kp-tab-group.component.ts\n- src/app/shared/ui/kp-tab-group.component.scss\n\n## Спецификация\n.opencode/audit/UI-CONSISTENCY-PLAN.md#p0-07\n\n## Freeze\nui-kit = wip`,
    column: 4,
    stickers: ["UI"],
  },
  {
    id: "UI-P0-03",
    title: "UI-P0-03 · Search в kp-table",
    description: `## ID\nUI-P0-03\n\n## Что сделать\nЗаменить raw <input pInputText> в kp-table на app-kp-search. Удалить TagModule, InputTextModule импорты.\n\n## Где в коде\n- src/app/shared/ui/kp-table.component.ts\n- src/app/shared/ui/kp-table.component.scss\n\n## Спецификация\n.opencode/audit/UI-CONSISTENCY-PLAN.md#p0-03`,
    column: 4,
    stickers: ["UI"],
  },
  {
    id: "UI-P0-04",
    title: "UI-P0-04 · Search в product-picker",
    description: `## ID\nUI-P0-04\n\n## Что сделать\nЗаменить app-kp-input на app-kp-search в kp-product-picker (debounceMs=0 для immediate mode).\n\n## Где в коде\n- src/app/shared/ui/kp-product-picker/kp-product-picker.component.ts\n\n## Спецификация\n.opencode/audit/UI-CONSISTENCY-PLAN.md#p0-04`,
    column: 4,
    stickers: ["UI"],
  },
  {
    id: "UI-P0-06",
    title: "UI-P0-06 · Tags в kp-table через kp-tag",
    description: `## ID\nUI-P0-06\n\n## Что сделать\nПеревести tag-ячейки в kp-table на app-kp-tag. Убрать прямой импорт p-tag.\n\n## Где в коде\n- src/app/shared/ui/kp-table.component.ts\n\n## Спецификация\n.opencode/audit/UI-CONSISTENCY-PLAN.md#p0-06`,
    column: 4,
    stickers: ["UI"],
  },
  {
    id: "UI-P0-10",
    title: "UI-P0-10 · Обновить golden-samples",
    description: `## ID\nUI-P0-10\n\n## Что сделать\nПереписать .opencode/golden-samples.ts на app-kp-* паттерны (kp-button, kp-table, kp-search).\n\n## Где в коде\n- .opencode/golden-samples.ts\n\n## Спецификация\n.opencode/audit/UI-CONSISTENCY-PLAN.md#p0-10`,
    column: 4,
    stickers: ["UI"],
  },
  {
    id: "UI-P0-11",
    title: "UI-P0-11 · Дополнить ui-manifest",
    description: `## ID\nUI-P0-11\n\n## Что сделать\nДобавить в ui-manifest.md секции Search (§3), Tag (§4), TabGroup (§5).\n\n## Где в коде\n- .opencode/rules/ui-manifest.md\n\n## Спецификация\n.opencode/audit/UI-CONSISTENCY-PLAN.md#p0-11`,
    column: 4,
    stickers: ["UI"],
  },

  // ── Дальше (колонка 1) — P0 что ещё не сделано ──
  {
    id: "UI-P0-01",
    title: "UI-P0-01 · Аудит tokens (_tokens.scss)",
    description: `## ID\nUI-P0-01\n\n## Что сделать\nПровести аудит дизайн-токенов: соответствие kp-* компонентов, неиспользуемые переменные, синхронизация с PrimeNG Aura.\n\n## Где в коде\n- src/styles/_tokens.scss\n- src/app/shared/styles/_kp-button.scss\n\n## Спецификация\n.opencode/audit/UI-CONSISTENCY-PLAN.md#p0-01`,
    column: 1,
    stickers: ["UI"],
  },
  {
    id: "UI-P0-08",
    title: "UI-P0-08 · Унифицировать paginator",
    description: `## ID\nUI-P0-08\n\n## Что сделать\nТри разные реализации пагинации → единый kp-paginator. Убрать дублирование в kp-table, kp-product-picker, modules-page.\n\n## Где в коде\n- src/app/shared/ui/kp-table.component.ts\n- src/app/shared/ui/kp-product-picker/\n- src/app/features/modules/\n\n## Спецификация\n.opencode/audit/UI-CONSISTENCY-PLAN.md#p0-08`,
    column: 1,
    stickers: ["UI"],
  },
  {
    id: "UI-P0-09",
    title: "UI-P0-09 · Hit-area кнопок действий 32px",
    description: `## ID\nUI-P0-09\n\n## Что сделать\nМинимальная hit-area 32×32px для кнопок действий в таблицах (pencil, trash). Обновить kp-button стили.\n\n## Где в коде\n- src/app/shared/ui/kp-button.component.scss\n- src/app/shared/styles/_kp-button.scss\n\n## Спецификация\n.opencode/audit/UI-CONSISTENCY-PLAN.md#p0-09`,
    column: 1,
    stickers: ["UI"],
  },
  {
    id: "UI-P0-12",
    title: "UI-P0-12 · Smoke-тесты kp-search/kp-tag",
    description: `## ID\nUI-P0-12\n\n## Что сделать\nДобавить unit smoke-тесты для новых компонентов: kp-search (debounce, очистка), kp-tag (severity).\n\n## Где в коде\n- src/app/shared/ui/__tests__/\n\n## Спецификация\n.opencode/audit/UI-CONSISTENCY-PLAN.md#p0-12`,
    column: 1,
    stickers: ["UI"],
  },
  {
    id: "UI-P0-13",
    title: "UI-P0-13 · Visual pass quotations list",
    description: `## ID\nUI-P0-13\n\n## Что сделать\nВизуальный прогон списка КП: выравнивание, отступы, hover, empty state, загрузка.\n\n## Где в коде\n- src/app/features/quotations/\n\n## Спецификация\n.opencode/audit/UI-CONSISTENCY-PLAN.md#p0-13`,
    column: 1,
    stickers: ["UI"],
  },

  // ── Backlog ──
  {
    id: "BL-P1-01",
    title: "BL-P1-01 · Динамические колонки таблицы из конфига",
    description: `## ID\nBL-P1-01\n\n## Что сделать\nКолонки таблицы КП из documentTableType.columns (IDocTableColumn[]). Убрать жёстко заданные <th>.\n\n## Где в коде\n- src/app/features/quotations/quotation-editor.component.ts\n\n## Спецификация\n.opencode/audit/CHECKLIST-BACKLOG.md\n\n## Freeze\nquotations = wip → можно менять`,
    column: 1,
    stickers: ["UI", "PLM"],
  },
  {
    id: "BL-P1-02",
    title: "BL-P1-02 · e2e тесты quotation API",
    description: `## ID\nBL-P1-02\n\n## Что сделать\nEnd-to-end тесты API КП: CRUD, items, blocks, tender → quotation.\n\n## Где в коде\n- backend/src/__tests__/quotation.e2e.test.ts\n\n## Спецификация\n.opencode/audit/CHECKLIST-BACKLOG.md`,
    column: 1,
    stickers: ["Backlog"],
  },
  {
    id: "BL-P1-03",
    title: "BL-P1-03 · Деплой мониторинга Synology",
    description: `## ID\nBL-P1-03\n\n## Что сделать\nЗадеплоить мониторинг (порт 3001) на сервер Synology. Dockerfile, nginx, health.\n\n## Где в коде\n- deploy/monitoring/\n- deploy/synology/\n\n## Спецификация\n.opencode/audit/CHECKLIST-BACKLOG.md`,
    column: 1,
    stickers: ["Deploy"],
  },
  {
    id: "BL-P1-04",
    title: "BL-P1-04 · Верификация Sheets↔Mongo (689 записей)",
    description: `## ID\nBL-P1-04\n\n## Что сделать\nВерифицировать импорт 689 товаров из Google Sheets в MongoDB. Сверить артикулы, цены, категории.\n\n## Где в коде\n- tools/products_import_export/\n\n## Спецификация\n.opencode/audit/CHECKLIST-BACKLOG.md`,
    column: 1,
    stickers: ["Backlog"],
  },
  {
    id: "BL-P1-05",
    title: "BL-P1-05 · Система скидок в КП",
    description: `## ID\nBL-P1-05\n\n## Что сделать\nСистема скидок в редакторе КП: % на позицию, на таблицу, на документ. Пересчёт итогов.\n\n## Где в коде\n- src/app/features/quotations/quotation-editor.component.ts\n\n## Спецификация\n.opencode/audit/CHECKLIST-BACKLOG.md\n\n## Freeze\nquotations = wip`,
    column: 1,
    stickers: ["PLM"],
  },
];

// ── Метки (stickers) ─────────────────────────────────────────────
const STICKERS = {
  UI: { name: "UI", color: 5 },        // синий
  PLM: { name: "PLM", color: 8 },      // фиолетовый
  Bug: { name: "Bug", color: 9 },      // красный
  Deploy: { name: "Deploy", color: 3 }, // зелёный
  Backlog: { name: "Backlog", color: 11 }, // серый
};

// ── Main ─────────────────────────────────────────────────────────
async function main() {
  console.log("=== YouGile Seed: KPPDF — сейчас ===\n");

  if (DRY_RUN) {
    console.log("⚡ DRY RUN — запросы не отправляются\n");
  }

  // 1. Получить или создать доску
  console.log("[1/4] Доска «KPPDF — сейчас»");
  let boardId = null;
  const boards = (await apiGet("/boards")) || [];
  const existing = boards.find((b) => b.title === "KPPDF — сейчас");
  if (existing) {
    boardId = existing.id;
    console.log(`  Найдена: ${boardId}`);
  } else if (DRY_RUN) {
    console.log("  Будет создана (dry-run)");
    boardId = "dry-run-board-id";
  } else {
    const created = await apiPost("/boards", { title: "KPPDF — сейчас" });
    boardId = created.id;
    console.log(`  Создана: ${boardId}`);
  }

  // 2. Создать колонки
  console.log("\n[2/4] Колонки");
  const existingCols = DRY_RUN ? [] : ((await apiGet(`/columns?boardId=${boardId}`)) || []);
  const colIds = [];
  for (let i = 0; i < COLUMNS.length; i++) {
    const col = COLUMNS[i];
    const found = existingCols.find((c) => c.title === col.title);
    if (found) {
      colIds.push(found.id);
      console.log(`  [${i}] ${col.title} — найдена: ${found.id}`);
    } else if (DRY_RUN) {
      colIds.push(`dry-run-col-${i}`);
      console.log(`  [${i}] ${col.title} — будет создана`);
    } else {
      const created = await apiPost("/columns", {
        title: col.title,
        boardId,
        color: col.color,
      });
      colIds.push(created.id);
      console.log(`  [${i}] ${col.title} — создана: ${created.id}`);
    }
  }

  // 3. Создать метки
  console.log("\n[3/4] Метки (stickers)");
  const existingStickers = DRY_RUN ? [] : ((await apiGet(`/stickers?boardId=${boardId}`)) || []);
  const stickerMap = {};
  for (const [key, sticker] of Object.entries(STICKERS)) {
    const found = existingStickers.find((s) => s.name === sticker.name);
    if (found) {
      stickerMap[key] = found.id;
      console.log(`  ${sticker.name} — найдена: ${found.id}`);
    } else if (!DRY_RUN) {
      try {
        const created = await apiPost("/stickers", {
          name: sticker.name,
          boardId,
          color: sticker.color,
        });
        stickerMap[key] = created.id;
        console.log(`  ${sticker.name} — создана: ${created.id}`);
      } catch (e) {
        console.log(`  ${sticker.name} — ошибка: ${e.message}`);
        stickerMap[key] = null;
      }
    } else {
      stickerMap[key] = `dry-run-sticker-${key}`;
      console.log(`  ${sticker.name} — будет создана`);
    }
  }

  // 4. Seed карточек
  console.log("\n[4/4] Карточки");
  let created = 0;
  let skipped = 0;
  for (const card of SEED_CARDS) {
    const colId = colIds[card.column];
    if (!colId) {
      console.log(`  ❌ ${card.id} — нет колонки`);
      skipped++;
      continue;
    }

    const stickerIds = (card.stickers || [])
      .map((s) => stickerMap[s])
      .filter(Boolean);

    if (DRY_RUN) {
      console.log(`  📋 ${card.id} → колонка ${card.column} (${COLUMNS[card.column].title})`);
      created++;
      continue;
    }

    // Проверить, нет ли уже карточки с таким заголовком
    const existingTasks = (await apiGet(`/tasks?boardId=${boardId}&limit=200`)) || [];
    const content = existingTasks.content || existingTasks;
    const dup = content.find((t) => t.title === card.title);
    if (dup) {
      console.log(`  ⏭ ${card.id} — уже существует: ${dup.id}`);
      skipped++;
      continue;
    }

    try {
      const task = await apiPost("/tasks", {
        title: card.title,
        description: card.description,
        columnId: colId,
        stickers: stickerIds.length > 0 ? stickerIds : undefined,
      });
      console.log(`  ✅ ${card.id} — создана: ${task.id}`);
      created++;
    } catch (e) {
      console.log(`  ❌ ${card.id} — ошибка: ${e.message}`);
      skipped++;
    }
  }

  console.log(`\n=== Готово: ${created} создано, ${skipped} пропущено ===`);
  console.log(`\nДоска: ${TEAM_URL}#${boardId || "?"}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
