#!/usr/bin/env node
/**
 * Интеллектуальное разделение длинных «Наименование» → короткое имя + «Описание».
 * Работает только с Google Sheets (лист products), KPPDF не меняет.
 *
 * npm run normalize-texts
 * npm run normalize-texts -- --dry-run
 * npm run normalize-texts -- --report-only
 * npm run normalize-texts -- --min-len 50
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { google } = require("googleapis");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const DRY_RUN = process.argv.includes("--dry-run");
const REPORT_ONLY = process.argv.includes("--report-only");
const REFINE_LONG = process.argv.includes("--refine-long");
const FORCE_DESC = process.argv.includes("--force-desc");
const SHEET = "products";

const MIN_LEN = (() => {
  const i = process.argv.indexOf("--min-len");
  return i >= 0 ? Number(process.argv[i + 1]) || 48 : 48;
})();

const MAX_NAME_LEN = 72;

/** Маркеры начала описательной части (порядок не важен — берём самый ранний индекс) */
const DESC_MARKERS = [
  /\s+Размер(?:ы)?(?:\s*\([^)]*\))?\s*[:：]/i,
  /\s+Габарит(?:ы)?\s*\(/i,
  /\s+Габарит(?:ы)?(?:\s*\([^)]*\))?\s*[:：]/i,
  /\s+Длина\s*[-–—:\s]/i,
  /\s+Ширина\s*[-–—:\s]/i,
  /\s+Высота\s*[-–—:\s]/i,
  /\s+Тип\s*:\s*\d/i,
  /\s+Тип\s*:\s+/i,
  /\s+Каркас\s*:/i,
  /\s+Внешняя\s+обшивка\s*:/i,
  /\s+Остекление\s*:/i,
  /\s+Материал(?:ы)?\s*[:：—–-]/i,
  /\s+оцинкован/i,
  /\s+в\s+комплекте\s*:/i,
  /\s+,\s*Светодиодная\s+лента/i,
  /\s+,\s*алюминиевый\s+профиль/i,
  /\s+,\s*блок\s+питан/i,
  /\s+для\s+выполнения/i,
  /\s+,\s*d\s+нити/i,
  /\s+,\s*ячейка/i,
  /\s+Вес\s*:/i,
  /\s+Крепеж\s*[-–—]/i,
  /\s+Артикул\s*:/i,
  /\s+,\s*высотой\s+/i,
  /\s+,\s*примерной\s+/i,
  /\s+порошковое\s+окрашивание,\s+в\s+комплекте/i,
  /\s+,\s*со\s+стаканами/i,
  /\s+,\s*круглые/i,
  /\s+,\s*с\s+сеткой\b/i,
  /\s+,\s*сиденья\s*-/i,
];

function normalizeSpaces(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1")
    .trim();
}

function looksLikeDescription(text) {
  const t = text.trim();
  if (!t) return false;
  return (
    /^(Светодиод|алюмин|блок|щит|кольцо|порошков|монолит|влагост|из\s|d\s+нити|для\s|в\s+комплекте|со\s+стаканами|круглые)/i.test(
      t,
    ) ||
    /^\d/.test(t) ||
    t.length > 35
  );
}

function findEarliestMarkerIndex(text) {
  let best = -1;
  for (const re of DESC_MARKERS) {
    const m = text.match(re);
    if (m && m.index !== undefined && m.index > 4) {
      if (best < 0 || m.index < best) best = m.index;
    }
  }
  return best;
}

/**
 * Разделяет длинное наименование на короткое имя и описание.
 */
