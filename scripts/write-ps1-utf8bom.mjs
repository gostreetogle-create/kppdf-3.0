#!/usr/bin/env node
/**
 * Записать .ps1 в UTF-8 с BOM (Windows PowerShell 5.1 + кириллица).
 * Протокол: .opencode/rules/encoding-windows.md
 * Usage: node scripts/write-ps1-utf8bom.mjs [file.ps1 ...]
 * Без аргументов — все .ps1 в start/stop, scripts/, deploy/, tools/.
 */
import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

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
    return argv.map((f) => resolve(root, f));
  }
  const files = new Set([
    resolve(root, 'start.ps1'),
    resolve(root, 'stop.ps1'),
    ...walkPs1(resolve(root, 'scripts')),
    ...walkPs1(resolve(root, 'deploy')),
    ...walkPs1(resolve(root, 'tools')),
  ]);
  return [...files].filter((f) => existsSync(f)).sort();
}

for (const file of listPs1Files(process.argv.slice(2))) {
  let text = readFileSync(file, 'utf8');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  writeFileSync(file, '\uFEFF' + text, 'utf8');
  console.log('UTF-8 BOM:', file);
}
