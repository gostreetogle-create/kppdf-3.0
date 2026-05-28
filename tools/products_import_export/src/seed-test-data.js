#!/usr/bin/env node
/**
 * Одноразово: выравнивает заголовки листа products и добавляет тестовые строки.
 */
const path = require("path");
const dotenv = require("dotenv");
const { google } = require("googleapis");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const SHEET = "products";

const HEADERS = [
  "Артикул",
  "Наименование",
  "Тип",
  "Ед. изм.",
  "Категория",
  "Цена",
  "Остаток",
  "Статус",
  "Описание",
  "isActive",
  "createdAt",
  "updatedAt",
];

const TEST_ROWS = [
  [
    "PRD-001",
    "Профиль алюминиевый 20x20",
    "ITEM",
    "шт",
    "Профиль",
    450,
    120,
    "active",
    "Тестовая позиция — импорт",
    "true",
    "2026-05-28",
    "2026-05-28",
  ],
  [
    "PRD-002",
    "Лист стальной 2 мм",
    "ITEM",
    "м2",
    "Металл",
    980,
    45,
    "active",
    "Тестовая позиция — импорт",
    "true",
    "2026-05-28",
    "2026-05-28",
  ],
  [
    "SRV-001",
    "Порошковая покраска",
    "SERVICE",
    "усл",
    "Услуги",
    1500,
    0,
    "draft",
    "Тестовая услуга",
    "true",
    "2026-05-28",
    "2026-05-28",
  ],
  [
    "WRK-001",
    "Сварочные работы",
    "WORK",
    "час",
    "Работы",
    800,
    0,
    "active",
    "Тестовая работа",
    "true",
    "2026-05-28",
    "2026-05-28",
  ],
  [
    "PRD-003",
    "Крепёж комплект М8",
    "ITEM",
    "компл",
    "Комплектующие",
    220,
    300,
    "archived",
    "Архивная тестовая позиция",
    "false",
    "2026-05-28",
    "2026-05-28",
  ],
];

async function main() {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!sheetId || !email || !privateKey) {
    throw new Error("Заполните .env (GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)");
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  await auth.authorize();
  const sheets = google.sheets({ version: "v4", auth });

  const values = [HEADERS, ...TEST_ROWS];
  await sheets.spreadsheets.values.update({
    spreadsheetId: sheetId,
    range: `${SHEET}!A1:L${values.length}`,
    valueInputOption: "USER_ENTERED",
    requestBody: { values },
  });

  console.log(`OK: заголовки исправлены, добавлено ${TEST_ROWS.length} тестовых строк на лист "${SHEET}".`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
