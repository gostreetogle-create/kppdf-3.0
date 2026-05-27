#!/usr/bin/env node
/**
 * readiness-feedback.yaml → public/readiness-feedback.json
 * Usage:
 *   node .opencode/lock/readiness-feedback-sync.mjs           # sync only
 *   npm run readiness:feedback   (--list-open)
 *   npm run readiness:prompt     (--prompt-open)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const YAML_PATH = resolve(__dirname, '../readiness-feedback.yaml');
const PLAN_PATH = resolve(__dirname, '../project-readiness.yaml');
const JSON_PATH = resolve(ROOT, 'public/readiness-feedback.json');

const args = process.argv.slice(2);
const listOpen = args.includes('--list-open');
const promptOpen = args.includes('--prompt-open');

/** @param {string} checklistId */
function routeAgent(checklistId) {
  if (checklistId === 'auth') return 'auth-specialist';
  if (checklistId === 'crud') return 'backend-specialist';
  return 'ui-specialist';
}

/**
 * @param {Record<string, unknown>} issue
 * @param {Record<string, unknown> | null} plan
 */
function buildPrompt(issue, plan) {
  const moduleKey = String(issue.module_key ?? '');
  const checklistId = String(issue.checklist_id ?? '');
  const label = plan?.items?.[moduleKey]?.label ?? moduleKey;
  const agent = issue.ai_route ?? routeAgent(checklistId);
  const description = String(issue.description ?? '').trim();
  const hints = issue.hints;
  let filesBlock = '';
  if (hints && typeof hints === 'object' && Array.isArray(hints.files) && hints.files.length > 0) {
    filesBlock = `\nФайлы:\n${hints.files.map((f) => `- ${f}`).join('\n')}`;
  }
  let rulesBlock = '';
  if (hints && typeof hints === 'object' && Array.isArray(hints.rules) && hints.rules.length > 0) {
    rulesBlock = `\nПравила:\n${hints.rules.map((r) => `- ${r}`).join('\n')}`;
  }

  return `@${agent} — ${moduleKey} (${label}):
Проблема: ${description || '(без описания)'}
Чеклист: ${checklistId}${issue.dispute ? ' (пользователь оспорил done)' : ''}
Критерий закрытия: checklist ${checklistId} → done + UI-аудит${filesBlock}${rulesBlock}`;
}

/** @param {unknown} data */
function getOpenIssues(data) {
  if (!data || typeof data !== 'object' || !Array.isArray(data.issues)) return [];
  return data.issues.filter(
    (issue) =>
      issue &&
      typeof issue === 'object' &&
      (issue.status === 'open' || issue.status === 'in_progress'),
  );
}

/** @param {unknown} data */
function syncJson(data) {
  const publicDir = dirname(JSON_PATH);
  if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });
  writeFileSync(JSON_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
}

function loadFeedback() {
  if (!existsSync(YAML_PATH)) {
    console.error('❌ Missing .opencode/readiness-feedback.yaml');
    process.exit(2);
  }
  const data = yaml.load(readFileSync(YAML_PATH, 'utf8'));
  if (!data || typeof data !== 'object') {
    console.error('❌ Invalid readiness-feedback.yaml');
    process.exit(2);
  }
  if (!Array.isArray(data.issues)) data.issues = [];
  if (data.version === undefined) data.version = 1;
  return data;
}

function loadPlan() {
  if (!existsSync(PLAN_PATH)) return null;
  const plan = yaml.load(readFileSync(PLAN_PATH, 'utf8'));
  return plan && typeof plan === 'object' ? plan : null;
}

function listOpenIssues(data) {
  const open = getOpenIssues(data);
  if (open.length === 0) {
    console.log('No open issues');
    return;
  }
  for (const issue of open) {
    const firstLine = String(issue.description ?? '').trim().split('\n')[0] || '(без описания)';
    console.log(
      `- ${issue.id} [${issue.severity ?? 'P2'}] ${issue.module_key}/${issue.checklist_id}: ${firstLine}`,
    );
  }
}

/** @param {unknown} data */
function promptOpenIssues(data, plan) {
  const open = getOpenIssues(data);
  if (open.length === 0) {
    console.log('No open issues');
    return;
  }
  for (const issue of open) {
    const prompt =
      typeof issue.ai_prompt === 'string' && issue.ai_prompt.trim()
        ? issue.ai_prompt.trim()
        : buildPrompt(issue, plan);
    console.log('---');
    console.log(prompt);
    console.log('');
  }
}

function main() {
  const data = loadFeedback();
  const plan = loadPlan();

  syncJson(data);
  const openCount = getOpenIssues(data).length;
  const total = data.issues.length;

  if (listOpen) {
    listOpenIssues(data);
    return;
  }

  if (promptOpen) {
    promptOpenIssues(data, plan);
    return;
  }

  console.log(
    `✅ readiness-feedback:sync → public/readiness-feedback.json (${total} issues, ${openCount} open)`,
  );
}

main();
