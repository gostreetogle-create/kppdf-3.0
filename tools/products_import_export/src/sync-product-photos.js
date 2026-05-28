#!/usr/bin/env node
/**
 * Сканирует папку с фото, артикул = имя файла без расширения.
 * Обновляет колонки «Фото URL» и «Фото JSON» в листе products.
 *
 * npm run sync-photos
 * npm run sync-photos -- --dry-run
 * npm run sync-photos -- --append-missing   # создать строки для фото без артикула в таблице
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { google } = require("googleapis");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const DRY_RUN = process.argv.includes("--dry-run");
const APPEND_MISSING = process.argv.includes("--append-missing");
const REBUILD = process.argv.includes("--rebuild-from-photos");
const SHEET = "products";
const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;

const MEDIA_DIR =
  process.env.MEDIA_PRODUCTS_DIR?.trim() ||
  "D:/invSportiN/Сайт/media/products";
const URL_PREFIX = (process.env.MEDIA_PHOTO_URL_PREFIX || "products/").replace(/\\/g, "/");
const URL_PREFIX_NORM = URL_PREFIX.endsWith("/") ? URL_PREFIX : `${URL_PREFIX}/`;

function normalizeSku(value) {
  return String(value || "")
    .trim()
    .replace(/^'/, "")
    .toLowerCase();
}

/** Google Sheets убирает ведущие нули у числовых артикулов — сохраняем как текст */
function formatSkuForSheet(sku) {
  const s = String(sku || "").trim();
  if (/^\d+$/.test(s)) return `'${s}`;
  return s;
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

function buildPhotoIndex(mediaDir) {
  if (!fs.existsSync(mediaDir)) {
    throw new Error(`Папка не найдена: ${mediaDir}`);
  }

  const bySku = new Map();
  for (const file of fs.readdirSync(mediaDir)) {
    if (!IMAGE_EXT.test(file)) continue;
    const sku = path.basename(file, path.extname(file)).trim();
    if (!sku) continue;
    const key = normalizeSku(sku);
    const entry = bySku.get(key) || { sku, files: [] };
    entry.files.push(file);
    bySku.set(key, entry);
  }

  for (const entry of bySku.values()) {
    entry.files.sort((a, b) => a.localeCompare(b, "ru"));
    const images = entry.files.map((file, index) => ({
      url: `${URL_PREFIX_NORM}${file}`,
      isMain: index === 0,
      sortOrder: index,
    }));
    entry.mainUrl = images[0].url;
    entry.photoJson = JSON.stringify(images);
  }

  return bySku;
}

async function getSheetsClient() {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!sheetId || !email || !privateKey) {
    throw new Error("Заполните .env: GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY");
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
  const photoIndex = buildPhotoIndex(MEDIA_DIR);
  console.log(`Фото в папке: ${photoIndex.size} артикулов (${MEDIA_DIR})`);

  const { sheets, sheetId } = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET}!A1:ZZ5000`,
  });

  const rows = response.data.values || [];
  if (rows.length === 0) {
    throw new Error(`Лист "${SHEET}" пуст`);
  }

  const headers = rows[0].map((h) => String(h || "").trim());
  const col = (name) => headers.indexOf(name);
  const skuCol = col("Артикул");
  const photoUrlCol = col("Фото URL");
  const photoJsonCol = col("Фото JSON");

  if (skuCol === -1 || photoUrlCol === -1 || photoJsonCol === -1) {
    throw new Error('Нужны колонки: "Артикул", "Фото URL", "Фото JSON"');
  }

  const dataRows = REBUILD ? [] : rows.slice(1);
  const usedPhotoKeys = new Set();
  let updated = 0;
  let skipped = 0;

  if (REBUILD) {
    for (const photo of photoIndex.values()) {
      const newRow = Array(headers.length).fill("");
      newRow[skuCol] = formatSkuForSheet(photo.sku);
      newRow[photoUrlCol] = photo.mainUrl;
      newRow[photoJsonCol] = photo.photoJson;
      const activeCol = col("isActive");
      if (activeCol !== -1) newRow[activeCol] = "true";
      dataRows.push(newRow);
      usedPhotoKeys.add(normalizeSku(photo.sku));
    }
  } else for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] ? [...dataRows[i]] : [];
    while (row.length < headers.length) row.push("");

    const sku = String(row[skuCol] || "").trim();
    if (!sku) continue;

    const photo = photoIndex.get(normalizeSku(sku));
    if (!photo) {
      skipped += 1;
      continue;
    }

    const oldUrl = String(row[photoUrlCol] || "").trim();
    if (oldUrl === photo.mainUrl && String(row[photoJsonCol] || "").trim() === photo.photoJson) {
      usedPhotoKeys.add(normalizeSku(sku));
      continue;
    }

    row[photoUrlCol] = photo.mainUrl;
    row[photoJsonCol] = photo.photoJson;
    dataRows[i] = row;
    usedPhotoKeys.add(normalizeSku(sku));
    updated += 1;
  }

  let appended = 0;
  if (!REBUILD && APPEND_MISSING) {
    for (const photo of photoIndex.values()) {
      const key = normalizeSku(photo.sku);
      if (usedPhotoKeys.has(key)) continue;

      const newRow = Array(headers.length).fill("");
      newRow[skuCol] = formatSkuForSheet(photo.sku);
      newRow[photoUrlCol] = photo.mainUrl;
      newRow[photoJsonCol] = photo.photoJson;
      const activeCol = col("isActive");
      if (activeCol !== -1) newRow[activeCol] = "true";
      dataRows.push(newRow);
      usedPhotoKeys.add(key);
      appended += 1;
    }
  }

  const output = [headers, ...dataRows];
  const range = `${SHEET}!A1:${colLetter(headers.length)}${output.length}`;

  if (!DRY_RUN) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: output },
    });
  }

  const unmatchedPhotos = [...photoIndex.keys()].filter((k) => !usedPhotoKeys.has(k)).length;

  console.log(DRY_RUN ? "DRY-RUN (без записи)" : "Записано в Google Sheets");
  console.log(`  Обновлено строк: ${updated}`);
  console.log(`  Добавлено строк: ${appended}${REBUILD ? ` (rebuild: ${dataRows.length})` : ""}`);
  console.log(`  Без фото (артикул в таблице, файла нет): ${skipped}`);
  console.log(`  Фото без строки в таблице: ${unmatchedPhotos}${APPEND_MISSING ? "" : " (используйте --append-missing)"}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
