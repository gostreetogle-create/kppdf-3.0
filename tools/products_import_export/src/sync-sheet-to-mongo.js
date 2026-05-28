#!/usr/bin/env node
/**
 * Google Sheets (products) → локальная MongoDB KPPDF 3.0.
 * Не меняет код backend/frontend — только upsert в коллекции products/categories.
 *
 * npm run sync-to-mongo
 * npm run sync-to-mongo -- --dry-run
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const { google } = require("googleapis");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const DRY_RUN = process.argv.includes("--dry-run");
const SHEET = "products";
const MONGO_URI = process.env.MONGO_URI?.trim() || "mongodb://localhost:27017/kppdf30";

const KINDS = new Set(["ITEM", "SERVICE", "WORK"]);
const STATUSES = new Set(["active", "draft", "archived"]);

const categorySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    parentId: { type: String, default: null },
    fullPath: { type: String },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "categories" },
);

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: "text" },
    sku: { type: String, unique: true, sparse: true },
    kind: { type: String, enum: ["ITEM", "SERVICE", "WORK"], default: "ITEM" },
    unit: { type: String, default: "шт" },
    categoryId: { type: String },
    status: { type: String, enum: ["active", "draft", "archived"], default: "active" },
    listPrice: { type: Number, default: 0 },
    stockQty: { type: Number, default: 0 },
    description: { type: String },
    height: { type: Number },
    length: { type: Number },
    width: { type: Number },
    weight: { type: Number },
    materials: { type: String },
    installation: { type: String },
    purpose: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true, collection: "products" },
);

const Category =
  mongoose.models.Category || mongoose.model("Category", categorySchema);
const Product =
  mongoose.models.Product || mongoose.model("Product", productSchema);

function normalizeSku(value) {
  return String(value || "")
    .trim()
    .replace(/^'/, "")
    .toLowerCase();
}

function isEmpty(value) {
  return value == null || String(value).trim() === "";
}

function parseNumber(value) {
  if (isEmpty(value)) return undefined;
  const n = Number(String(value).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : undefined;
}

function parseBool(value, fallback = true) {
  if (isEmpty(value)) return fallback;
  const s = String(value).trim().toLowerCase();
  if (["true", "1", "yes", "да"].includes(s)) return true;
  if (["false", "0", "no", "нет"].includes(s)) return false;
  return fallback;
}

function parseKind(value) {
  const k = String(value || "ITEM").trim().toUpperCase();
  return KINDS.has(k) ? k : "ITEM";
}

function parseStatus(value, isActive) {
  const s = String(value || "").trim().toLowerCase();
  if (STATUSES.has(s)) return s;
  return isActive ? "active" : "archived";
}

async function getSheetsClient() {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!sheetId || !email || !privateKey) {
    throw new Error("Заполните GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY в .env");
  }
  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  await auth.authorize();
  return {
    sheets: google.sheets({ version: "v4", auth }),
    sheetId,
  };
}

function indexHeaders(headers) {
  const map = new Map();
  headers.forEach((h, i) => map.set(String(h || "").trim(), i));
  return map;
}

function cell(row, idx) {
  return idx >= 0 ? String(row[idx] ?? "").trim() : "";
}

function sheetRowToProduct(row, col) {
  const sku = cell(row, col.get("Артикул")).replace(/^'/, "");
  const name = cell(row, col.get("Наименование"));
  if (!sku || !name) return null;

  const isActive = parseBool(cell(row, col.get("isActive")), true);
  const categoryName = cell(row, col.get("Категория"));
  const subcategoryName = cell(row, col.get("Подкатегория"));

  return {
    sku,
    categoryName,
    subcategoryName,
    doc: {
      name,
      sku,
      kind: parseKind(cell(row, col.get("Тип"))),
      unit: cell(row, col.get("Ед. изм.")) || "шт",
      status: parseStatus(cell(row, col.get("Статус")), isActive),
      listPrice: parseNumber(cell(row, col.get("Цена"))) ?? 0,
      stockQty: parseNumber(cell(row, col.get("Остаток"))) ?? 0,
      description: cell(row, col.get("Описание")) || undefined,
      height: parseNumber(cell(row, col.get("Высота"))),
      length: parseNumber(cell(row, col.get("Длина"))),
      width: parseNumber(cell(row, col.get("Ширина"))),
      weight: parseNumber(cell(row, col.get("Вес"))),
      materials: cell(row, col.get("Материалы")) || undefined,
      installation: cell(row, col.get("Монтаж")) || undefined,
      purpose: cell(row, col.get("Назначение")) || undefined,
      isActive,
    },
  };
}

function cleanUndefined(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) out[k] = v;
  }
  return out;
}

function mergeFillEmpty(existing, incoming) {
  const patch = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) continue;
    const current = existing[key];
    if (typeof current === "number") {
      if (current === 0 && value !== 0) patch[key] = value;
      continue;
    }
    if (typeof current === "boolean") continue;
    if (isEmpty(current)) patch[key] = value;
  }
  return patch;
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

async function ensureCategory(name, parentId, cache, stats) {
  const trimmed = String(name || "").trim();
  if (!trimmed) return undefined;

  const cacheKey = `${parentId || "root"}::${trimmed.toLowerCase()}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const query = {
    name: new RegExp(`^${escapeRegex(trimmed)}$`, "i"),
    parentId: parentId || null,
  };

  let doc = await Category.findOne(query).lean();
  if (!doc) {
    stats.categoriesCreated += 1;
    if (!DRY_RUN) {
      let fullPath = `/${trimmed}`;
      if (parentId) {
        const parent = await Category.findById(parentId).lean();
        if (parent?.fullPath) fullPath = `${parent.fullPath}/${trimmed}`;
      }
      doc = await Category.create({
        name: trimmed,
        parentId: parentId || null,
        fullPath,
        sortOrder: 100,
        isActive: true,
      });
    } else {
      const fakeId = `dry-${cacheKey}`;
      cache.set(cacheKey, fakeId);
      return fakeId;
    }
  }

  const id = doc._id.toString();
  cache.set(cacheKey, id);
  return id;
}

async function resolveCategoryId(categoryName, subcategoryName, cache, stats) {
  const cat = categoryName.trim();
  const sub = subcategoryName.trim();

  if (!cat && !sub) return undefined;
  if (sub && cat && sub.toLowerCase() !== cat.toLowerCase()) {
    const parentId = await ensureCategory(cat, null, cache, stats);
    return ensureCategory(sub, parentId, cache, stats);
  }
  return ensureCategory(cat || sub, null, cache, stats);
}

async function loadSheetRows() {
  const { sheets, sheetId } = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET}!A1:ZZ5000`,
  });
  const table = response.data.values || [];
  if (table.length < 2) throw new Error(`Лист "${SHEET}" пуст или только заголовок`);

  const headers = table[0].map((h) => String(h || "").trim());
  const col = indexHeaders(headers);
  if (!col.has("Артикул") || !col.has("Наименование")) {
    throw new Error('На листе нет колонок "Артикул" или "Наименование"');
  }

  const rows = [];
  for (const row of table.slice(1)) {
    const parsed = sheetRowToProduct(row, col);
    if (parsed) rows.push(parsed);
  }
  return rows;
}

async function main() {
  console.log("=== Sheets → MongoDB (KPPDF 3.0) ===\n");
  console.log(`MongoDB: ${MONGO_URI}`);
  console.log(DRY_RUN ? "Режим: DRY-RUN\n" : "Режим: запись\n");

  const sheetRows = await loadSheetRows();
  console.log(`Строк в Google Sheets (с артикулом и названием): ${sheetRows.length}`);

  await mongoose.connect(MONGO_URI);

  const beforeCount = await Product.countDocuments();
  console.log(`Товаров в MongoDB до импорта: ${beforeCount}\n`);

  const categoryCache = new Map();
  const stats = {
    inserted: 0,
    updated: 0,
    skipped: 0,
    categoriesCreated: 0,
    errors: [],
  };

  for (const item of sheetRows) {
    try {
      const categoryId = await resolveCategoryId(
        item.categoryName,
        item.subcategoryName,
        categoryCache,
        stats,
      );
      const incoming = cleanUndefined({
        ...item.doc,
        categoryId,
      });

      const existing = await Product.findOne({
        sku: new RegExp(`^${escapeRegex(item.sku)}$`, "i"),
      });

      if (!existing) {
        stats.inserted += 1;
        if (!DRY_RUN) await Product.create(incoming);
        continue;
      }

      const patch = mergeFillEmpty(existing.toObject(), incoming);
      if (categoryId && existing.categoryId !== categoryId) {
        patch.categoryId = categoryId;
      }
      if (Object.keys(patch).length === 0) {
        stats.skipped += 1;
        continue;
      }

      stats.updated += 1;
      if (!DRY_RUN) {
        await Product.updateOne({ _id: existing._id }, { $set: patch });
      }
    } catch (err) {
      stats.errors.push({ sku: item.sku, error: err.message || String(err) });
    }
  }

  const afterCount = DRY_RUN ? beforeCount : await Product.countDocuments();

  const report = {
    timestamp: new Date().toISOString(),
    dryRun: DRY_RUN,
    mongoUri: MONGO_URI,
    sheetRows: sheetRows.length,
    beforeCount,
    afterCount,
    stats,
  };

  const reportPath = path.resolve(__dirname, "..", "output", "sync-sheet-to-mongo-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");

  console.log(DRY_RUN ? "DRY-RUN — в MongoDB не писали" : "Запись завершена");
  console.log(`  Добавлено: ${stats.inserted}`);
  console.log(`  Обновлено (только пустые поля): ${stats.updated}`);
  console.log(`  Без изменений: ${stats.skipped}`);
  console.log(`  Категорий создано: ${stats.categoriesCreated}`);
  console.log(`  Ошибок: ${stats.errors.length}`);
  console.log(`  Товаров в MongoDB: ${beforeCount} → ${afterCount}`);
  console.log(`  Отчёт: ${reportPath}`);

  if (stats.errors.length) {
    console.log("\nПервые ошибки:");
    stats.errors.slice(0, 5).forEach((e) => console.log(`  ${e.sku}: ${e.error}`));
  }

  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error(err.message || err);
  try {
    await mongoose.disconnect();
  } catch {
    /* ignore */
  }
  process.exit(1);
});
