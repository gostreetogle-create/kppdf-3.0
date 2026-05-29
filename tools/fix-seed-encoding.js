/**
 * Fixes remaining mojibake in backend/src/seed.ts
 * V2: Applies fixer to all lines regardless of mixed Russian content
 */

const iconv = require('iconv-lite');
const fs = require('fs');

const filePath = 'backend/src/seed.ts';
const buf = fs.readFileSync(filePath);
const text = buf.toString('utf8');

function fixMojibake(str) {
  const result = [];
  let i = 0;

  while (i < str.length) {
    const ch = str[i];
    const cp = ch.codePointAt(0);

    if (cp <= 127) {
      // ASCII - pass through
      result.push(ch);
      i++;
    } else {
      // Collect consecutive non-ASCII characters
      const nonAscii = [];
      let j = i;
      while (j < str.length && str.codePointAt(j) > 127) {
        nonAscii.push(str[j]);
        j++;
      }

      // Try to decode: each non-ASCII char → 1 CP1251 byte, buffer → UTF-8
      const cp1251Bytes = [];
      let allDecodable = true;
      for (const nc of nonAscii) {
        const encoded = iconv.encode(nc, 'cp1251');
        if (encoded.length === 0) {
          allDecodable = false;
          break;
        }
        cp1251Bytes.push(encoded[0]);
      }

      if (allDecodable && cp1251Bytes.length >= 2) {
        const decoded = Buffer.from(cp1251Bytes).toString('utf8');
        const invalidUtf8 = decoded.includes('\uFFFD');
        // Check if result has actual Russian text (improvement over original)
        const hasRussian = /[А-ЯЁа-яё]/.test(decoded);
        if (hasRussian && !invalidUtf8 && decoded !== nonAscii.join('')) {
          result.push(decoded);
          i = j;
          continue;
        }
      }

      // Keep original
      for (const nc of nonAscii) result.push(nc);
      i = j;
    }
  }

  return result.join('');
}

// Process ALL lines through the fixer
const lines = text.split('\n');
const correctedLines = [];
let fixCount = 0;

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  const fixed = fixMojibake(line);
  if (fixed !== line) {
    correctedLines.push(fixed);
    fixCount++;
  } else {
    correctedLines.push(line);
  }
}

const result = correctedLines.join('\n');

// Remove double BOM
const fixedBOM = result.replace(/^\uFEFF\uFEFF/, '\uFEFF');

fs.writeFileSync(filePath, fixedBOM, 'utf8');
console.log(`V2 done. Fixed ${fixCount} lines.`);

// Show a few fixed lines for verification
lines.length = 0;
const lines2 = fixedBOM.split('\n');
let shown = 0;
for (let i = 0; i < lines2.length && shown < 5; i++) {
  if (text.split('\n')[i] !== lines2[i]) {
    console.log(`Line ${i + 1}:`);
    console.log(`  OLD: ${text.split('\n')[i].slice(0, 100)}`);
    console.log(`  NEW: ${lines2[i].slice(0, 100)}`);
    shown++;
  }
}
