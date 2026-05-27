#!/usr/bin/env node
/**
 * Cursor preToolUse hook — блокирует Write/StrReplace на frozen/locked файлах.
 * stdin: JSON от Cursor (tool_name, tool_input)
 * stdout: { "permission": "allow" | "deny", ... }
 */

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '../..');
const FREEZE_CHECK = path.join(ROOT, '.opencode/lock/freeze-check.mjs');

const EDIT_TOOLS = new Set(['Write', 'StrReplace', 'EditNotebook', 'Delete']);

function readStdin() {
  try {
    return fs.readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

/** @param {string} raw */
function toRepoRelative(raw) {
  if (!raw) return '';
  let p = raw.replace(/\\/g, '/');
  const rootNorm = ROOT.replace(/\\/g, '/');
  if (path.isAbsolute(raw)) {
    p = path.relative(ROOT, raw).replace(/\\/g, '/');
  }
  if (p.startsWith(`${rootNorm}/`)) {
    p = p.slice(rootNorm.length + 1);
  }
  return p.replace(/^\.\//, '');
}

/**
 * @param {unknown} input
 * @returns {string[]}
 */
function extractPaths(input) {
  /** @type {string[]} */
  const paths = [];
  if (!input || typeof input !== 'object') return paths;

  const obj = /** @type {Record<string, unknown>} */ (input);
  const toolName = typeof obj.tool_name === 'string' ? obj.tool_name : '';
  const toolInput =
    obj.tool_input && typeof obj.tool_input === 'object'
      ? /** @type {Record<string, unknown>} */ (obj.tool_input)
      : obj;

  if (!EDIT_TOOLS.has(toolName) && obj.path === undefined && toolInput.path === undefined) {
    return paths;
  }

  const candidates = [
    toolInput.path,
    toolInput.file_path,
    toolInput.target_notebook,
    obj.path,
  ];

  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) {
      paths.push(toRepoRelative(c.trim()));
    }
  }

  return [...new Set(paths)];
}

/**
 * @param {string} relPath
 * @returns {{ blocked: boolean, status?: string, module?: string }}
 */
function checkPath(relPath) {
  if (!relPath || !fs.existsSync(FREEZE_CHECK)) {
    return { blocked: false };
  }

  const result = spawnSync(process.execPath, [FREEZE_CHECK, '--check-path', relPath], {
    cwd: ROOT,
    encoding: 'utf8',
  });

  if (result.status === 0) {
    return { blocked: false };
  }

  if (result.status === 1 && result.stdout?.trim()) {
    const [status, module] = result.stdout.trim().split(':');
    return { blocked: true, status, module };
  }

  return { blocked: false };
}

function allow() {
  console.log(JSON.stringify({ permission: 'allow' }));
  process.exit(0);
}

function deny(status, module, relPath) {
  const icon = status === 'locked' ? '🔒' : '🧊';
  const userMessage = `${icon} ${module} ${status} — файл ${relPath} защищён FreezeGuard.`;
  const agentMessage =
    `FreezeGuard BLOCK: cannot edit ${relPath} (${module}, ${status}). ` +
    'Tell user the module is protected. Unfreeze only via @chief-architect.';

  console.log(
    JSON.stringify({
      permission: 'deny',
      user_message: userMessage,
      agent_message: agentMessage,
    }),
  );
  process.exit(0);
}

function main() {
  const raw = readStdin();
  if (!raw.trim()) {
    allow();
    return;
  }

  let payload;
  try {
    payload = JSON.parse(raw);
  } catch {
    allow();
    return;
  }

  const toolName = typeof payload.tool_name === 'string' ? payload.tool_name : '';
  if (toolName && !EDIT_TOOLS.has(toolName)) {
    allow();
    return;
  }

  const paths = extractPaths(payload);
  if (paths.length === 0) {
    allow();
    return;
  }

  for (const relPath of paths) {
    const hit = checkPath(relPath);
    if (hit.blocked) {
      deny(hit.status ?? 'frozen', hit.module ?? 'unknown', relPath);
      return;
    }
  }

  allow();
}

main();
