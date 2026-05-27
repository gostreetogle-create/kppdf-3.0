#!/usr/bin/env node
/**
 * YAML → public/project-readiness.json
 * Usage: npm run readiness:sync
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '../..');
const YAML_PATH = resolve(__dirname, '../project-readiness.yaml');
const JSON_PATH = resolve(ROOT, 'public/project-readiness.json');
const INDEX_PATH = resolve(__dirname, 'INDEX.yaml');

/** @param {unknown} data */
function mergeFreezeFromIndex(data) {
  if (!existsSync(INDEX_PATH) || !data?.items) return;
  const indexDoc = yaml.load(readFileSync(INDEX_PATH, 'utf8'));
  const index = indexDoc?.index;
  if (!index || typeof index !== 'object') return;

  for (const [name, entry] of Object.entries(index)) {
    if (data.items[name] && entry?.status && entry.status !== 'wip') {
      data.items[name].freeze_status = entry.status;
    }
  }
}

function main() {
  if (!existsSync(YAML_PATH)) {
    console.error('❌ Missing .opencode/project-readiness.yaml');
    process.exit(2);
  }

  const data = yaml.load(readFileSync(YAML_PATH, 'utf8'));
  if (!data || typeof data !== 'object') {
    console.error('❌ Invalid project-readiness.yaml');
    process.exit(2);
  }

  mergeFreezeFromIndex(data);
  data.updated = new Date().toISOString().slice(0, 10);
  if (data.enabled === undefined) data.enabled = true;

  const publicDir = dirname(JSON_PATH);
  if (!existsSync(publicDir)) mkdirSync(publicDir, { recursive: true });

  writeFileSync(JSON_PATH, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  const count = data.items ? Object.keys(data.items).length : 0;
  console.log(`✅ readiness:sync → public/project-readiness.json (${count} items, enabled=${data.enabled})`);
}

main();
