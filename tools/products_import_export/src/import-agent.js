#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
const pdfParse = require("pdf-parse");
const dotenv = require("dotenv");
const { google } = require("googleapis");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const ROOT = path.resolve(__dirname, "..");
const INPUT_DIR = path.join(ROOT, "входные данные");
const ARCHIVE_DIR = path.join(ROOT, "архив");
const OUTPUT_DIR = path.join(ROOT, "output");
const MAPPING_PATH = path.join(ROOT, "config", "mapping.json");
const DRY_RUN = process.argv.includes("--dry-run");

function ensureDirs() {
  [INPUT_DIR, ARCHIVE_DIR, OUTPUT_DIR].forEach((dir) => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`Missing env: ${name}`);
  }
  return value.trim();
}

function loadMapping() {
  if (!fs.existsSync(MAPPING_PATH)) {
    throw new Error(
      `mapping.json not found: ${MAPPING_PATH}. Copy config/mapping.example.json -> config/mapping.json`
    );
  }
  return JSON.parse(fs.readFileSync(MAPPING_PATH, "utf8"));
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function normalizeValue(value) {
  if (value == null) return "";
  return String(value).trim();
}

function parseExcel(filePath) {
  const wb = xlsx.readFile(filePath);
  const results = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    const rows = xlsx.utils.sheet_to_json(ws, { defval: "" });
    rows.forEach((row) => results.push(row));
  }
  return results;
}

async function parsePdf(filePath, mapping) {
  const buffer = fs.readFileSync(filePath);
  const parsed = await pdfParse(buffer);
  const text = parsed.text || "";
  const row = {};
  for (const rule of mapping.pdfPatterns || []) {
    const regex = new RegExp(rule.regex, "im");
    const match = text.match(regex);
    if (match && match[1]) {
      row[rule.targetAlias] = match[1].trim();
    }
  }
  return Object.keys(row).length > 0 ? [row] : [];
}

function buildAliasMap(mapping) {
  const aliasMap = new Map();
  const appendAliases = (sheetColumn, aliases) => {
    aliases.forEach((alias) => aliasMap.set(normalizeKey(alias), sheetColumn));
  };

  appendAliases(mapping.match.sheetColumn, mapping.match.inputAliases || []);
  mapping.updates.forEach((field) => appendAliases(field.sheetColumn, field.inputAliases || []));
  return aliasMap;
}

function flattenInputRows(rawRows, aliasMap) {
  return rawRows.map((raw) => {
    const normalized = {};
    for (const [key, value] of Object.entries(raw)) {
      const mapped = aliasMap.get(normalizeKey(key));
      if (!mapped) continue;
      normalized[mapped] = normalizeValue(value);
    }
    return normalized;
  });
}

async function getSheetsClient() {
  const email = requireEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = requireEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");
  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  await auth.authorize();
  return google.sheets({ version: "v4", auth });
}