function splitNameDescription(raw) {
  const name0 = normalizeSpaces(raw);
  if (!name0) return { name: "", description: "", reason: "empty" };

  // Короткие без явных характеристик — не трогаем
  if (name0.length <= MIN_LEN && !/,\s*d\s+нити/i.test(name0)) {
    return { name: name0, description: "", reason: "short" };
  }

  // Элемент «…»
  const elementMatch = name0.match(/^(Элемент\s+«[^»]+»\.?)\s+(.+)$/);
  if (elementMatch && elementMatch[2].length > 8) {
    return {
      name: elementMatch[1].trim(),
      description: elementMatch[2].trim(),
      reason: "element-quote",
    };
  }

  // Название в кавычках + характеристики
  const quotedMatch = name0.match(/^(.+?\s+"[^"]+"\.?)\s+(Размер|Габарит|Материал|Вес|Длина|Каркас)/i);
  if (quotedMatch) {
    const idx = name0.search(/\s+(Размер|Габарит|Материал|Вес|Длина|Каркас)/i);
    if (idx > 8) {
      return {
        name: name0.slice(0, idx).replace(/[.\s]+$/, "").trim(),
        description: name0.slice(idx).trim(),
        reason: "quoted-product",
      };
    }
  }

  // Остановочный павильон: имя до «Габариты» / «Каркас»
  const pavilionMatch = name0.match(/^(Остановочный\s+павильон[^.]*\.?\s*Тип\s*:\s*\d+)/i);
  if (pavilionMatch) {
    const idx = findEarliestMarkerIndex(name0.slice(pavilionMatch[1].length));
    if (idx >= 0) {
      const cut = pavilionMatch[1].length + idx;
      return {
        name: name0.slice(0, cut).replace(/[,\s.]+$/, "").trim(),
        description: name0.slice(cut).replace(/^[,\s.:]+/, "").trim(),
        reason: "pavilion",
      };
    }
  }

  const markerIdx = findEarliestMarkerIndex(name0);
  if (markerIdx > 4) {
    return {
      name: name0.slice(0, markerIdx).replace(/[,\s.]+$/, "").trim(),
      description: name0.slice(markerIdx).replace(/^[,\s.:]+/, "").trim(),
      reason: "marker",
    };
  }

  // Сетки: «Сетка …, d нити …» — в имени сохраняем тип/цвет, характеристики в описание
  const meshMatch = name0.match(/^(Сетка[^,]{0,45}),\s*(d\s+нити.+)$/i);
  if (meshMatch) {
    return {
      name: meshMatch[1].trim(),
      description: meshMatch[2].trim(),
      reason: "mesh",
    };
  }

  // Запятая: «тип изделия, комплектация/материалы» — не раньше маркеров «в комплекте», «d нити»
  const commaIdx = name0.indexOf(",");
  if (commaIdx > 8 && commaIdx < 90) {
    const part1 = name0.slice(0, commaIdx).trim();
    const part2 = name0.slice(commaIdx + 1).trim();
    if (looksLikeDescription(part2) && !/^вынос\s+\d/i.test(part2)) {
      return { name: part1, description: part2, reason: "comma" };
    }
  }

  // Предложение через точку
  if (name0.length > 85) {
    const dotMatch = name0.match(/^(.{15,90}?\.)\s+(.{10,})$/);
    if (dotMatch) {
      return {
        name: dotMatch[1].replace(/\.$/, "").trim() + ".",
        description: dotMatch[2].trim(),
        reason: "sentence",
      };
    }
  }

  // Жёсткий лимит по длине имени
  if (name0.length > MAX_NAME_LEN) {
    const cut = name0.slice(0, MAX_NAME_LEN);
    const sp = cut.lastIndexOf(" ");
    if (sp > 20) {
      return {
        name: name0.slice(0, sp).trim(),
        description: name0.slice(sp).trim(),
        reason: "length-fallback",
      };
    }
  }

  return { name: name0, description: "", reason: "unchanged" };
}

function isEmpty(value) {
  return value == null || String(value).trim() === "";
}

function colLetter(n) {
  let out = "";
  let num = n;
  while (num > 0) {
    const rem = (num - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    num = Math.floor((num - 1) / 26);
  }
  return out;
}

async function getSheetsClient() {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!sheetId || !email || !privateKey) {
    throw new Error("Заполните GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY");
  }
  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  await auth.authorize();
  return { sheets: google.sheets({ version: "v4", auth }), sheetId };
}

async function main() {
  console.log("=== Нормализация наименований → описание ===\n");

  const { sheets, sheetId } = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET}!A1:ZZ5000`,
  });

  const table = response.data.values || [];
  if (table.length < 2) throw new Error("Лист products пуст");

  const headers = table[0].map((h) => String(h || "").trim());
  const nameCol = headers.indexOf("Наименование");
  const descCol = headers.indexOf("Описание");
  if (nameCol < 0) throw new Error('Нет колонки "Наименование"');
  if (descCol < 0) throw new Error('Нет колонки "Описание"');

  const stats = {
    total: 0,
    unchanged: 0,
    updated: 0,
    skippedHasDesc: 0,
    skippedNoSplit: 0,
    byReason: {},
  };

  const samples = [];
  const outputRows = table.slice(1).map((row) => [...row]);

  for (let i = 0; i < outputRows.length; i++) {
    const row = outputRows[i];
    while (row.length < headers.length) row.push("");

    const oldName = String(row[nameCol] || "").trim();
    if (!oldName) continue;
    stats.total += 1;

    const existingDesc = String(row[descCol] || "").trim();

    if (!isEmpty(existingDesc) && !FORCE_DESC && !REFINE_LONG) {
      stats.skippedHasDesc += 1;
      continue;
    }

    if (!isEmpty(existingDesc) && REFINE_LONG && oldName.length <= MAX_NAME_LEN) {
      stats.skippedHasDesc += 1;
      continue;
    }

    const sourceForSplit =
      REFINE_LONG && !isEmpty(existingDesc) ? `${oldName} ${existingDesc}` : oldName;
    const split = splitNameDescription(sourceForSplit);
    stats.byReason[split.reason] = (stats.byReason[split.reason] || 0) + 1;

    if (!split.description || (split.name === oldName && !REFINE_LONG)) {
      stats.skippedNoSplit += 1;
      stats.unchanged += 1;
      continue;
    }

    const newDesc =
      REFINE_LONG && !isEmpty(existingDesc) && split.description !== existingDesc
        ? split.description
        : !isEmpty(existingDesc) && FORCE_DESC
          ? `${existingDesc}\n\n${split.description}`
          : split.description;

    row[nameCol] = split.name;
    row[descCol] = newDesc;
    stats.updated += 1;

    if (samples.length < 25) {
      samples.push({
        sku: row[headers.indexOf("Артикул")] || `#${i + 2}`,
        reason: split.reason,
        beforeLen: oldName.length,
        afterLen: split.name.length,
        descLen: newDesc.length,
        before: oldName.slice(0, 120),
        after: split.name,
        description: newDesc.slice(0, 120),
      });
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    minLen: MIN_LEN,
    stats,
    samples,
  };

  const reportPath = path.resolve(__dirname, "..", "output", "normalize-product-texts-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`Строк с наименованием: ${stats.total}`);
  console.log(`Будет обновлено: ${stats.updated}`);
  console.log(`Без изменений (нет разделения): ${stats.skippedNoSplit}`);
  console.log(`Пропущено (описание уже есть): ${stats.skippedHasDesc}`);
  console.log("\nПричины разделения:", stats.byReason);
  console.log("\nПримеры:");
  samples.slice(0, 8).forEach((s) => {
    console.log(`\n[${s.sku}] (${s.reason}) ${s.beforeLen} → ${s.afterLen} + desc ${s.descLen}`);
    console.log(`  Было: ${s.before}${s.beforeLen > 120 ? "…" : ""}`);
    console.log(`  Имя:  ${s.after}`);
    console.log(`  Опис: ${s.description}${s.descLen > 120 ? "…" : ""}`);
  });

  if (REPORT_ONLY) {
    console.log(`\nREPORT-ONLY — отчёт: ${reportPath}`);
    return;
  }

  if (!DRY_RUN && stats.updated > 0) {
    const output = [headers, ...outputRows];
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET}!A1:${colLetter(headers.length)}${output.length}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: output },
    });
    console.log(`\nЗаписано в Google Sheets (${stats.updated} строк)`);
  } else if (DRY_RUN) {
    console.log("\nDRY-RUN — в таблицу не писали");
  }

  console.log(`Отчёт: ${reportPath}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

module.exports = { splitNameDescription, normalizeSpaces };
