#!/usr/bin/env node
/**
 * Синхронизация карточки YouGile по PLM-xxx из реестра:
 * описание (шаблон conventions.md) + отметка чеклиста.
 *
 * node tools/sync-plm-checklist.js PLM-139 --done
 * node tools/sync-plm-checklist.js PLM-139 --dry-run
 */
const { loadRegistry, resolvePlm, normalizePlm } = require("./yougile-registry.js");
const https = require("https");

const TOKEN = "Za17DZkKgxjHfFSaKb+6I28QqdmUPNPeTSP77FsewPG-cnZBY2BoaEMZJ4mmJjdu";
const TEAM_URL = "https://yougile.com/team/0bdbccb0610e";

const DESCRIPTIONS = {
  "PLM-139": `**Категория:** 08 Документы
**EPIC:** [EPIC #DOCS] Редакторы и печатные формы
**Родитель:** 8.1 Редактор документа КП (PLM-126)

Шаблоны оформления, фон документа, контрагент в сайдбаре, категории шаблонов.

**Маршрут:** \`/quotations/:id\`
**Dev:** http://localhost:4200/quotations/new

**Код:** \`src/app/features/quotations/quotation-editor.component.ts\`
**UX:** \`src/app/features/quotations/QUOTATION-EDITOR-BLOCKS.md\`

## Чеклист (2026-05-28)
- [x] Фон документа — загрузка файла / drag-and-drop → \`document-templates.backgroundImage\`
- [x] Контрагент — \`kp-select\` + \`CounterpartyOptionsService\`
- [x] Шаблоны — категории docType (КП, письмо, договор…) + выпадающий список
- [x] Таблицы — \`table-layout: fixed\`, перенос текста в пределах A4

**Ссылка в репо:** config/yougile-task-registry.yaml → PLM-139`,
  "PLM-137": `**Категория:** 08 Документы
**EPIC:** [EPIC #DOCS] Редакторы и печатные формы
**Родитель:** 8.3 UI: раздел «Документы» (PLM-142)

Hub-страница коммерческих документов с RBAC-фильтрацией карточек.

**Маршрут:** \`/documents\`, \`/documents/:id\` → redirect \`/quotations/:id\`
**Dev:** http://localhost:4200/documents

**Код:** \`src/app/features/documents/documents-page.component.ts\`

## Чеклист
- [x] Маршрут /documents и redirect /documents/:id
- [x] Hub с карточками КП / Заказы / Запросы
- [x] RBAC-фильтрация карточек (AuthService.hasPermission)
- [x] Empty state без прав + кнопка «На главную»
- [x] Пункт меню «Документы»
- [ ] Breadcrumbs через «Документы» на /quotations (отдельная задача)

**Ссылка в репо:** config/yougile-task-registry.yaml → PLM-137`,
};

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

function markChecklistsDone(checklists) {
  if (!checklists?.length) return checklists;
  return checklists.map((list) => ({
    ...list,
    items: (list.items || []).map((item) => ({ ...item, isCompleted: true })),
  }));
}

async function main() {
  const args = process.argv.slice(2);
  const plmArg = args.find((a) => normalizePlm(a));
  const dryRun = args.includes("--dry-run");
  const markDone = args.includes("--done");

  if (!plmArg) {
    console.error("Usage: node tools/sync-plm-checklist.js PLM-139 [--done] [--dry-run]");
    process.exit(1);
  }

  const { tasks } = loadRegistry();
  const plm = resolvePlm(plmArg, tasks);
  if (!plm) {
    console.error("Не найден в реестре:", plmArg);
    process.exit(1);
  }

  const entry = tasks[plm];
  const live = await getTask(entry.uuid);
  const description = DESCRIPTIONS[plm] ?? live.description;
  const patch = { description };

  if (markDone && live.checklists?.length) {
    patch.checklists = markChecklistsDone(live.checklists);
  }

  console.log(`${plm}\t${live.title}`);
  console.log(`url:\t${TEAM_URL}/#${plm}`);
  console.log(`uuid:\t${entry.uuid}`);
  console.log(`section:\t${entry.section || "—"}`);

  if (live.checklists?.length) {
    console.log("\nЧеклист:");
    for (const list of live.checklists) {
      for (const item of list.items || []) {
        const next = markDone ? "[x]" : item.isCompleted ? "[x]" : "[ ]";
        console.log(`  ${next} ${item.title}`);
      }
    }
  }

  if (dryRun) {
    console.log("\n(dry-run — PUT не отправлен)");
    return;
  }

  const res = await request("PUT", `/tasks/${entry.uuid}`, patch);
  if (res.status >= 400) {
    console.error("PUT failed:", res.status, res.data);
    process.exit(1);
  }
  console.log("\nOK — описание и чеклист обновлены в YouGile");
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
