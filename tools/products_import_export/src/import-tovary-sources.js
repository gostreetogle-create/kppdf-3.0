#!/usr/bin/env node
/**
 * Импорт товаров из папки «ТОВАРЫ» в Google Sheets (лист products).
 *
 * Источники (по приоритету):
 * 1. Товары для КП_kp-media-urls.csv — артикул, название, цена, категория, фото /kp-media/
 * 2. bulk-trade-goods-data.json — тип, подкатегория, себестоимость, заметки, isActive
 * 3. media/products — доп. фото products/ART.ext
 *
 * Режим по умолчанию: upsert + не затирает уже заполненные ячейки.
 *
 * npm run import-tovary
 * npm run import-tovary -- --dry-run
 * npm run import-tovary -- --report-only
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { google } = require("googleapis");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const DRY_RUN = process.argv.includes("--dry-run");
const REPORT_ONLY = process.argv.includes("--report-only");
const SHEET = "products";

const TOVARY_DIR =
  process.env.TOVARY_SOURCES_DIR?.trim() ||
  "D:/invSportiN/Сайт/Исходники для сайта crm/ТОВАРЫ";
const MEDIA_DIR =
  process.env.MEDIA_PRODUCTS_DIR?.trim() ||
  "D:/invSportiN/Сайт/media/products";

const CSV_CANDIDATES = [
  "Товары для КП_kp-media-urls.csv",
  "Товары для КП.deduped.csv",
  "Товары для КП.csv",
];
const JSON_FILE = "bulk-trade-goods-data.json";

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

function normalizeSku(value) {
  return String(value || "")
    .trim()
    .replace(/^'/, "")
    .toLowerCase();
}

function formatSkuForSheet(sku) {
  const s = String(sku || "").trim();
  if (/^\d+$/.test(s)) return `'${s}`;
  return s;
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

/** Простой CSV с ; и кавычками */
function parseSemicolonCsv(content) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  const pushField = () => {
    row.push(field);
    field = "";
  };
  const pushRow = () => {
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
  };

  const text = stripBom(content);
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += ch;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      continue;
    }
    if (ch === ";") {
      pushField();
      continue;
    }
    if (ch === "\n") {
      pushField();
      pushRow();
      continue;
    }
    if (ch === "\r") continue;
    field += ch;
  }
  pushField();
  pushRow();
  return rows;
}

function pickCsvPath() {
  for (const name of CSV_CANDIDATES) {
    const p = path.join(TOVARY_DIR, name);
    if (fs.existsSync(p)) return p;
  }
  throw new Error(`CSV не найден в ${TOVARY_DIR}`);
}

function loadCsvProducts() {
  const csvPath = pickCsvPath();
  const table = parseSemicolonCsv(fs.readFileSync(csvPath, "utf8"));
  const headers = table[0].map((h) => String(h).trim());
  const idx = (name) => headers.findIndex((h) => h.toLowerCase().includes(name.toLowerCase()));

  const colCode = idx("артикул");
  const colName = headers.findIndex((h) => h.includes("Наименование"));
  const colUnit = idx("ед");
  const colPrice = headers.findIndex((h) => h.toLowerCase().includes("цена"));
  const colPhoto = headers.findIndex((h) => h.toLowerCase().includes("фото"));
  const colCategory = headers.findIndex((h) => h.toLowerCase().includes("категор"));
  const colSubcategory = headers.indexOf("Подкатегория");

  const map = new Map();
  for (const row of table.slice(1)) {
    const code = String(row[colCode] || "").trim();
    if (!code) continue;
    map.set(normalizeSku(code), {
      code,
      name: String(row[colName] || "").trim(),
      unit: String(row[colUnit] || "").trim(),
      price: String(row[colPrice] || "").trim().replace(/\s/g, ""),
      photoPath: String(row[colPhoto] || "").trim(),
      category: String(row[colCategory] || "").trim(),
      subcategory: colSubcategory >= 0 ? String(row[colSubcategory] || "").trim() : "",
      source: path.basename(csvPath),
    });
  }
  return { map, csvPath, count: map.size };
}

function loadJsonProducts() {
  const jsonPath = path.join(TOVARY_DIR, JSON_FILE);
  if (!fs.existsSync(jsonPath)) return new Map();
  const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
  const map = new Map();
  for (const item of data.items || []) {
    const code = String(item.code || "").trim();
    if (!code) continue;
    map.set(normalizeSku(code), item);
  }
  return map;
}

