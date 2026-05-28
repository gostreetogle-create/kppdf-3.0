#!/usr/bin/env node
/**
 * Сравнивает поля продукта (kppdf + kppdf-3.0) с листом products и добавляет недостающие колонки.
 */
const path = require("path");
const dotenv = require("dotenv");
const { google } = require("googleapis");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const SHEET = "products";

/** Целевой порядок колонок (объединение kppdf + kppdf-3.0) */
const TARGET_HEADERS = [
  "Артикул",
  "Наименование",
  "Тип",
  "Ед. изм.",
  "Категория",
  "Подкатегория", // kppdf: subcategory
  "Цвет",
  "Цена",
  "Себестоимость", // kppdf: costRub
  "Остаток",
  "Статус",
  "Описание",
  "Заметки", // kppdf: notes
  "Фото URL", // kppdf: images[main].url
  "Фото JSON", // kppdf: images[] serialized
  "ID спецификации", // kppdf: specId
  "isActive",
  "Высота", // kppdf-3.0
  "Длина",
  "Ширина",
  "Вес",
  "Материалы",
  "Монтаж",
  "Назначение",
  "createdAt",
  "updatedAt",
];

/** Поля из старого kppdf, которых не было в первой версии листа */
const ADDED_FROM_KPPDF = [
  "Подкатегория",
  "Себестоимость",
  "Заметки",
  "Фото URL",
  "Фото JSON",
  "ID спецификации",
];

/** Поля из kppdf-3.0, добавленные для импорта */
const ADDED_FROM_KPPDF_3 = [
  "Высота",
  "Длина",
  "Ширина",
  "Вес",
  "Материалы",
  "Монтаж",
  "Назначение",
  "Цвет",
];

function normalizeHeader(value) {
  return String(value || "").trim();
}

function remapRow(oldHeaders, oldRow, targetHeaders) {
  const map = new Map();
  oldHeaders.forEach((h, i) => map.set(normalizeHeader(h), oldRow[i] ?? ""));
  return targetHeaders.map((h) => map.get(h) ?? "");
}

async function main() {
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
  const sheets = google.sheets({ version: "v4", auth });

  const current = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET}!A1:ZZ1000`,
  });
  const rows = current.data.values || [];
  const oldHeaders = (rows[0] || []).map(normalizeHeader);
  const dataRows = rows.slice(1);

  const missing = TARGET_HEADERS.filter((h) => !oldHeaders.includes(h));
  const remapped = dataRows.map((row) => remapRow(oldHeaders, row, TARGET_HEADERS));
  const output = [TARGET_HEADERS, ...remapped];

  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${SHEET}!A1:${colLetter(TARGET_HEADERS.length)}${output.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values: output },
  });

  console.log("OK: колонки обновлены на листе products");
  console.log("Было колонок:", oldHeaders.length);
  console.log("Стало колонок:", TARGET_HEADERS.length);
  if (missing.length) {
    console.log("Добавлены новые колонки:");
    missing.forEach((c) => console.log("  +", c));
  } else {
    console.log("Новых колонок не требовалось.");
  }
  console.log("");
  console.log("Из старого kppdf:", ADDED_FROM_KPPDF.join(", "));
  console.log("Из kppdf-3.0:", ADDED_FROM_KPPDF_3.join(", "));
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

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
