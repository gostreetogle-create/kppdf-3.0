#!/usr/bin/env node
/**
 * Нормализация колонок «Категория» и «Подкатегория» в Google Sheets (лист products).
 * Принудительно перезаписывает значения для всех строк.
 *
 * npm run normalize-categories
 * npm run normalize-categories -- --dry-run
 * npm run normalize-categories -- --report-only
 * npm run normalize-categories -- --update-sources
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { google } = require("googleapis");
const { classifyProduct } = require("./classify-product-category");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const DRY_RUN = process.argv.includes("--dry-run");
const REPORT_ONLY = process.argv.includes("--report-only");
const UPDATE_SOURCES = process.argv.includes("--update-sources");
const SHEET = "products";

const TOVARY_DIR =
  process.env.TOVARY_SOURCES_DIR?.trim() ||
  "D:/invSportiN/Сайт/Исходники для сайта crm/ТОВАРЫ";
const CSV_FILE = "Товары для КП_kp-media-urls.csv";
const JSON_FILE = "bulk-trade-goods-data.json";

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

function normalizeSku(value) {
  return String(value || "")
    .trim()
    .replace(/^'/, "")
    .toLowerCase();
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

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

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

function serializeCsvRow(fields) {
  return fields
    .map((f) => {
      const s = String(f ?? "");
      if (/[;"\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    })
    .join(";");
}

function updateLocalSources(classifications) {
  const bySku = new Map(classifications.map((c) => [normalizeSku(c.sku), c]));

  const jsonPath = path.join(TOVARY_DIR, JSON_FILE);
  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    let updated = 0;
    for (const item of data.items || []) {
      const key = normalizeSku(item.code);
      const cls = bySku.get(key);
      if (!cls) continue;
      item.category = cls.category;
      item.subcategory = cls.subcategory;
      updated += 1;
    }
    fs.writeFileSync(jsonPath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    console.log(`JSON: обновлено ${updated} позиций → ${jsonPath}`);
  }

  const csvPath = path.join(TOVARY_DIR, CSV_FILE);
  if (fs.existsSync(csvPath)) {
    const table = parseSemicolonCsv(fs.readFileSync(csvPath, "utf8"));
    const headers = table[0].map((h) => String(h).trim());
    let catCol = headers.findIndex((h) => h.toLowerCase().includes("категор"));
    let subCol = headers.indexOf("Подкатегория");

    if (subCol < 0) {
      headers.splice(catCol + 1, 0, "Подкатегория");
      subCol = catCol + 1;
      catCol = headers.findIndex((h) => h.toLowerCase().includes("категор"));
      for (let i = 1; i < table.length; i++) {
        table[i].splice(catCol + 1, 0, "");
      }
    }

    const codeCol = headers.findIndex((h) => h.toLowerCase().includes("артикул"));
    let updated = 0;
    const out = [headers];
    for (const row of table.slice(1)) {
      const full = [...row];
      while (full.length < headers.length) full.push("");
      const key = normalizeSku(full[codeCol]);
      const cls = bySku.get(key);
      if (cls) {
        full[catCol] = cls.category;
        full[subCol] = cls.subcategory;
        updated += 1;
      }
      out.push(full);
    }
    const csvContent = `${out.map(serializeCsvRow).join("\n")}\n`;
    fs.writeFileSync(csvPath, csvContent, "utf8");
    console.log(`CSV: обновлено ${updated} позиций → ${csvPath}`);
  }
}

async function main() {
  console.log("=== Нормализация категорий товаров ===\n");

  const { sheets, sheetId } = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET}!A1:ZZ5000`,
  });

  const table = response.data.values || [];
  if (table.length < 2) throw new Error("Лист products пуст");

  const headers = table[0].map((h) => String(h || "").trim());
  const skuCol = headers.indexOf("Артикул");
  const nameCol = headers.indexOf("Наименование");
  const descCol = headers.indexOf("Описание");
  const unitCol = headers.indexOf("Ед. изм.");
  const catCol = headers.indexOf("Категория");
  const subCol = headers.indexOf("Подкатегория");
  const updatedCol = headers.indexOf("updatedAt");

  if (skuCol < 0 || nameCol < 0 || catCol < 0 || subCol < 0) {
    throw new Error("Нет колонок Артикул, Наименование, Категория или Подкатегория");
  }

  const today = new Date().toISOString().slice(0, 10);
  const stats = {
    total: 0,
    changed: 0,
    unchanged: 0,
    sameCategorySubcategory: 0,
    distribution: {},
    samples: [],
    classifications: [],
  };

  const outputRows = table.slice(1).map((row) => [...row]);

  for (let i = 0; i < outputRows.length; i++) {
    const row = outputRows[i];
    while (row.length < headers.length) row.push("");

    const sku = String(row[skuCol] || "").trim();
    const name = String(row[nameCol] || "").trim();
    if (!sku || !name) continue;

    stats.total += 1;
    const oldCat = String(row[catCol] || "").trim();
    const oldSub = String(row[subCol] || "").trim();
    const legacyCategory = oldCat.startsWith("/kp-media") ? "" : oldCat;

    const result = classifyProduct({
      sku,
      name,
      description: descCol >= 0 ? row[descCol] : "",
      unit: unitCol >= 0 ? row[unitCol] : "",
      legacyCategory,
    });

    const distKey = `${result.category} → ${result.subcategory}`;
    stats.distribution[distKey] = (stats.distribution[distKey] || 0) + 1;

    if (result.category === result.subcategory) {
      stats.sameCategorySubcategory += 1;
    }

    const changed = oldCat !== result.category || oldSub !== result.subcategory;
    if (changed) stats.changed += 1;
    else stats.unchanged += 1;

    row[catCol] = result.category;
    row[subCol] = result.subcategory;
    if (updatedCol >= 0) row[updatedCol] = today;

    stats.classifications.push({
      sku,
      name,
      oldCategory: oldCat,
      oldSubcategory: oldSub,
      category: result.category,
      subcategory: result.subcategory,
      ruleId: result.ruleId,
      changed,
    });

    if (stats.samples.length < 20 && changed) {
      stats.samples.push({
        sku,
        from: `${oldCat} / ${oldSub}`,
        to: `${result.category} / ${result.subcategory}`,
        ruleId: result.ruleId,
      });
    }
  }

  const reportPath = path.resolve(__dirname, "..", "output", "normalize-categories-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  const report = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    reportOnly: REPORT_ONLY,
    stats: {
      total: stats.total,
      changed: stats.changed,
      unchanged: stats.unchanged,
      sameCategorySubcategory: stats.sameCategorySubcategory,
      distribution: stats.distribution,
    },
    samples: stats.samples,
  };
  fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");

  console.log(`Строк обработано: ${stats.total}`);
  console.log(`Изменено: ${stats.changed}, без изменений: ${stats.unchanged}`);
  console.log(`Категория = Подкатегория (допустимо): ${stats.sameCategorySubcategory}`);
  console.log("\nРаспределение:");
  Object.entries(stats.distribution)
    .sort((a, b) => b[1] - a[1])
    .forEach(([k, v]) => console.log(`  ${v}\t${k}`));

  if (stats.samples.length) {
    console.log("\nПримеры изменений:");
    stats.samples.forEach((s) =>
      console.log(`  ${s.sku}: ${s.from} → ${s.to} [${s.ruleId}]`),
    );
  }

  if (REPORT_ONLY) {
    console.log(`\nREPORT-ONLY — отчёт: ${reportPath}`);
    return;
  }

  if (!DRY_RUN && stats.changed > 0) {
    const output = [headers, ...outputRows];
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET}!A1:${colLetter(headers.length)}${output.length}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: output },
    });
    console.log(`\nЗаписано в Google Sheets (${stats.changed} строк изменено)`);
  } else if (DRY_RUN) {
    console.log("\nDRY-RUN — в таблицу не писали");
  }

  if (UPDATE_SOURCES || !DRY_RUN) {
    updateLocalSources(stats.classifications);
  }

  console.log(`Отчёт: ${reportPath}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
