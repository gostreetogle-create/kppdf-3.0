import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';
import { execFileSync } from 'child_process';
import yaml from 'js-yaml';

const ROOT = (() => {
  const cwd = process.cwd();
  if (existsSync(join(cwd, '.opencode/readiness-feedback.yaml'))) return cwd;
  if (existsSync(join(cwd, '..', '.opencode/readiness-feedback.yaml'))) return resolve(cwd, '..');
  return resolve(__dirname, '../../../../');
})();
const FEEDBACK_YAML = join(ROOT, '.opencode/readiness-feedback.yaml');
const PLAN_YAML = join(ROOT, '.opencode/project-readiness.yaml');
const SYNC_SCRIPT = join(ROOT, '.opencode/lock/readiness-feedback-sync.mjs');

export type FeedbackSeverity = 'P1' | 'P2' | 'P3';
export type FeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'wontfix';

export interface ReadinessFeedbackIssue {
  id: string;
  status: FeedbackStatus;
  module_key: string;
  checklist_id: string;
  dispute: boolean;
  severity: FeedbackSeverity;
  created_at: string;
  created_by: string;
  description: string;
  ai_route?: string;
  hints?: { files?: string[]; rules?: string[] };
  ai_prompt?: string;
  resolved_at?: string | null;
  resolution_note?: string | null;
}

export interface ReadinessFeedbackSnapshot {
  version: number;
  issues: ReadinessFeedbackIssue[];
}

export interface SaveFeedbackIssueInput {
  module_key: string;
  checklist_id: string;
  dispute: boolean;
  description: string;
  severity: FeedbackSeverity;
  created_by: string;
}

export interface ResolveFeedbackIssueInput {
  id: string;
  resolution_note?: string;
}

function routeAgent(checklistId: string): string {
  if (checklistId === 'auth') return 'auth-specialist';
  if (checklistId === 'crud') return 'backend-specialist';
  return 'ui-specialist';
}

function loadPlan(): Record<string, unknown> | null {
  if (!existsSync(PLAN_YAML)) return null;
  const plan = yaml.load(readFileSync(PLAN_YAML, 'utf8'));
  return plan && typeof plan === 'object' ? (plan as Record<string, unknown>) : null;
}

function buildPrompt(issue: ReadinessFeedbackIssue, plan: Record<string, unknown> | null): string {
  const items = plan?.items as Record<string, { label?: string }> | undefined;
  const label = items?.[issue.module_key]?.label ?? issue.module_key;
  const agent = issue.ai_route ?? routeAgent(issue.checklist_id);
  const description = issue.description.trim();
  let filesBlock = '';
  if (issue.hints?.files?.length) {
    filesBlock = `\nФайлы:\n${issue.hints.files.map((f) => `- ${f}`).join('\n')}`;
  }
  let rulesBlock = '';
  if (issue.hints?.rules?.length) {
    rulesBlock = `\nПравила:\n${issue.hints.rules.map((r) => `- ${r}`).join('\n')}`;
  }

  return `@${agent} — ${issue.module_key} (${label}):
Проблема: ${description || '(без описания)'}
Чеклист: ${issue.checklist_id}${issue.dispute ? ' (пользователь оспорил done)' : ''}
Критерий закрытия: checklist ${issue.checklist_id} → done + UI-аудит${filesBlock}${rulesBlock}`;
}

function loadFeedback(): ReadinessFeedbackSnapshot {
  if (!existsSync(FEEDBACK_YAML)) {
    return { version: 1, issues: [] };
  }
  const data = yaml.load(readFileSync(FEEDBACK_YAML, 'utf8')) as ReadinessFeedbackSnapshot | null;
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid readiness-feedback.yaml');
  }
  if (!Array.isArray(data.issues)) data.issues = [];
  if (data.version === undefined) data.version = 1;
  return data;
}

function writeFeedback(data: ReadinessFeedbackSnapshot): void {
  writeFileSync(FEEDBACK_YAML, yaml.dump(data, { lineWidth: 120, noRefs: true }), 'utf8');
  execFileSync(process.execPath, [SYNC_SCRIPT], { cwd: ROOT, stdio: 'pipe' });
}

function makeIssueId(moduleKey: string, checklistId: string): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  return `rf-${date}-${moduleKey}-${checklistId}`;
}

export class ReadinessFeedbackService {
  getFeedback(): ReadinessFeedbackSnapshot {
    return loadFeedback();
  }

  saveIssue(input: SaveFeedbackIssueInput): ReadinessFeedbackIssue {
    const data = loadFeedback();
    const plan = loadPlan();
    const existing = data.issues.find(
      (issue) =>
        issue.module_key === input.module_key &&
        issue.checklist_id === input.checklist_id &&
        (issue.status === 'open' || issue.status === 'in_progress'),
    );

    const issue: ReadinessFeedbackIssue = existing ?? {
      id: makeIssueId(input.module_key, input.checklist_id),
      status: 'open',
      module_key: input.module_key,
      checklist_id: input.checklist_id,
      dispute: input.dispute,
      severity: input.severity,
      created_at: new Date().toISOString(),
      created_by: input.created_by,
      description: input.description.trim(),
      ai_route: routeAgent(input.checklist_id),
    };

    issue.dispute = input.dispute;
    issue.severity = input.severity;
    issue.description = input.description.trim();
    issue.ai_route = routeAgent(input.checklist_id);
    issue.ai_prompt = buildPrompt(issue, plan);

    if (existing) {
      const idx = data.issues.findIndex((i) => i.id === existing.id);
      data.issues[idx] = issue;
    } else {
      data.issues.push(issue);
    }

    writeFeedback(data);
    return issue;
  }

  resolveIssue(input: ResolveFeedbackIssueInput): ReadinessFeedbackIssue {
    const data = loadFeedback();
    const idx = data.issues.findIndex((issue) => issue.id === input.id);
    if (idx === -1) {
      throw new Error('Issue not found');
    }

    const issue = data.issues[idx];
    if (issue.status === 'resolved' || issue.status === 'wontfix') {
      return issue;
    }

    issue.status = 'resolved';
    issue.resolved_at = new Date().toISOString();
    issue.resolution_note = input.resolution_note?.trim() || null;
    data.issues[idx] = issue;
    writeFeedback(data);
    return issue;
  }
}
