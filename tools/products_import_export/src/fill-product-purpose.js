#!/usr/bin/env node
/**
 * Заполнение колонки «Назначение» в Google Sheets (лист products).
 * Тексты для будущих паспортов изделий: «Предназначено для …».
 *
 * npm run fill-purpose
 * npm run fill-purpose -- --dry-run
 * npm run fill-purpose -- --force
 */
const fs = require("fs");
const path = require("path");
const dotenv = require("dotenv");
const { google } = require("googleapis");

dotenv.config({ path: path.resolve(__dirname, "..", ".env") });

const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");
const SHEET = "products";

const templates = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, "..", "config", "purpose-templates.json"), "utf8"),
);

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

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function trimPurpose(text, maxLen = 280) {
  const cleaned = String(text || "")
    .trim()
    .replace(/\s+/g, " ");
  if (cleaned.length <= maxLen) return cleaned;
  const cut = cleaned.slice(0, maxLen);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 80 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

function finalizePurpose(clause) {
  const normalized = String(clause || "")
    .trim()
    .replace(/^для\s+/i, "")
    .replace(/[.…]+$/g, "")
    .trim();
  return `${templates.prefix} ${normalized}.`;
}

function extractPurposeFromDescription(name, description) {
  const rawDesc = String(description || "").trim();
  const n = normalizeText(name);
  if (!rawDesc) {
    if (/рукоход/.test(n) && /гт0|гимнастическ/.test(n)) {
      return "выполнения упражнений на рукоходе в рамках нормативов комплекса ГТО";
    }
    if (/шведск.*стенк/.test(n)) {
      return "выполнения упражнений на шведской стенке в рамках нормативов комплекса ГТО";
    }
    if (/разнохват.*турник|турник.*разнохват/.test(n)) {
      return "выполнения испытаний на перекладине с разными хватами в рамках комплекса ГТО";
    }
    if (/п-образн.*рукоход/.test(n)) {
      return "выполнения упражнений на рукоходе в рамках нормативов комплекса ГТО";
    }
    return null;
  }

  if (/^для\s/i.test(rawDesc)) {
    const isGtoClause = /испытани|норматив|комплекс.*гто/i.test(rawDesc);
    const hasSpecs = /размер|мм\b|кг\b|габарит|дхшхв|вес\b/i.test(rawDesc);
    if (hasSpecs && !isGtoClause) {
      if (/^для\s+школьников/i.test(rawDesc)) {
        return "занятий физической культурой и преодоления препятствий на спортивной площадке";
      }
      return null;
    }
    return trimPurpose(rawDesc);
  }

  if (/всероссийск|готов к труду и обороне/i.test(rawDesc)) {
    const clause = rawDesc.replace(/^всероссийского/i, "Всероссийского");
    return `информирования о нормативах испытаний ${clause}`;
  }

  if (/ограниченн.*возможност|инвалид/i.test(rawDesc) || /инвалид|ограниченн.*возможност/i.test(n)) {
    if (/мишен|метани/i.test(n)) {
      return "выполнения испытаний по метанию в цель лицами с ограниченными возможностями здоровья в рамках комплекса ГТО";
    }
    if (/брусь/i.test(n)) {
      return "выполнения упражнений на брусьях лицами с ограниченными возможностями здоровья в рамках комплекса ГТО";
    }
    if (/рукоход|кольц|аксессуар/i.test(n + " " + rawDesc)) {
      return "выполнения упражнений на рукоходе, в том числе лицами с ограниченными возможностями здоровья";
    }
    return "выполнения испытаний комплекса ГТО лицами с ограниченными возможностями здоровья";
  }

  const lowerStart = /^[a-zа-яё]/i.test(rawDesc) && rawDesc[0] === rawDesc[0].toLowerCase();
  if (lowerStart) {
    if (/^пресса$/i.test(rawDesc.trim()) && /плечевого пояса/i.test(n)) {
      return "тренировки мышц верхнего плечевого пояса и пресса при подготовке к нормативам ГТО";
    }
    if (/аксессуар|кольц|рукоятк/i.test(rawDesc) && /рукоход/i.test(n)) {
      return "выполнения упражнений на рукоходе с использованием подвижных колец, в том числе лицами с ограниченными возможностями здоровья";
    }
    if (/колёсах|колесах|мобильн/i.test(rawDesc)) {
      return "работы судей и организаторов соревнований на спортивной площадке";
    }
  }

  if (/ворс|искусственн/i.test(rawDesc) || /искусственн.*трав/i.test(n)) {
    return "устройства покрытия спортивных площадок из искусственной травы с амортизацией и стабилизацией ворса";
  }
  if (/резинов.*крошк|полиуретан|бесшовн|укладк/i.test(rawDesc)) {
    return "устройства безопасного бесшовного или модульного резинового покрытия спортивных площадок";
  }
  if (/окрашенн.*крошк|epdm/i.test(rawDesc) || /epdm|геопластик/i.test(n)) {
    return "устройства декоративно-защитного покрытия из резиновой крошки на спортивных и детских площадках";
  }

  if (/порошков.*краск|оцинков|лиственниц|мрамор|габарит/i.test(rawDesc)) {
    if (/урн/i.test(n)) return "сбора мусора и поддержания чистоты на благоустроенных территориях";
    if (/скам|сиденье|шезлонг|лежак/i.test(n)) {
      return "отдыха посетителей на благоустроенных территориях";
    }
  }

  return null;
}

function buildPurpose({ name, description, category, subcategory }) {
  const text = normalizeText(`${name} ${description}`);

  const fromDescription = extractPurposeFromDescription(name, description);
  if (fromDescription) {
    return finalizePurpose(fromDescription);
  }

  for (const rule of templates.nameOverrides || []) {
    if (new RegExp(rule.pattern, "i").test(text)) {
      return finalizePurpose(rule.text);
    }
  }

  const key = `${category}|${subcategory}`;
  if (templates.pairTemplates[key]) {
    return finalizePurpose(templates.pairTemplates[key]);
  }

  const fallback = templates.categoryFallback[category];
  if (fallback) {
    return finalizePurpose(fallback);
  }

  return finalizePurpose("эксплуатации по назначению изделия");
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
  console.log("=== Заполнение «Назначение» для паспортов ===\n");

  const { sheets, sheetId } = await getSheetsClient();
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `${SHEET}!A1:ZZ5000`,
  });

  const table = response.data.values || [];
  if (table.length < 2) throw new Error("Лист products пуст");

  const headers = table[0].map((h) => String(h || "").trim());
  const col = (name) => headers.indexOf(name);
  const purposeCol = col("Назначение");
  const updatedCol = col("updatedAt");

  if (purposeCol < 0) throw new Error('Нет колонки "Назначение"');

  const today = new Date().toISOString().slice(0, 10);
  const stats = { total: 0, updated: 0, skipped: 0, samples: [] };
  const outputRows = table.slice(1).map((row) => [...row]);

  for (let i = 0; i < outputRows.length; i++) {
    const row = outputRows[i];
    while (row.length < headers.length) row.push("");

    const name = String(row[col("Наименование")] || "").trim();
    const sku = String(row[col("Артикул")] || "").trim();
    if (!name || !sku) continue;

    stats.total += 1;
    const existing = String(row[purposeCol] || "").trim();
    if (!isEmpty(existing) && !FORCE) {
      stats.skipped += 1;
      continue;
    }

    const purpose = buildPurpose({
      name,
      description: String(row[col("Описание")] || ""),
      category: String(row[col("Категория")] || ""),
      subcategory: String(row[col("Подкатегория")] || ""),
    });

    if (existing === purpose) {
      stats.skipped += 1;
      continue;
    }

    row[purposeCol] = purpose;
    if (updatedCol >= 0) row[updatedCol] = today;
    stats.updated += 1;

    if (stats.samples.length < 15) {
      stats.samples.push({ sku, name: name.slice(0, 60), purpose });
    }
  }

  const reportPath = path.resolve(__dirname, "..", "output", "fill-purpose-report.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });
  fs.writeFileSync(
    reportPath,
    `${JSON.stringify({ timestamp: new Date().toISOString(), dryRun: DRY_RUN, force: FORCE, stats }, null, 2)}\n`,
    "utf8",
  );

  console.log(`Строк: ${stats.total}, обновлено: ${stats.updated}, пропущено: ${stats.skipped}`);
  if (stats.samples.length) {
    console.log("\nПримеры:");
    stats.samples.forEach((s) => console.log(`  ${s.sku}: ${s.purpose}`));
  }

  if (!DRY_RUN && stats.updated > 0) {
    const output = [headers, ...outputRows];
    await sheets.spreadsheets.values.update({
      spreadsheetId: sheetId,
      range: `${SHEET}!A1:${colLetter(headers.length)}${output.length}`,
      valueInputOption: "USER_ENTERED",
      requestBody: { values: output },
    });
    console.log(`\nЗаписано в Google Sheets (${stats.updated} строк)`);
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

module.exports = { buildPurpose, extractPurposeFromDescription };
