#!/usr/bin/env node
/**
 * Авто-активация .githooks/pre-commit (local git config).
 * Вызывается из npm prepare и start.ps1 — пользователю ничего не нужно.
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GIT_DIR = path.join(ROOT, '.git');
const HOOKS_DIR = path.join(ROOT, '.githooks');

function main() {
  if (!fs.existsSync(GIT_DIR)) {
    process.exit(0);
  }

  if (!fs.existsSync(HOOKS_DIR)) {
    console.warn('FreezeGuard: .githooks not found, skip hooksPath setup');
    process.exit(0);
  }

  const result = spawnSync('git', ['config', 'core.hooksPath', '.githooks'], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    console.warn('FreezeGuard: could not set core.hooksPath:', result.stderr?.trim());
    process.exit(0);
  }
}

main();
