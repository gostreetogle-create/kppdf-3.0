#!/usr/bin/env node
/**
 * Классификация товара → { category, subcategory, ruleId }.
 * Приоритет: артикул → название/описание → legacy CSV-категория → fallback.
 */
const fs = require("fs");
const path = require("path");

const TAXONOMY_PATH = path.resolve(__dirname, "..", "config", "category-taxonomy.json");
const taxonomy = JSON.parse(fs.readFileSync(TAXONOMY_PATH, "utf8"));

const allowedSet = new Set(
  taxonomy.allowedPairs.map((p) => `${p.category}::${p.subcategory}`),
);

function normalizeSku(value) {
  return String(value || "")
    .trim()
    .replace(/^'/, "");
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");
}

function isBarrierNetByUnit(unit) {
  const u = normalizeText(unit);
  return u === "м2" || u === "м²";
}

function matchKeywords(text, keywordMap, fallback) {
  const t = normalizeText(text);
  for (const [subcategory, keywords] of Object.entries(keywordMap)) {
    for (const kw of keywords) {
      const pattern = kw.startsWith("^") ? new RegExp(kw, "i") : new RegExp(kw, "i");
      if (pattern.test(t)) return subcategory;
    }
  }
  return fallback;
}

function defaultSubcategoryFor(category) {
  return taxonomy.defaultSubcategories?.[category] || category;
}

function resolveSubcategory(category, subcategoryHint, name, description, sku) {
  const text = `${name} ${description} ${sku}`;
  if (subcategoryHint) return subcategoryHint;

  if (category === "Воркаут") {
    return matchKeywords(text, taxonomy.workoutSubcategoryKeywords, defaultSubcategoryFor(category));
  }
  if (category === "Малые архитектурные формы") {
    return matchKeywords(text, taxonomy.mafSubcategoryKeywords, defaultSubcategoryFor(category));
  }
  if (category === "Спортивное оборудование") {
    const sport = matchKeywords(text, taxonomy.sportSubcategoryKeywords, null);
    if (sport) return sport;
    if (/^SpW|^МФ/i.test(sku)) return "Минифутбол / Гандбол";
    if (/футбол/i.test(text) && !/мини/i.test(text)) return "Футбол";
    return defaultSubcategoryFor(category);
  }
  if (category === "Прочее") {
    return defaultSubcategoryFor(category);
  }
  return category;
}

function validatePair(category, subcategory) {
  const key = `${category}::${subcategory}`;
  if (allowedSet.has(key)) return { category, subcategory };
  const fallback = taxonomy.allowedPairs.find((p) => p.category === category);
  if (fallback) return { category: fallback.category, subcategory: fallback.subcategory };
  return { category: "Прочее", subcategory: "Крепёж" };
}

function applyRule(rule, name, description, sku) {
  const subcategory = resolveSubcategory(
    rule.category,
    rule.subcategory,
    name,
    description,
    sku,
  );
  const validated = validatePair(rule.category, subcategory);
  return {
    category: validated.category,
    subcategory: validated.subcategory,
    ruleId: rule.id || rule.ruleId,
  };
}

function classifyPrProduct(sku, name, description) {
  const code = normalizeSku(sku);
  const text = normalizeText(`${name} ${description}`);

  for (const rule of taxonomy.prProductRules || []) {
    const re = new RegExp(rule.pattern, "i");
    if (re.test(text) || re.test(normalizeText(name))) {
      return applyRule(rule, name, description, code);
    }
  }

  for (const pat of taxonomy.prSkuTrainerCodes || []) {
    if (new RegExp(pat, "i").test(code)) {
      return applyRule(
        { id: "pr_sku_trainer", category: "Уличные тренажёры", subcategory: "Уличные тренажёры" },
        name,
        description,
        code,
      );
    }
  }

  return applyRule(
    { id: "pr_default_maf", category: "Малые архитектурные формы", subcategory: null },
    name,
    description,
    code,
  );
}

function classifyBySku(sku, name, description, unit) {
  const code = normalizeSku(sku);
  const text = `${name} ${description}`;

  if (/^PR/i.test(code) && !/^PR08/i.test(code)) {
    return classifyPrProduct(code, name, description);
  }

  if (/резинов.*покрыт|резинов\w*\s+плитк|искусственн\w*\s+трав/i.test(text)) {
    return applyRule(
      {
        id: "sku_rubber_coating",
        category: "Резиновое покрытие",
        subcategory: "Резиновое покрытие",
      },
      name,
      description,
      code,
    );
  }

  for (const rule of taxonomy.skuRules) {
    const re = new RegExp(rule.pattern, "i");
    if (re.test(code)) {
      return applyRule(rule, name, description, code);
    }
  }

  if (/^\d+$/.test(code)) {
    if (isBarrierNetByUnit(unit) || /заградительн/i.test(`${name} ${description}`)) {
      return applyRule(
        {
          id: "numeric_barrier_net",
          category: "Сетки заградительные",
          subcategory: "Сетки заградительные",
        },
        name,
        description,
        code,
      );
    }
    if (/^90[357]0$/.test(code)) {
      return applyRule(
        {
          id: "numeric_basketball_net",
          category: "Спортивное оборудование",
          subcategory: "Сетки для ворот",
        },
        name,
        description,
        code,
      );
    }
    if (/^(0[1-5]|06|08)\d{2,4}$/.test(code)) {
      return applyRule(
        {
          id: "numeric_sport_net",
          category: "Спортивное оборудование",
          subcategory: "Сетки для ворот",
        },
        name,
        description,
        code,
      );
    }
  }

  return null;
}

function classifyByName(name, description, sku) {
  const text = normalizeText(`${name} ${description}`);

  for (const rule of taxonomy.nameRules) {
    const re = new RegExp(rule.pattern, "i");
    if (re.test(text)) {
      if (rule.id === "name_football" && /мини|гандбол/i.test(text)) {
        return applyRule(
          { id: "name_minifootball", category: "Спортивное оборудование", subcategory: "Минифутбол / Гандбол" },
          name,
          description,
          sku,
        );
      }
      if (rule.id === "name_football") {
        return applyRule(
          { id: "name_football", category: "Спортивное оборудование", subcategory: "Футбол" },
          name,
          description,
          sku,
        );
      }
      return applyRule(rule, name, description, sku);
    }
  }

  return null;
}

function classifyByLegacy(legacyCategory, name, description, sku) {
  const legacy = String(legacyCategory || "").trim();
  if (!legacy || legacy.startsWith("/kp-media")) return null;

  if (legacy === "Прочее" && /^PR/i.test(sku) && !/^PR08/i.test(sku)) {
    return classifyPrProduct(sku, name, description);
  }

  const rule = taxonomy.legacyCategoryRules[legacy];
  if (!rule) return null;

  return applyRule(
    { id: rule.ruleId, category: rule.category, subcategory: rule.subcategory },
    name,
    description,
    sku,
  );
}

/**
 * @param {{ sku: string, name?: string, description?: string, unit?: string, legacyCategory?: string }} input
 */
function classifyProduct(input) {
  const sku = normalizeSku(input.sku);
  const name = String(input.name || "");
  const description = String(input.description || "");
  const unit = String(input.unit || "");
  const legacyCategory = String(input.legacyCategory || "");

  if (!sku && !name) {
    return { category: "Прочее", subcategory: "Крепёж", ruleId: "empty" };
  }

  const bySku = classifyBySku(sku, name, description, unit);
  if (bySku) return bySku;

  const byName = classifyByName(name, description, sku);
  if (byName) return byName;

  const byLegacy = classifyByLegacy(legacyCategory, name, description, sku);
  if (byLegacy) return byLegacy;

  return { category: "Прочее", subcategory: "Крепёж", ruleId: "fallback" };
}

module.exports = { classifyProduct, classifyPrProduct, taxonomy, validatePair, normalizeSku };
