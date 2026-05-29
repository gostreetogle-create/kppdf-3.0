#!/usr/bin/env node
/**
 * Проверка .ps1: UTF-8 BOM + синтаксис PowerShell (parse-only).
 * Usage: node scripts/check-ps1-encoding.mjs [file.ps1 ...]
 * Exit 0 = OK, 1 = ошибка.
 */
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, relative, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function walkPs1(dir, acc = []) {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return acc;
  }
  for (const name of entries) {
    if (name === 'node_modules' || name === '.git') continue;
    const full = join(dir, name);
    let st;
    try {
      st = statSync(full);
    } catch {
      continue;
    }
    if (st.isDirectory()) walkPs1(full, acc);
    else if (name.endsWith('.ps1')) acc.push(full);
  }
  return acc;
}

function listPs1Files(argv) {
  if (argv.length > 0) {
    return argv.map((f) => resolve(ROOT, f));
  }
  const files = new Set([
    resolve(ROOT, 'start.ps1'),
    resolve(ROOT, 'stop.ps1'),
    ...walkPs1(resolve(ROOT, 'scripts')),
    ...walkPs1(resolve(ROOT, 'deploy')),
    ...walkPs1(resolve(ROOT, 'tools')),
  ]);
  return [...files].filter((f) => existsSync(f)).sort();
}

function hasUtf8Bom(file) {
  const buf = readFileSync(file);
  return buf.length >= 3 && buf[0] === 0xef && buf[1] === 0xbb && buf[2] === 0xbf;
}

function checkParse(file) {
  const rel = relative(ROOT, file).replace(/\\/g, '/');
  const script = `
$errors = $null
$null = [Management.Automation.Language.Parser]::ParseFile(
  (Join-Path (Get-Location) '${rel.replace(/'/g, "''")}'),
  [ref]$null,
  [ref]$errors
)
if ($errors -and $errors.Count -gt 0) {
  $errors | ForEach-Object { Write-Output $_.Message }
  exit 1
}
exit 0
`;
  const r = spawnSync('powershell', ['-NoProfile', '-Command', script], {
    cwd: ROOT,
    encoding: 'utf8',
    windowsHide: true,
  });
  return { ok: r.status === 0, out: `${r.stdout || ''}${r.stderr || ''}` };
}

let failed = 0;
const files = listPs1Files(process.argv.slice(2));

if (files.length === 0) {
  console.log('check-ps1-encoding: no .ps1 files');
  process.exit(0);
}

for (const file of files) {
  const rel = relative(ROOT, file);
  if (!hasUtf8Bom(file)) {
    console.error(`NO BOM:  ${rel}  ->  npm run ps1:bom -- ${rel}`);
    failed++;
    continue;
  }
  const parse = checkParse(file);
  if (!parse.ok) {
    console.error(`PARSE:  ${rel}`);
    if (parse.out.trim()) console.error(parse.out.trim());
    failed++;
  } else {
    console.log(`OK:     ${rel}`);
  }
}

if (failed > 0) {
  console.error(`\ncheck-ps1-encoding: ${failed} problem(s)`);
  process.exit(1);
}

console.log(`\ncheck-ps1-encoding: ${files.length} file(s) OK`);
