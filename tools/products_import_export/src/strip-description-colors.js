/**
 * Удаление дублей цвета из «Описание», если цвет уже указан в колонке «Цвет».
 */

function normalizeSpaces(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseColorTokens(colorField) {
  return String(colorField || "")
    .split(/;/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function cleanupDescription(text) {
  let s = normalizeSpaces(text);
  s = s.replace(/,\s*,+/g, ",");
  s = s.replace(/\(\s*\)/g, "");
  s = s.replace(/,\s*([.;])/g, "$1");
  s = s.replace(/:\s*,/g, ": ");
  s = s.replace(/:\s*\./g, ".");
  s = s.replace(/\s+([,.;])/g, "$1");
  s = s.replace(/([,.;])\1+/g, "$1");
  s = s.replace(/,\s*$/, "");
  s = s.replace(/^\s*[,;.]\s*/, "");
  s = s.replace(/\s-\s/g, " - ");
  return normalizeSpaces(s);
}

const OKRASHEN = "\u043E\u043A\u0440\u0430\u0448\u0435\u043D";
const OKRASKA = "\u043E\u043A\u0440\u0430\u0441\u043A(?:\u0430|\u0438)?";
const POROSHKOVAYA = "\u043F\u043E\u0440\u043E\u0448\u043A\u043E\u0432(?:\u0430\u044F|\u043E\u0439)?";
const LENTA = "\u043B\u0435\u043D\u0442\u0430";

function removeRalFromDescription(text, code) {
  let out = text;
  const ral = `RAL\\s*[-–]?\\s*${code}`;
  const lead = "(?:^|,\\s*)";

  out = out.replace(new RegExp(`\\(\\s*${ral}\\s*\\)`, "gi"), "");
  out = out.replace(
    new RegExp(`${lead}?с\\s+нанесением\\s+порошковой\\s+${OKRASKA}\\s*\\(\\s*${ral}\\s*\\)`, "gi"),
    "",
  );
  out = out.replace(
    new RegExp(`${lead}${POROSHKOVAYA}\\s+${OKRASKA}\\s+в\\s+цвет\\s*${ral}`, "gi"),
    "",
  );
  out = out.replace(new RegExp(`${lead}${OKRASKA}\\s+в\\s+цвет\\s*${ral}`, "gi"), "");
  out = out.replace(new RegExp(`цвет\\s+корпуса\\s*[:\\-—]?\\s*${ral}`, "gi"), "");
  out = out.replace(new RegExp(`покрытие\\s+${ral}(?:\\s+и\\s+\\d{4})?`, "gi"), "");
  out = out.replace(
    new RegExp(`${lead}цинкование,\\s*${POROSHKOVAYA}\\s+${OKRASKA}\\s+в\\s+цвет\\s*${ral}`, "gi"),
    "цинкование",
  );
  out = out.replace(
    new RegExp(
      `${lead}цинконаполненный\\s+грунт,\\s*${POROSHKOVAYA}\\s+${OKRASKA}\\s+в\\s+цвет\\s*${ral}`,
      "gi",
    ),
    "цинконаполненный грунт",
  );
  return out;
}

function removeOrphanCoatingTerms(text, hasRal) {
  let out = text;
  if (hasRal) {
    out = out.replace(new RegExp(`\\s+с\\s+нанесением\\s+порошковой\\s+${OKRASKA}`, "gi"), "");
  }
  out = out.replace(new RegExp(`,\\s*${POROSHKOVAYA}(?:\\s+${OKRASKA})?(?=\\s*[,;.]|\$)`, "gi"), "");
  out = out.replace(new RegExp(`,\\s*${OKRASKA}(?=\\s*[,;.]|\$)`, "gi"), "");
  return out;
}
const RE_PAINTED_DARK_GRAY = new RegExp(
  `(?:,\\s*)?загрунтован\\s+и\\s+${OKRASHEN}\\s+в\\s+т[её]мно\\s*[-–]?\\s*сер(?:ый|ого)\\s+цвет`,
  "gi",
);
const RE_AND_PAINTED_DARK_GRAY = new RegExp(
  `\\s+и\\s+${OKRASHEN}\\s+в\\s+т[её]мно\\s*[-–]?\\s*сер(?:ый|ого)\\s+цвет`,
  "gi",
);
const RE_COMMA_PAINTED_DARK_GRAY = new RegExp(
  `,\\s*${OKRASHEN}\\s+в\\s+т[её]мно\\s*[-–]?\\s*сер(?:ый|ого)\\s+цвет`,
  "gi",
);
const RE_LIGHT_OAK_OIL = new RegExp(
  `,\\s*${OKRASHEN}(?:ное|ной)?\\s+антисептическим\\s+маслом\\s*\\(\\s*светлый\\s+дуб\\s*\\)`,
  "gi",
);

function stripColorsFromDescription(description, colorField) {
  const original = normalizeSpaces(description);
  if (!original || !String(colorField || "").trim()) {
    return original;
  }

  let text = original;
  const tokens = parseColorTokens(colorField);
  const hasRal = tokens.some((token) => /RAL\s*\d{4}/i.test(token));

  for (const token of tokens) {
    const ralMatch = token.match(/RAL\s*(\d{4})/i);
    if (ralMatch) {
      text = removeRalFromDescription(text, ralMatch[1]);
    }

    if (/светл(?:ый|ого)\s+дуб/i.test(token)) {
      text = text.replace(RE_LIGHT_OAK_OIL, "");
    }

    if (/сер(?:ый|ого)\s+мрамор/i.test(token)) {
      text = text.replace(/материалы:\s*сер(?:ый|ого)\s+мрамор,\s*/gi, "Материалы: ");
      text = text.replace(/,\s*сер(?:ый|ого)\s+мрамор/gi, "");
    }

    if (/графит/i.test(token)) {
      text = text.replace(/,\s*цвет\s+графитово\s*[-–]?\s*сер(?:ый|ого|ая|ое)/gi, "");
      text = text.replace(/акп\s+цвет\s+графитово\s*[-–]?\s*сер(?:ый|ого|ая|ое)/gi, "АКП");
      text = text.replace(/,\s*акп\s+цвет\s+графит[^,;.]*/gi, ", АКП");
    }

    if (/т[её]мно\s*[-–]?\s*сер/i.test(token)) {
      text = text.replace(RE_PAINTED_DARK_GRAY, ", загрунтован");
      text = text.replace(RE_AND_PAINTED_DARK_GRAY, "");
      text = text.replace(RE_COMMA_PAINTED_DARK_GRAY, "");
    }

    if (/бел/i.test(token) && /подшив/i.test(token)) {
      text = text.replace(/,\s*подшивка\s+потолка\s*[-–]?\s*бел(?:ый|ого|ая|ое)/gi, "");
      text = text.replace(/\.\s*подшивка\s+потолка\s*[-–]?\s*бел(?:ый|ого|ая|ое)/gi, ".");
    } else if (/^белый$/i.test(token.trim())) {
      text = text.replace(
        new RegExp(`светодиодная\\s+${LENTA}\\s+белого\\s+цвета,\\s*`, "gi"),
        `Светодиодная ${LENTA}, `,
      );
      text = text.replace(
        new RegExp(`светодиодная\\s+${LENTA}\\s+белого\\s+цвета`, "gi"),
        `Светодиодная ${LENTA}`,
      );
    }

    if (/^красн/i.test(token.trim())) {
      text = text.replace(/,\s*цвет\s*[:—-]?\s*красн[а-я]*/gi, "");
    }

    if (/^син/i.test(token.trim())) {
      text = text.replace(/,\s*цвет\s*[:—-]?\s*син[а-я]*/gi, "");
    }

    if (/^зел[её]н/i.test(token.trim())) {
      text = text.replace(/,\s*цвет\s*[:—-]?\s*зел[а-я]*/gi, "");
      text = text.replace(/,\s*цвет:\s*зел[а-я]*,\s*терракот/gi, "");
    }
  }

  text = removeOrphanCoatingTerms(text, hasRal);
  return cleanupDescription(text);
}

module.exports = {
  stripColorsFromDescription,
  parseColorTokens,
  cleanupDescription,
  removeOrphanCoatingTerms,
};
