#!/usr/bin/env node
/**
 * Убирает дубли цвета из колонки «Описание», если цвет уже указан в «Цвет».
 *
 * npm run strip-desc-colors
 * npm run strip-desc-colors -- --dry-run
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { google } = require("googleapis");
const { stripColorsFromDescription } = require("./strip-description-colors");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const DRY_RUN = process.argv.includes("--dry-run");
const SHEET = "products";

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

function isEmpty(value) {
  return value == null || String(value).trim() === "";
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
  console.log("=== Удаление дублей цвета из «Описание» ===\n");

  const { sheets, sheetId } = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET}!A1:ZZ5000`,
  });

  const table = response.data.values || [];
  if (table.length < 2) throw new Error("Лист products пуст");

  const headers = table[0].map((h) => String(h || "").trim());
  const col = (name) => headers.indexOf(name);
  const descCol = col("Описание");
  const colorCol = col("Цвет");
  const skuCol = col("Артикул");
  const updatedCol = col("updatedAt");

  if (descCol < 0) throw new Error('Нет колонки "Описание"');
  if (colorCol < 0) throw new Error('Нет колонки "Цвет"');

  const today = new Date().toISOString().slice(0, 10);
  const stats = { total: 0, changed: 0, skipped: 0, cleared: 0, samples: [] };
  const outputRows = table.slice(1).map((row) => [...row]);

  for (let i = 0; i < outputRows.length; i++) {
    const row = outputRows[i];
    while (row.length < headers.length) row.push("");

    const sku = String(row[skuCol] || "").trim();
    const existingDesc = String(row[descCol] || "").trim();
    const color = String(row[colorCol] || "").trim();
    if (!sku || isEmpty(existingDesc) || isEmpty(color)) continue;

    stats.total += 1;
    const cleaned = stripColorsFromDescription(existingDesc, color);
    if (cleaned === existingDesc) {
      stats.skipped += 1;
      continue;
    }

    row[descCol] = cleaned;
    if (updatedCol >= 0) row[updatedCol] = today;
    stats.changed += 1;
    if (!cleaned) stats.cleared += 1;

    if (stats.samples.length < 15) {
      stats.samples.push({
        sku,
        color,
        before: existingDesc.slice(0, 120),
        after: cleaned.slice(0, 120),
      });
    }
  }

  const reportPath = path.resolve(__dirname, "..", "output", "strip-description-colors-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(
    reportPath,
    `${JSON.stringify({ timestamp: new Date().toISOString(), dryRun: DRY_RUN, stats }, null, 2)}\n`,
    "utf8",
  );

  console.log(`Строк с цветом и описанием: ${stats.total}`);
  console.log(`Изменено: ${stats.changed}, без изменений: ${stats.skipped}, описание очищено: ${stats.cleared}`);

  if (stats.samples.length) {
    console.log("\nПримеры:");
    stats.samples.forEach((s) => {
      console.log(`  ${s.sku} [${s.color}]`);
      console.log(`    было: ${s.before}${s.before.length >= 120 ? "…" : ""}`);
      console.log(`    стало: ${s.after || "(пусто)"}${s.after.length >= 120 ? "…" : ""}`);
    });
  }

  if (!DRY_RUN && stats.changed > 0) {
    const output = [headers, ...outputRows];
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET}!A1:${colLetter(headers.length)}${output.length}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: output },
    });
    console.log(`\nЗаписано в Google Sheets (${stats.changed} строк)`);
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
