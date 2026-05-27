#!/usr/bin/env node
/**
 * FreezeGuard CLI — проверка целостности frozen/locked модулей KPPDF 3.0
 *
 * Usage:
 *   node .opencode/lock/freeze-check.mjs --status
 *   node .opencode/lock/freeze-check.mjs --check-hashes
 *   node .opencode/lock/freeze-check.mjs --list-frozen-paths
 *   node .opencode/lock/freeze-check.mjs --update-hashes [--module name]
 *   node .opencode/lock/freeze-check.mjs --check-path <relative-path>
 *   node .opencode/lock/freeze-check.mjs --stale [--module name]
 *
 * Exit: 0=OK, 1=mismatch/error, 2=config error
 */

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const LOCK_DIR = __dirname;
const INDEX_PATH = path.join(LOCK_DIR, 'INDEX.yaml');

const PROTECTED_STATUSES = new Set(['frozen', 'locked']);

/** @param {string} p */
function toPosix(p) {
  return p.split(path.sep).join('/');
}

/** @param {string} rel */
function absFromRel(rel) {
  return path.join(ROOT, rel);
}

/** @param {string} filePath */
function sha256File(filePath) {
  const buf = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

/**
 * @param {string} pattern glob relative to ROOT
 * @returns {string[]}
 */
function expandPattern(pattern) {
  const norm = toPosix(pattern);
  if (!norm.includes('*')) {
    return fs.existsSync(absFromRel(norm)) ? [norm] : [];
  }

  const starIdx = norm.indexOf('*');
  const before = norm.slice(0, starIdx);
  const afterStar = norm.slice(starIdx);

  if (afterStar.startsWith('**')) {
    const suffix = afterStar.replace(/^\*\*\/?/, '');
    const baseDir = before.replace(/\/$/, '');
    const baseAbs = absFromRel(baseDir);
    if (!fs.existsSync(baseAbs)) return [];
    const out = [];
    walk(baseAbs, (file) => {
      const rel = toPosix(path.relative(ROOT, file));
      if (suffix === '' || suffix === '*') {
        out.push(rel);
      } else if (matchSimpleGlob(suffix, rel.slice(baseDir.length + 1))) {
        out.push(rel);
      } else if (matchSimpleGlob(suffix, path.basename(rel))) {
        out.push(rel);
      }
    });
    return [...new Set(out)].sort();
  }

  const dirPart = path.posix.dirname(norm);
  const fileGlob = path.posix.basename(norm);
  const dirAbs = absFromRel(dirPart === '.' ? '' : dirPart);
  if (!fs.existsSync(dirAbs)) return [];

  const entries = fs.readdirSync(dirAbs, { withFileTypes: true });
  const out = [];
  for (const ent of entries) {
    if (!ent.isFile()) continue;
    if (matchSimpleGlob(fileGlob, ent.name)) {
      out.push(toPosix(path.join(dirPart === '.' ? '' : dirPart, ent.name)));
    }
  }
  return out.sort();
}

/**
 * @param {string} glob
 * @param {string} name
 */
function matchSimpleGlob(glob, name) {
  const re = new RegExp(
    '^' +
      glob
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.') +
      '$',
  );
  return re.test(name);
}

/**
 * @param {string} filePath posix relative to ROOT
 * @param {string} pattern locked_files entry
 */
function pathMatchesPattern(filePath, pattern) {
  const norm = toPosix(pattern);
  if (norm.endsWith('/**')) {
    const prefix = norm.slice(0, -3);
    return filePath === prefix || filePath.startsWith(`${prefix}/`);
  }
  if (norm.includes('*')) {
    return matchSimpleGlob(norm, filePath) || matchSimpleGlob(norm, path.posix.basename(filePath));
  }
  return filePath === norm;
}

/**
 * @param {Record<string, { status: string, path: string }>} index
 * @param {string} relPath
 * @returns {{ module: string, status: string } | null}
 */
function findProtectingModule(index, relPath) {
  const filePath = toPosix(relPath).replace(/^\.\//, '');

  for (const { name, entry } of iterModules(index)) {
    if (!PROTECTED_STATUSES.has(entry.status)) continue;
    const mod = loadModule(entry.path);
    if (!mod?.locked_files?.length) continue;

    for (const pattern of mod.locked_files) {
      const expanded = expandPattern(pattern);
      if (expanded.includes(filePath)) {
        return { module: name, status: entry.status };
      }
      if (pathMatchesPattern(filePath, pattern)) {
        return { module: name, status: entry.status };
      }
    }
  }

  return null;
}

/**
 * @param {Record<string, { status: string, path: string }>} index
 * @param {string} relPath
 */
function cmdCheckPath(index, relPath) {
  const hit = findProtectingModule(index, relPath);
  if (hit) {
    console.log(`${hit.status}:${hit.module}`);
    process.exit(1);
  }
  process.exit(0);
}

/**
 * @param {string} dir
 * @param {(file: string) => void} cb
 */
function walk(dir, cb) {
  if (!fs.existsSync(dir)) return;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(full, cb);
    else if (ent.isFile()) cb(full);
  }
}

function loadIndex() {
  if (!fs.existsSync(INDEX_PATH)) {
    console.error('❌ INDEX.yaml not found:', INDEX_PATH);
    process.exit(2);
  }
  const raw = fs.readFileSync(INDEX_PATH, 'utf8');
  const doc = yaml.load(raw);
  if (!doc?.index || typeof doc.index !== 'object') {
    console.error('❌ INDEX.yaml: missing "index" key');
    process.exit(2);
  }
  return doc.index;
}

/**
 * @param {string} relPath from INDEX
 */
function loadModule(relPath) {
  const full = path.join(LOCK_DIR, relPath);
  if (!fs.existsSync(full)) return null;
  return yaml.load(fs.readFileSync(full, 'utf8'));
}

/**
 * @param {Record<string, { status: string, path: string }>} index
 * @param {string | undefined} moduleFilter
 */
function* iterModules(index, moduleFilter) {
  for (const [name, entry] of Object.entries(index)) {
    if (moduleFilter && name !== moduleFilter) continue;
    yield { name, entry };
  }
}

function cmdStatus(index, moduleFilter) {
  console.log('');
  console.log('FreezeGuard — статус модулей');
  console.log('─'.repeat(72));
  console.log(
    pad('Module', 20) +
      pad('Status', 12) +
      pad('Lockfile', 28) +
      'Exists',
  );
  console.log('─'.repeat(72));

  for (const { name, entry } of iterModules(index, moduleFilter)) {
    const lockPath = path.join(LOCK_DIR, entry.path);
    const exists = fs.existsSync(lockPath) ? '✅' : '⚠️ missing';
    console.log(
      pad(name, 20) + pad(entry.status, 12) + pad(entry.path, 28) + exists,
    );
  }
  console.log('');
}

/** @param {string} s @param {number} w */
function pad(s, w) {
  return s.padEnd(w);
}

/**
 * @param {Record<string, { status: string, path: string }>} index
 * @param {string | undefined} moduleFilter
 * @returns {string[]}
 */
function collectProtectedPaths(index, moduleFilter) {
  /** @type {string[]} */
  const paths = [];

  for (const { name, entry } of iterModules(index, moduleFilter)) {
    if (!PROTECTED_STATUSES.has(entry.status)) continue;
    const mod = loadModule(entry.path);
    if (!mod?.locked_files?.length) continue;
    for (const pattern of mod.locked_files) {
      const expanded = expandPattern(pattern);
      if (expanded.length === 0 && !pattern.includes('*')) {
        paths.push(toPosix(pattern));
      } else {
        paths.push(...expanded);
      }
    }
  }

  return [...new Set(paths)].sort();
}

function cmdListFrozenPaths(index, moduleFilter) {
  const paths = collectProtectedPaths(index, moduleFilter);
  for (const p of paths) console.log(p);
}

/**
 * @param {Record<string, { status: string, path: string }>} index
 * @param {string | undefined} moduleFilter
 */
function cmdCheckHashes(index, moduleFilter) {
  let errors = 0;
  let warnings = 0;

  for (const { name, entry } of iterModules(index, moduleFilter)) {
    if (!PROTECTED_STATUSES.has(entry.status)) continue;

    const mod = loadModule(entry.path);
    if (!mod) {
      console.warn(`⚠️  ${name}: lockfile missing (${entry.path}) — Phase 2`);
      warnings++;
      continue;
    }

    if (mod.check_hash === false) continue;
    if (!mod.locked_files?.length) continue;

    const hashes = mod.file_hashes ?? {};
    const hasAnyHash = Object.keys(hashes).length > 0;

    for (const pattern of mod.locked_files) {
      const files = expandPattern(pattern);
      const targets = files.length ? files : [toPosix(pattern)];

      for (const rel of targets) {
        const abs = absFromRel(rel);
        if (!fs.existsSync(abs)) {
          console.warn(`⚠️  ${name}: file not found: ${rel}`);
          warnings++;
          continue;
        }

        const current = sha256File(abs);
        const expected = hashes[rel] ?? hashes[pattern];

        if (!expected) {
          if (hasAnyHash) {
            console.warn(`⚠️  ${name}: no hash for ${rel} — run npm run freeze:update`);
            warnings++;
          }
          continue;
        }

        if (current !== expected) {
          console.error(`❌ ${name}: hash mismatch: ${rel}`);
          errors++;
        }
      }
    }
  }

  if (errors > 0) {
    console.error(`\n❌ FreezeGuard: ${errors} hash mismatch(es)`);
    process.exit(1);
  }

  if (warnings > 0) {
    console.warn(`\n⚠️  FreezeGuard: ${warnings} warning(s)`);
  } else {
    console.log('\n✅ FreezeGuard: integrity OK');
  }
}

/**
 * @param {Record<string, { status: string, path: string }>} index
 * @param {string | undefined} moduleFilter
 */
function cmdUpdateHashes(index, moduleFilter) {
  for (const { name, entry } of iterModules(index, moduleFilter)) {
    if (!PROTECTED_STATUSES.has(entry.status)) continue;

    const lockFull = path.join(LOCK_DIR, entry.path);
    if (!fs.existsSync(lockFull)) {
      console.warn(`⚠️  Skip ${name}: lockfile missing`);
      continue;
    }

    const mod = yaml.load(fs.readFileSync(lockFull, 'utf8'));
    if (!mod.locked_files?.length) continue;

    mod.file_hashes = mod.file_hashes ?? {};
    let updated = 0;

    for (const pattern of mod.locked_files) {
      const files = expandPattern(pattern);
      const targets = files.length ? files : [toPosix(pattern)];

      for (const rel of targets) {
        const abs = absFromRel(rel);
        if (!fs.existsSync(abs)) {
          console.warn(`⚠️  ${name}: skip missing ${rel}`);
          continue;
        }
        mod.file_hashes[rel] = sha256File(abs);
        updated++;
      }
    }

    fs.writeFileSync(lockFull, yaml.dump(mod, { lineWidth: 120, noRefs: true }), 'utf8');
    console.log(`✅ ${name}: updated ${updated} hash(es) → ${entry.path}`);
  }
}

/**
 * @param {Record<string, { status: string, path: string }>} index
 * @param {string | undefined} moduleFilter
 */
function cmdStale(index, moduleFilter) {
  for (const { name, entry } of iterModules(index, moduleFilter)) {
    const mod = loadModule(entry.path);
    if (!mod?.locked_files?.length) continue;

    const lockedSet = new Set();
    for (const pattern of mod.locked_files) {
      for (const p of expandPattern(pattern)) lockedSet.add(p);
      if (!pattern.includes('*')) lockedSet.add(toPosix(pattern));
    }

    const dirs = new Set();
    for (const p of lockedSet) {
      dirs.add(path.posix.dirname(p));
    }

    for (const dir of dirs) {
      if (!dir || dir === '.') continue;
      const dirAbs = absFromRel(dir);
      if (!fs.existsSync(dirAbs)) continue;
      walk(dirAbs, (file) => {
        const rel = toPosix(path.relative(ROOT, file));
        if (!lockedSet.has(rel) && rel.startsWith(dir)) {
          console.warn(`⚠️  ${name}: unstaged in lock scope: ${rel}`);
        }
      });
    }
  }
}

function parseArgs(argv) {
  const flags = new Set();
  let moduleFilter;
  let checkPath;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--module' && argv[i + 1]) {
      moduleFilter = argv[++i];
    } else if (a === '--check-path' && argv[i + 1]) {
      checkPath = argv[++i];
      flags.add('--check-path');
    } else if (a.startsWith('--')) {
      flags.add(a);
    }
  }
  return { flags, moduleFilter, checkPath };
}

function main() {
  const { flags, moduleFilter, checkPath } = parseArgs(process.argv.slice(2));
  const index = loadIndex();

  if (flags.has('--check-path')) {
    if (!checkPath) {
      console.error('❌ --check-path requires a file path');
      process.exit(2);
    }
    cmdCheckPath(index, checkPath);
    return;
  }
  if (flags.has('--list-frozen-paths')) {
    cmdListFrozenPaths(index, moduleFilter);
    return;
  }
  if (flags.has('--check-hashes')) {
    cmdCheckHashes(index, moduleFilter);
    return;
  }
  if (flags.has('--update-hashes')) {
    cmdUpdateHashes(index, moduleFilter);
    return;
  }
  if (flags.has('--stale')) {
    cmdStale(index, moduleFilter);
    return;
  }

  cmdStatus(index, moduleFilter);
}

main();