async function getSheetData(sheets, sheetId, sheetName) {
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${sheetName}!A:ZZ`,
  });
  return response.data.values || [];
}

function indexSheetRows(table) {
  if (table.length === 0) return { headers: [], rows: [] };
  const headers = table[0].map((h) => normalizeValue(h));
  const rows = table.slice(1);
  return { headers, rows };
}

function colToA1(colIndex) {
  let n = colIndex + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function buildUpdateOps(mapping, headers, sheetRows, inputRows) {
  const matchCol = mapping.match.sheetColumn;
  const matchIdx = headers.indexOf(matchCol);
  if (matchIdx === -1) throw new Error(`Sheet column not found: ${matchCol}`);

  const updateFields = mapping.updates.map((u) => u.sheetColumn);
  const fieldIndexes = Object.fromEntries(
    updateFields.map((field) => [field, headers.indexOf(field)])
  );
  for (const [field, idx] of Object.entries(fieldIndexes)) {
    if (idx === -1) throw new Error(`Sheet column not found: ${field}`);
  }

  const byKey = new Map();
  sheetRows.forEach((row, i) => {
    const key = normalizeKey(row[matchIdx] || "");
    if (key) byKey.set(key, { row, rowNumber: i + 2 });
  });

  const ops = [];
  const report = { updated: 0, notFound: 0, skipped: 0 };

  for (const input of inputRows) {
    const key = normalizeKey(input[matchCol] || "");
    if (!key) {
      report.skipped += 1;
      continue;
    }
    const target = byKey.get(key);
    if (!target) {
      report.notFound += 1;
      continue;
    }

    for (const field of updateFields) {
      const newValue = normalizeValue(input[field] || "");
      if (!newValue) continue;
      const colIdx = fieldIndexes[field];
      const oldValue = normalizeValue(target.row[colIdx] || "");
      if (oldValue === newValue) continue;
      const cell = `${colToA1(colIdx)}${target.rowNumber}`;
      ops.push({ range: `${mapping.sheetName}!${cell}`, values: [[newValue]] });
      report.updated += 1;
    }
  }

  return { ops, report };
}

async function applyUpdates(sheets, sheetId, ops) {
  if (ops.length === 0) return;
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: sheetId,
    requestBody: {
      valueInputOption: "USER_ENTERED",
      data: ops,
    },
  });
}

function writeRunReport(fileName, report, ops, errors) {
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const reportPath = path.join(OUTPUT_DIR, `${ts}-${fileName}.json`);
  const payload = {
    timestamp: new Date().toISOString(),
    file: fileName,
    dryRun: DRY_RUN,
    report,
    updatesCount: ops.length,
    errors,
  };
  fs.writeFileSync(reportPath, JSON.stringify(payload, null, 2), "utf8");
}

function archiveFile(filePath) {
  const base = path.basename(filePath);
  const ts = new Date().toISOString().replace(/[:.]/g, "-");
  const archived = path.join(ARCHIVE_DIR, `${ts}__${base}`);
  fs.renameSync(filePath, archived);
}

async function processFile(filePath, mapping, sheets, sheetId) {
  const ext = path.extname(filePath).toLowerCase();
  const aliasMap = buildAliasMap(mapping);
  const errors = [];

  let rawRows = [];
  if (ext === ".xlsx" || ext === ".xls") {
    rawRows = parseExcel(filePath);
  } else if (ext === ".pdf") {
    rawRows = await parsePdf(filePath, mapping);
  } else {
    return;
  }

  const inputRows = flattenInputRows(rawRows, aliasMap);
  const table = await getSheetData(sheets, sheetId, mapping.sheetName);
  const { headers, rows } = indexSheetRows(table);
  const { ops, report } = buildUpdateOps(mapping, headers, rows, inputRows);

  try {
    if (!DRY_RUN) {
      await applyUpdates(sheets, sheetId, ops);
    }
  } catch (err) {
    errors.push(String(err.message || err));
  }

  writeRunReport(path.basename(filePath), report, ops, errors);
  // Requirement: after using input file, move to archive.
  archiveFile(filePath);
}

async function main() {
  ensureDirs();
  const mapping = loadMapping();
  const sheetId = requireEnv("GOOGLE_SHEET_ID");
  const sheets = await getSheetsClient();

  const files = fs
    .readdirSync(INPUT_DIR)
    .map((name) => path.join(INPUT_DIR, name))
    .filter((p) => {
      const ext = path.extname(p).toLowerCase();
      return [".xlsx", ".xls", ".pdf"].includes(ext);
    });

  if (files.length === 0) {
    console.log("No input files found.");
    return;
  }

  for (const filePath of files) {
    try {
      await processFile(filePath, mapping, sheets, sheetId);
      console.log(`Processed: ${path.basename(filePath)}`);
    } catch (err) {
      console.error(`Failed: ${path.basename(filePath)} -> ${err.message}`);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