function loadMediaIndex() {
  const index = new Map();
  if (!fs.existsSync(MEDIA_DIR)) return index;
  for (const file of fs.readdirSync(MEDIA_DIR)) {
    if (!IMAGE_EXT.test(file)) continue;
    const stem = path.basename(file, path.extname(file));
    const key = normalizeSku(stem);
    const entry = index.get(key) || { files: [] };
    entry.files.push(file);
    index.set(key, entry);
  }
  for (const entry of index.values()) {
    entry.files.sort((a, b) => a.localeCompare(b, "ru"));
  }
  return index;
}

function normalizePhotoUrl(photoPath, code, mediaIndex) {
  if (photoPath) {
    if (photoPath.startsWith("/kp-media/") || photoPath.startsWith("kp-media/")) {
      return photoPath.startsWith("/") ? photoPath : `/${photoPath}`;
    }
    if (photoPath.startsWith("products/")) return photoPath;
    const base = path.basename(photoPath);
    if (base && IMAGE_EXT.test(base)) return `products/${base}`;
  }

  const media = mediaIndex.get(normalizeSku(code));
  if (media?.files?.length) {
    return `products/${media.files[0]}`;
  }
  return "";
}

function buildPhotoJson(mainUrl, code, mediaIndex) {
  const images = [];
  if (mainUrl) {
    images.push({ url: mainUrl.replace(/^\//, ""), isMain: true, sortOrder: 0 });
  }
  const media = mediaIndex.get(normalizeSku(code));
  if (media?.files) {
    for (const [i, file] of media.files.entries()) {
      const url = `products/${file}`;
      if (images.some((x) => x.url === url)) continue;
      images.push({ url, isMain: images.length === 0, sortOrder: i });
    }
  }
  if (images.length === 0) return "";
  return JSON.stringify(images);
}

function mergeSources(csvMap, jsonMap, mediaIndex) {
  const allKeys = new Set([...csvMap.keys(), ...jsonMap.keys()]);
  const products = [];

  for (const key of allKeys) {
    const csv = csvMap.get(key);
    const json = jsonMap.get(key);
    const code = csv?.code || json?.code;
    if (!code) continue;

    const photoUrl = normalizePhotoUrl(csv?.photoPath, code, mediaIndex);
    const name = csv?.name || json?.name || "";
    const kind = json?.kind || "ITEM";
    const isActive = json?.isActive !== false;

    products.push({
      "Артикул": formatSkuForSheet(code),
      "Наименование": name,
      "Тип": kind,
      "Ед. изм.": csv?.unit || json?.unitCode || "",
      "Категория": csv?.category || json?.category || "",
      "Подкатегория": csv?.subcategory || json?.subcategory || "",
      "Цена": csv?.price || (json?.priceRub != null ? String(json.priceRub) : ""),
      "Себестоимость": json?.costRub != null && json.costRub !== "" ? String(json.costRub) : "",
      "Остаток": "",
      "Статус": isActive ? "active" : "archived",
      "Описание": json?.description || "",
      "Заметки": json?.notes || "",
      "Фото URL": photoUrl,
      "Фото JSON": buildPhotoJson(photoUrl, code, mediaIndex),
      "ID спецификации": "",
      isActive: isActive ? "TRUE" : "FALSE",
      "Высота": "",
      "Длина": "",
      "Ширина": "",
      "Вес": "",
      "Материалы": "",
      "Монтаж": "",
      "Назначение": "",
      createdAt: new Date().toISOString().slice(0, 10),
      updatedAt: new Date().toISOString().slice(0, 10),
      _key: key,
      _sources: [csv ? "csv" : null, json ? "json" : null].filter(Boolean).join("+"),
    });
  }

  products.sort((a, b) => String(a["Артикул"]).localeCompare(String(b["Артикул"]), "ru"));
  return products;
}

function isEmpty(value) {
  return value == null || String(value).trim() === "";
}

function mergeRow(existing, incoming, headers) {
  const out = [...existing];
  while (out.length < headers.length) out.push("");

  for (let i = 0; i < headers.length; i++) {
    const h = headers[i];
    if (!h || h.startsWith("_")) continue;
    const newVal = incoming[h];
    if (isEmpty(newVal)) continue;
    if (isEmpty(out[i])) {
      out[i] = newVal;
      continue;
    }
    // Не затираем заполненное, кроме updatedAt
    if (h === "updatedAt") out[i] = newVal;
  }
  return out;
}

function rowToObject(headers, row) {
  const obj = {};
  headers.forEach((h, i) => {
    obj[h] = row[i] ?? "";
  });
  return obj;
}

function objectToRow(headers, obj) {
  return headers.map((h) => (obj[h] != null ? String(obj[h]) : ""));
}

async function getSheetsClient() {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!sheetId || !email || !privateKey) {
    throw new Error("Заполните .env");
  }
  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  await auth.authorize();
  return { sheets: google.sheets({ version: "v4", auth }), sheetId };
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

async function main() {
  console.log("=== Анализ источников ТОВАРЫ ===\n");

  const { map: csvMap, csvPath, count: csvCount } = loadCsvProducts();
  const jsonMap = loadJsonProducts();
  const mediaIndex = loadMediaIndex();

  console.log(`CSV: ${csvPath} → ${csvCount} позиций`);
  console.log(`JSON: ${path.join(TOVARY_DIR, JSON_FILE)} → ${jsonMap.size} позиций`);
  console.log(`Media: ${MEDIA_DIR} → ${mediaIndex.size} артикулов с фото`);

  const merged = mergeSources(csvMap, jsonMap, mediaIndex);
  const withPhoto = merged.filter((p) => !isEmpty(p["Фото URL"])).length;
  const withPrice = merged.filter((p) => !isEmpty(p["Цена"])).length;
  const withName = merged.filter((p) => !isEmpty(p["Наименование"])).length;

  console.log(`\nОбъединено уникальных артикулов: ${merged.length}`);
  console.log(`  с названием: ${withName}`);
  console.log(`  с ценой: ${withPrice}`);
  console.log(`  с фото URL: ${withPhoto}`);

  if (REPORT_ONLY) return;

  const { sheets, sheetId } = await getSheetsClient();
  const current = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET}!A1:ZZ5000`,
  });

  const existingRows = current.data.values || [];
  const headers = existingRows[0]?.map((h) => String(h || "").trim()) || [];
  if (headers.length === 0) throw new Error("Лист products без заголовков");

  const skuCol = headers.indexOf("Артикул");
  if (skuCol === -1) throw new Error('Нет колонки "Артикул"');

  const existingMap = new Map();
  const orphanRows = [];
  for (const row of existingRows.slice(1)) {
    const sku = normalizeSku(row[skuCol]);
    if (!sku) {
      orphanRows.push(row);
      continue;
    }
    if (!existingMap.has(sku)) existingMap.set(sku, row);
  }

  let updated = 0;
  let inserted = 0;
  const outputDataRows = [];

  for (const product of merged) {
    const key = product._key;
    const existing = existingMap.get(key);
    if (existing) {
      const mergedRow = mergeRow(existing, product, headers);
      outputDataRows.push(mergedRow);
      existingMap.delete(key);
      updated += 1;
    } else {
      outputDataRows.push(objectToRow(headers, product));
      inserted += 1;
    }
  }

  // Строки из таблицы, которых нет в новом импорте — сохраняем как есть
  let preserved = 0;
  for (const row of existingMap.values()) {
    outputDataRows.push(row);
    preserved += 1;
  }
  for (const row of orphanRows) {
    outputDataRows.push(row);
    preserved += 1;
  }

  outputDataRows.sort((a, b) =>
    String(a[skuCol] || "").localeCompare(String(b[skuCol] || ""), "ru"),
  );

  const report = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    sources: { csv: csvPath, json: JSON_FILE, media: MEDIA_DIR },
    stats: { merged: merged.length, updated, inserted, preserved, withPhoto, withPrice },
  };

  const reportPath = path.resolve(__dirname, "..", "output", "import-tovary-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  if (!DRY_RUN) {
    const output = [headers, ...outputDataRows];
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET}!A1:${colLetter(headers.length)}${output.length}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: output },
    });
  }

  console.log(DRY_RUN ? "\nDRY-RUN — в таблицу не писали" : "\nЗаписано в Google Sheets");
  console.log(`  Обновлено: ${updated}`);
  console.log(`  Добавлено: ${inserted}`);
  console.log(`  Сохранено старых (не из импорта): ${preserved}`);
  console.log(`  Итого строк: ${outputDataRows.length}`);
  console.log(`  Отчёт: ${reportPath}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
