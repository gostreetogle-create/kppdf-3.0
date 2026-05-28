#!/usr/bin/env node
/**
 * Загружает фото в Google Drive и вставляет превью в таблицу через =IMAGE(...)
 *
 * npm run embed-photos
 * npm run embed-photos -- --limit 20
 * npm run embed-photos -- --dry-run
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { google } = require("googleapis");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const DRY_RUN = process.argv.includes("--dry-run");
const limitArg = process.argv.find((a) => a.startsWith("--limit="));
const LIMIT = limitArg ? Number(limitArg.split("=")[1]) : 0;

const SHEET = "products";
const PREVIEW_COL = "Фото превью";
const MEDIA_DIR =
  process.env.MEDIA_PRODUCTS_DIR?.trim() ||
  "D:/invSportiN/Сайт/media/products";
const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID?.trim() || "";
const PUBLIC_BASE = (process.env.MEDIA_PUBLIC_BASE_URL || "").trim().replace(/\/$/, "");
const CACHE_PATH = path.resolve(__dirname, "..", "output", "drive-photo-cache.json");

const IMAGE_EXT = /\.(png|jpe?g|webp|gif)$/i;
const MIME = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

function normalizeSku(value) {
  return String(value || "")
    .trim()
    .replace(/^'/, "")
    .toLowerCase();
}

function loadCache() {
  if (!fs.existsSync(CACHE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(CACHE_PATH, "utf8"));
  } catch {
    return {};
  }
}

function saveCache(cache) {
  fs.mkdirSync(path.dirname(CACHE_PATH), { recursive: true });
  fs.writeFileSync(CACHE_PATH, JSON.stringify(cache, null, 2), "utf8");
}

function findLocalFile(sku, photoUrl) {
  if (photoUrl) {
    const name = path.basename(String(photoUrl).replace(/^products\//i, ""));
    const direct = path.join(MEDIA_DIR, name);
    if (fs.existsSync(direct)) return direct;
  }
  for (const ext of [".png", ".jpg", ".jpeg", ".webp"]) {
    const p = path.join(MEDIA_DIR, `${sku}${ext}`);
    if (fs.existsSync(p)) return p;
  }
  const all = fs.readdirSync(MEDIA_DIR).filter((f) => IMAGE_EXT.test(f));
  const match = all.find((f) => normalizeSku(path.basename(f, path.extname(f))) === normalizeSku(sku));
  return match ? path.join(MEDIA_DIR, match) : null;
}

function driveImageUrl(fileId) {
  return `https://drive.google.com/uc?export=view&id=${fileId}`;
}

function imageFormula(fileId) {
  return `=IMAGE("${driveImageUrl(fileId)}", 1)`;
}

function imageFormulaFromPublicUrl(photoUrl) {
  const url = photoUrl.startsWith("http")
    ? photoUrl
    : `${PUBLIC_BASE}/${String(photoUrl).replace(/^\\//, "")}`;
  return `=IMAGE("${url}", 1)`;
}

async function getClients() {
  const sheetId = process.env.GOOGLE_SHEET_ID?.trim();
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim();
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!sheetId || !email || !privateKey) {
    throw new Error("Заполните .env (GOOGLE_SHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY)");
  }

  const auth = new google.auth.JWT({
    email,
    key: privateKey,
    scopes: [
      "https://www.googleapis.com/auth/spreadsheets",
      "https://www.googleapis.com/auth/drive.file",
    ],
  });
  await auth.authorize();

  return {
    sheetId,
    sheets: google.sheets({ version: "v4", auth }),
    drive: google.drive({ version: "v3", auth }),
  };
}

async function uploadToDrive(drive, localPath, sku, cache) {
  const key = normalizeSku(sku);
  if (cache[key]?.fileId) return cache[key].fileId;

  const ext = path.extname(localPath).toLowerCase();
  const mime = MIME[ext] || "application/octet-stream";
  const fileName = path.basename(localPath);

  const body = {
    name: fileName,
    description: `Product photo ${sku}`,
  };
  if (DRIVE_FOLDER_ID) body.parents = [DRIVE_FOLDER_ID];

  const created = await drive.files.create({
    requestBody: body,
    media: { mimeType: mime, body: fs.createReadStream(localPath) },
    fields: "id",
  });

  const fileId = created.data.id;
  await drive.permissions.create({
    fileId,
    requestBody: { type: "anyone", role: "reader" },
  });

  cache[key] = { fileId, fileName, uploadedAt: new Date().toISOString() };
  return fileId;
}

function ensurePreviewColumn(headers) {
  const idx = headers.indexOf(PREVIEW_COL);
  if (idx !== -1) return { headers, previewCol: idx };
  const photoUrlIdx = headers.indexOf("Фото URL");
  const insertAt = photoUrlIdx !== -1 ? photoUrlIdx + 1 : headers.length;
  const next = [...headers];
  next.splice(insertAt, 0, PREVIEW_COL);
  return { headers: next, previewCol: insertAt };
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
  const { sheetId, sheets, drive } = await getClients();
  const cache = loadCache();

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET}!A1:ZZ5000`,
  });
  const rows = response.data.values || [];
  if (rows.length === 0) throw new Error("Лист products пуст");

  let { headers, previewCol } = ensurePreviewColumn(rows[0].map((h) => String(h || "").trim()));
  const skuCol = headers.indexOf("Артикул");
  const photoUrlCol = headers.indexOf("Фото URL");
  if (skuCol === -1) throw new Error('Нет колонки "Артикул"');

  const dataRows = rows.slice(1).map((row) => {
    const copy = [...row];
    while (copy.length < headers.length) copy.push("");
    return copy;
  });

  let processed = 0;
  let embedded = 0;
  let skipped = 0;

  for (let i = 0; i < dataRows.length; i++) {
    if (LIMIT > 0 && processed >= LIMIT) break;

    const row = dataRows[i];
    const sku = String(row[skuCol] || "").trim().replace(/^'/, "");
    if (!sku) continue;

    const photoUrl = photoUrlCol !== -1 ? row[photoUrlCol] : "";
    const localPath = findLocalFile(sku, photoUrl);
    if (!localPath) {
      skipped += 1;
      continue;
    }

    processed += 1;

    if (PUBLIC_BASE && photoUrl) {
      row[previewCol] = imageFormulaFromPublicUrl(photoUrl);
      dataRows[i] = row;
      embedded += 1;
      continue;
    }

    let fileId = cache[normalizeSku(sku)]?.fileId;

    if (!DRY_RUN) {
      fileId = await uploadToDrive(drive, localPath, sku, cache);
      if (processed % 25 === 0) saveCache(cache);
    } else if (!fileId) {
      fileId = "DRY_RUN_FILE_ID";
    }

    row[previewCol] = imageFormula(fileId);
    dataRows[i] = row;
    embedded += 1;
  }

  if (!DRY_RUN) {
    saveCache(cache);
    const output = [headers, ...dataRows];
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET}!A1:${colLetter(headers.length)}${output.length}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: output },
    });
  }

  console.log(DRY_RUN ? "DRY-RUN" : "Готово");
  console.log(`  Превью вставлено: ${embedded}`);
  console.log(`  Без локального файла: ${skipped}`);
  console.log(`  Колонка: "${PREVIEW_COL}"`);
  if (LIMIT > 0) console.log(`  Лимит: ${LIMIT} (уберите --limit для всех)`);
  console.log("");
  console.log("Если картинки не видны — включите Google Drive API в Google Cloud Console.");
}

main().catch((err) => {
  const msg = String(err.message || err);
  if (msg.includes("Google Drive API has not been used") || msg.includes("drive.googleapis.com")) {
    console.error("Нужно включить Google Drive API в Google Cloud Console:");
    console.error("https://console.cloud.google.com/apis/library/drive.googleapis.com");
    console.error("");
    console.error("После включения подождите 1–2 минуты и снова: npm run embed-photos");
    console.error("");
    console.error("Альтернатива: если фото доступны по HTTP, задайте MEDIA_PUBLIC_BASE_URL в .env");
  } else {
    console.error(msg);
  }
  process.exit(1);
});
