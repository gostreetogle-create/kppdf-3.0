export interface ReadinessChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface ReadinessItem {
  label: string;
  percent: number;
  freeze_status?: string;
  checklist: ReadinessChecklistItem[];
}

export interface ReadinessShowcaseSection {
  label: string;
  icon?: string;
  keys: string[];
}

export interface ProjectReadinessSnapshot {
  enabled: boolean;
  version: number;
  updated: string;
  items: Record<string, ReadinessItem>;
  showcase_sections: Record<string, ReadinessShowcaseSection>;
}

export type ReadinessFeedbackSeverity = 'P1' | 'P2' | 'P3';
export type ReadinessFeedbackStatus = 'open' | 'in_progress' | 'resolved' | 'wontfix';

export interface ReadinessFeedbackIssue {
  id: string;
  status: ReadinessFeedbackStatus;
  module_key: string;
  checklist_id: string;
  dispute: boolean;
  severity: ReadinessFeedbackSeverity;
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

export interface SaveReadinessFeedbackPayload {
  module_key: string;
  checklist_id: string;
  dispute: boolean;
  description: string;
  severity: ReadinessFeedbackSeverity;
}
