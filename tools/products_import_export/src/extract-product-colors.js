#!/usr/bin/env node
/**
 * Извлекает цвет(а) из «Наименование», «Описание», «Материалы» → колонка «Цвет».
 *
 * npm run extract-colors
 * npm run extract-colors -- --dry-run
 * npm run extract-colors -- --force
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { google } = require("googleapis");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const SHEET = "products";

/** Нормализация подписи цвета для таблицы */
const COLOR_CANON = {
  белый: "белый",
  белая: "белый",
  белое: "белый",
  белого: "белый",
  белую: "белый",
  "белый/чёрный": "белый/чёрный",
  "белый/черный": "белый/чёрный",
  "бел/черн": "белый/чёрный",
  чёрный: "чёрный",
  черный: "чёрный",
  черная: "чёрный",
  черн: "чёрный",
  красный: "красный",
  красная: "красный",
  синий: "синий",
  зелёный: "зелёный",
  зеленый: "зелёный",
  жёлтый: "жёлтый",
  желтый: "жёлтый",
  "графитово-серый": "графитово-серый",
  "тёмно-серый": "тёмно-серый",
  "темно-серый": "тёмно-серый",
  "по согласованию": "по согласованию",
  "светлый дуб": "светлый дуб",
  "серый мрамор": "серый мрамор",
  "rgb (мульти)": "RGB",
  rgb: "RGB",
  "rgb dmx": "RGB DMX",
};

function normalizeSpaces(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function canonColor(label) {
  const key = label.trim().toLowerCase();
  return COLOR_CANON[key] || label.trim();
}

function addColor(bucket, label) {
  const c = canonColor(label);
  if (!c) return;
  const key = c.toLowerCase();

  // Оставляем более конкretную версию (напр. «графитово-серый (АКП)» вместо дубля)
  if (/графит/i.test(c)) {
    for (const [k, v] of [...bucket.entries()]) {
      if (/графит/i.test(v)) {
        if (c.length > v.length) bucket.delete(k);
        else if (v.length > c.length) return;
      }
    }
  }

  if (!bucket.has(key)) bucket.set(key, c);
}

/**
 * Интеллектуальное извлечение цвета из текстов товара.
 */
function extractColors(name, description, materials) {
  const nameText = normalizeSpaces(name);
  const full = normalizeSpaces(`${nameText} ${description || ""} ${materials || ""}`);
  const bucket = new Map();

  // 1. RAL (все вхождения)
  for (const m of full.matchAll(/\bRAL\s*[-–]?\s*(\d{4})\b/gi)) {
    addColor(bucket, `RAL ${m[1]}`);
  }

  // 2. «цвет корпуса: RAL 1013» и подобное
  for (const m of full.matchAll(/\bцвет\s+(?:корпуса\s*)?[:—-]?\s*RAL\s*[-–]?\s*(\d{4})\b/gi)) {
    addColor(bucket, `RAL ${m[1]}`);
  }

  // 3. «цвет 1014 "солома"»
  for (const m of full.matchAll(/\bцвет\s+(\d{4})\s+[«"']([^»"']{2,40})/gi)) {
    addColor(bucket, `RAL ${m[1]} (${m[2].trim()})`);
  }

  // 4. По согласованию
  if (/\b(?:цвет\s+)?по\s+согласованию\b/i.test(full)) {
    addColor(bucket, "по согласованию");
  }

  // 5. Покраска / отделка
  if (/графитово\s*[-–]?\s*сер/i.test(full)) addColor(bucket, "графитово-серый");
  if (/т[её]мно\s*[-–]?\s*сер/i.test(full)) addColor(bucket, "тёмно-серый");
  if (/подшивка\s+потолка\s*[-–:]?\s*бел/i.test(full)) addColor(bucket, "белый (подшивка)");
  if (/акп\s+цвет\s+графит/i.test(full)) addColor(bucket, "графитово-серый (АКП)");

  // 6. Сетки — из короткого наименования
  const mesh = nameText.match(
    /^Сетка\s+(?:для\s+гашения\s+)?(бел\/черн|белая|черн(?:ая)?|черн)(?:\s|$|,|\.)/i,
  );
  if (mesh) {
    const token = mesh[1].toLowerCase();
    if (token.includes("бел/черн")) addColor(bucket, "белый/чёрный");
    else if (token.startsWith("бел")) addColor(bucket, "белый");
    else if (token.startsWith("черн")) addColor(bucket, "чёрный");
  }

  // 6b. Сетка — цвет в описании (d нити …)
  if (/^Сетка\b/i.test(nameText) && /бел\/черн/i.test(full)) addColor(bucket, "белый/чёрный");

  // 7. Спортивная разметка
  if (/разметка\s+[^\s,]*\s*красн/i.test(nameText)) addColor(bucket, "красный");

  // 8. LED / RGB
  if (/\bRGB\b/i.test(full) && /(?:лента|подсвет)/i.test(full)) {
    if (/DMX/i.test(full)) addColor(bucket, "RGB DMX");
    else addColor(bucket, "RGB");
  }
  if (/лenta\s+белого\s+цвета|лента\s+белого\s+цвета/i.test(full)) {
    addColor(bucket, "белый");
  }

  // 9. Древесные оттенки (дополнение к RAL на МАФ)
  if (/светл(?:ый|ого)\s+дуб/i.test(full)) addColor(bucket, "светлый дуб");
  if (/сер(?:ый|ого)\s+мрамор/i.test(full)) addColor(bucket, "серый мрамор");

  // 10. Резиновое покрытие / крошка с цветом
  if (/резинов(?:ое|ая)\s+покрытие/i.test(full) && bucket.size === 0) {
    const tone = full.match(/цвет\s+([а-яё\-]{3,20})/i);
    if (tone) addColor(bucket, tone[1]);
  }

  // 11. Общие цвета в наименовании (если ничего не нашли)
  if (bucket.size === 0) {
    if (/красн/i.test(nameText)) addColor(bucket, "красный");
    else if (/син/i.test(nameText)) addColor(bucket, "синий");
    else if (/зел[её]н/i.test(nameText)) addColor(bucket, "зелёный");
    else if (/ж[её]лт/i.test(nameText)) addColor(bucket, "жёлтый");
    else if (/(?:^|\s)бел/i.test(nameText)) addColor(bucket, "белый");
    else if (/(?:^|\s)черн/i.test(nameText)) addColor(bucket, "чёрный");
  }

  // RAL + дерево: RAL первым
  const values = [...bucket.values()];
  values.sort((a, b) => {
    const ar = /^RAL/.test(a);
    const br = /^RAL/.test(b);
    if (ar && !br) return -1;
    if (!ar && br) return 1;
    return a.localeCompare(b, "ru");
  });

  return values.join("; ");
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
  console.log("=== Извлечение цветов → колонка «Цвет» ===\n");

  const { sheets, sheetId } = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET}!A1:ZZ5000`,
  });

  const table = response.data.values || [];
  if (table.length < 2) throw new Error("Лист products пуст");

  let headers = table[0].map((h) => String(h || "").trim());
  if (!headers.includes("Цвет")) {
    throw new Error('Колонка «Цвет» отсутствует. Сначала: npm run sync-columns');
  }

  const col = (title) => headers.indexOf(title);
  const nameCol = col("Наименование");
  const descCol = col("Описание");
  const matCol = col("Материалы");
  const colorCol = col("Цвет");
  const skuCol = col("Артикул");

  const stats = {
    total: 0,
    filled: 0,
    updated: 0,
    skipped: 0,
    empty: 0,
    byColor: {},
  };

  const samples = [];
  const outputRows = table.slice(1).map((row) => [...row]);

  for (let i = 0; i < outputRows.length; i++) {
    const row = outputRows[i];
    while (row.length < headers.length) row.push("");

    const name = String(row[nameCol] || "").trim();
    if (!name) continue;
    stats.total += 1;

    const existing = String(row[colorCol] || "").trim();
    const extracted = extractColors(
      name,
      row[descCol],
      matCol >= 0 ? row[matCol] : "",
    );

    if (!extracted) {
      stats.empty += 1;
      continue;
    }

    stats.filled += 1;
    stats.byColor[extracted] = (stats.byColor[extracted] || 0) + 1;

    if (!isEmpty(existing) && !FORCE) {
      stats.skipped += 1;
      continue;
    }

    if (existing !== extracted) {
      row[colorCol] = extracted;
      stats.updated += 1;
      if (samples.length < 20) {
        samples.push({
          sku: row[skuCol] || `#${i + 2}`,
          name: name.slice(0, 60),
          color: extracted,
        });
      }
    }
  }

  const report = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    stats,
    topColors: Object.entries(stats.byColor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .map(([color, count]) => ({ color, count })),
    samples,
  };

  const reportPath = path.resolve(__dirname, "..", "output", "extract-colors-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(`Строк с наименованием: ${stats.total}`);
  console.log(`Цвет распознан: ${stats.filled}`);
  console.log(`Записано / обновлено: ${stats.updated}`);
  console.log(`Пропущено (уже заполнено): ${stats.skipped}`);
  console.log(`Без цвета в тексте: ${stats.empty}`);
  console.log("\nТоп цветов:");
  report.topColors.forEach(({ color, count }) => console.log(`  ${count}× ${color}`));
  console.log("\nПримеры:");
  samples.slice(0, 8).forEach((s) => console.log(`  [${s.sku}] ${s.color} ← ${s.name}`));

  if (!DRY_RUN && stats.updated > 0) {
    const output = [headers, ...outputRows];
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET}!A1:${colLetter(headers.length)}${output.length}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: output },
    });
    console.log(`\nЗаписано в Google Sheets (${stats.updated} ячеек «Цвет»)`);
  } else if (DRY_RUN) {
    console.log("\nDRY-RUN — в таблицу не писали");
  }

  console.log(`Отчёт: ${reportPath}`);
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err.message || err);
    process.exit(1);
  });
}

module.exports = { extractColors };
