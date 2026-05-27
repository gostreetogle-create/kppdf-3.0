import {
  Component,
  input,
  model,
  output,
  computed,
  signal,
  inject,
  ChangeDetectionStrategy,
  DestroyRef,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MessageService } from 'primeng/api';
import {
  KpDialogComponent,
  KpButtonComponent,
  KpReadinessBarComponent,
  KpCheckboxComponent,
  KpTextareaComponent,
  KpSelectComponent,
  type KpSelectOption,
} from '../../shared/ui';
import type {
  ProjectReadinessSnapshot,
  ReadinessFeedbackIssue,
  ReadinessFeedbackSnapshot,
  ReadinessFeedbackSeverity,
} from '../../core/project-readiness.model';
import { ReadinessFeedbackService } from './readiness-feedback.service';

interface ShowcaseRow {
  key: string;
  label: string;
  percent: number;
  freezeStatus?: string;
  checklist: { id: string; label: string; done: boolean }[];
  openCount: number;
}

interface ShowcaseSectionView {
  id: string;
  label: string;
  icon?: string;
  rows: ShowcaseRow[];
}

interface ChecklistDraft {
  moduleKey: string;
  checklistId: string;
  planDone: boolean;
  agreed: boolean;
  description: string;
  severity: ReadinessFeedbackSeverity;
  expanded: boolean;
}

@Component({
  selector: 'app-readiness-showcase',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KpDialogComponent,
    KpButtonComponent,
    KpReadinessBarComponent,
    KpCheckboxComponent,
    KpTextareaComponent,
    KpSelectComponent,
  ],
  template: `
    <app-kp-dialog
      [(visible)]="visible"
      header="Статус реализации"
      width="720px"
      ariaLabel="Статус реализации проекта"
    >
      @if (snapshot(); as data) {
        <div class="readiness-showcase">
          <div class="readiness-showcase__summary">
            <span class="readiness-showcase__summary-label">Готовность проекта</span>
            <app-kp-readiness-bar
              class="readiness-showcase__summary-bar"
              [percent]="projectPercent()"
              label="Проект"
            />
          </div>

          @if (openIssuesCount() > 0) {
            <p class="readiness-showcase__open-count">
              Открытых замечаний: <strong>{{ openIssuesCount() }}</strong>
            </p>
          }

          @for (section of sections(); track section.id) {
            <section>
              <h3 class="readiness-showcase__section-title">
                @if (section.icon) {
                  <i [class]="section.icon + ' readiness-showcase__section-icon'" aria-hidden="true"></i>
                }
                {{ section.label }}
              </h3>
              <div class="readiness-showcase__list">
                @for (row of section.rows; track row.key) {
                  <article class="readiness-showcase__item">
                    <div class="readiness-showcase__item-head">
                      <span class="readiness-showcase__item-title">{{ row.label }}</span>
                      <div class="readiness-showcase__item-badges">
                        @if (row.openCount > 0) {
                          <span class="readiness-showcase__open-badge">{{ row.openCount }} открыто</span>
                        }
                        @if (row.freezeStatus) {
                          <span
                            class="readiness-showcase__status"
                            [class]="statusClass(row.freezeStatus)"
                          >
                            {{ statusLabel(row.freezeStatus) }}
                          </span>
                        }
                      </div>
                    </div>
                    <div class="readiness-showcase__item-bar">
                      <app-kp-readiness-bar
                        [percent]="row.percent"
                        [label]="row.label"
                        [compact]="true"
                      />
                    </div>
                    @if (row.checklist.length > 0) {
                      <ul class="readiness-showcase__checklist">
                        @for (check of row.checklist; track check.id) {
                          <li class="readiness-showcase__check-block">
                            <div
                              class="readiness-showcase__check"
                              [class.readiness-showcase__check--done]="isChecklistDone(row.key, check)"
                            >
                              @if (canEdit()) {
                                <app-kp-checkbox
                                  [name]="'check-' + row.key + '-' + check.id"
                                  [checked]="isChecklistAgreed(row.key, check)"
                                  (checkedChange)="onAgreedChange(row.key, check, $event)"
                                  [ariaLabel]="check.label"
                                />
                              } @else {
                                <i
                                  class="readiness-showcase__check-icon pi"
                                  [class.pi-check-circle]="check.done"
                                  [class.pi-circle]="!check.done"
                                  aria-hidden="true"
                                ></i>
                              }
                              <span class="readiness-showcase__check-label">{{ check.label }}</span>
                              @if (getOpenIssue(row.key, check.id); as issue) {
                                <span class="readiness-showcase__issue-badge">Открыто</span>
                              }
                            </div>

                            @if (getOpenIssue(row.key, check.id); as issue) {
                              <p class="readiness-showcase__issue-desc">{{ issue.description }}</p>
                              @if (canEdit()) {
                                <div class="readiness-showcase__issue-actions">
                                  @if (issue.ai_prompt) {
                                    <app-kp-button
                                      label="Показать промпт"
                                      icon="pi pi-copy"
                                      severity="secondary"
                                      size="small"
                                      (buttonClick)="copyPrompt(issue)"
                                    />
                                  }
                                  <app-kp-button
                                    label="Закрыто"
                                    icon="pi pi-check"
                                    severity="secondary"
                                    size="small"
                                    [loading]="isResolving(issue.id)"
                                    (buttonClick)="resolveIssue(issue)"
                                  />
                                </div>
                              }
                            }

                            @if (isFormVisible(row.key, check)) {
                              <div class="readiness-showcase__form">
                                <app-kp-textarea
                                  [name]="'note-' + row.key + '-' + check.id"
                                  label="Что не так?"
                                  [value]="draftDescription(row.key, check.id)"
                                  (valueChange)="setDraftDescription(row.key, check.id, $event)"
                                  [rows]="3"
                                  placeholder="Опишите проблему для AI..."
                                />
                                <app-kp-select
                                  [name]="'severity-' + row.key + '-' + check.id"
                                  label="Приоритет"
                                  [options]="severityOptions"
                                  [value]="draftSeverity(row.key, check.id)"
                                  (valueChange)="setDraftSeverity(row.key, check.id, $event)"
                                />
                                <app-kp-button
                                  label="Сохранить замечание"
                                  icon="pi pi-save"
                                  size="small"
                                  [loading]="isSaving(row.key, check.id)"
                                  (buttonClick)="saveIssue(row.key, check)"
                                />
                              </div>
                            } @else if (canEdit() && !getOpenIssue(row.key, check.id)) {
                              <button
                                type="button"
                                class="readiness-showcase__report-link"
                                (click)="openForm(row.key, check)"
                              >
                                Сообщить о проблеме
                              </button>
                            }
                          </li>
                        }
                      </ul>
                    }
                  </article>
                }
              </div>
            </section>
          }
        </div>
      }

      <div kpDialogFooter>
        <app-kp-button label="Закрыть" severity="secondary" (buttonClick)="close()" />
      </div>
    </app-kp-dialog>
  `,
  styleUrl: './readiness-showcase.component.scss',
})
export class ReadinessShowcaseComponent {
  private readonly feedbackApi = inject(ReadinessFeedbackService);
  private readonly messageService = inject(MessageService);
  private readonly destroyRef = inject(DestroyRef);

  readonly visible = model(false);
  readonly snapshot = input<ProjectReadinessSnapshot | null>(null);
  readonly feedback = input<ReadinessFeedbackSnapshot | null>(null);
  readonly canEdit = input(false);
  readonly feedbackUpdated = output<void>();

  readonly severityOptions: KpSelectOption[] = [
    { label: 'P1 — срочно', value: 'P1' },
    { label: 'P2 — важно', value: 'P2' },
    { label: 'P3 — позже', value: 'P3' },
  ];

  private readonly drafts = signal<Record<string, ChecklistDraft>>({});
  private readonly savingKeys = signal<Set<string>>(new Set());
  private readonly resolvingIds = signal<Set<string>>(new Set());

  readonly projectPercent = computed(() => {
    const data = this.snapshot();
    if (!data?.items) return 0;
    const values = Object.values(data.items).map((item) => item.percent);
    if (values.length === 0) return 0;
    return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
  });

  readonly openIssuesCount = computed(() => this.openIssues().length);

  readonly sections = computed((): ShowcaseSectionView[] => {
    const data = this.snapshot();
    if (!data) return [];

    return Object.entries(data.showcase_sections).map(([id, section]) => {
      const rows: ShowcaseRow[] = [];
      for (const key of section.keys) {
        const item = data.items[key];
        if (!item) continue;
        rows.push({
          key,
          label: item.label,
          percent: item.percent,
          freezeStatus: item.freeze_status,
          checklist: item.checklist ?? [],
          openCount: this.openIssues().filter((issue) => issue.module_key === key).length,
        });
      }
      return { id, label: section.label, icon: section.icon, rows };
    });
  });

  private openIssues(): ReadinessFeedbackIssue[] {
    return (this.feedback()?.issues ?? []).filter(
      (issue) => issue.status === 'open' || issue.status === 'in_progress',
    );
  }

  private draftKey(moduleKey: string, checklistId: string): string {
    return `${moduleKey}:${checklistId}`;
  }

  getOpenIssue(moduleKey: string, checklistId: string): ReadinessFeedbackIssue | undefined {
    return this.openIssues().find(
      (issue) => issue.module_key === moduleKey && issue.checklist_id === checklistId,
    );
  }

  isChecklistAgreed(
    moduleKey: string,
    check: { id: string; done: boolean },
  ): boolean {
    const draft = this.drafts()[this.draftKey(moduleKey, check.id)];
    if (draft) return draft.agreed;
    return check.done;
  }

  isChecklistDone(
    moduleKey: string,
    check: { id: string; done: boolean },
  ): boolean {
    if (this.getOpenIssue(moduleKey, check.id)) return false;
    return this.isChecklistAgreed(moduleKey, check);
  }

  onAgreedChange(
    moduleKey: string,
    check: { id: string; label: string; done: boolean },
    agreed: boolean,
  ): void {
    const key = this.draftKey(moduleKey, check.id);
    const current = this.drafts()[key] ?? {
      moduleKey,
      checklistId: check.id,
      planDone: check.done,
      agreed,
      description: '',
      severity: 'P2' as ReadinessFeedbackSeverity,
      expanded: false,
    };
    this.patchDraft(key, {
      ...current,
      agreed,
      expanded: agreed !== check.done ? true : current.expanded,
    });
  }

  openForm(moduleKey: string, check: { id: string; done: boolean }): void {
    const key = this.draftKey(moduleKey, check.id);
    this.patchDraft(key, {
      moduleKey,
      checklistId: check.id,
      planDone: check.done,
      agreed: check.done,
      description: this.drafts()[key]?.description ?? '',
      severity: this.drafts()[key]?.severity ?? 'P2',
      expanded: true,
    });
  }

  isFormVisible(moduleKey: string, check: { id: string; done: boolean }): boolean {
    const draft = this.drafts()[this.draftKey(moduleKey, check.id)];
    if (!draft?.expanded) return false;
    if (this.getOpenIssue(moduleKey, check.id)) return false;
    return draft.agreed !== check.done || draft.description.trim().length > 0;
  }

  draftDescription(moduleKey: string, checklistId: string): string {
    return this.drafts()[this.draftKey(moduleKey, checklistId)]?.description ?? '';
  }

  setDraftDescription(moduleKey: string, checklistId: string, value: string): void {
    const key = this.draftKey(moduleKey, checklistId);
    const draft = this.drafts()[key];
    if (!draft) return;
    this.patchDraft(key, { ...draft, description: value });
  }

  draftSeverity(moduleKey: string, checklistId: string): ReadinessFeedbackSeverity {
    return this.drafts()[this.draftKey(moduleKey, checklistId)]?.severity ?? 'P2';
  }

  setDraftSeverity(
    moduleKey: string,
    checklistId: string,
    value: string | number | boolean | null,
  ): void {
    const key = this.draftKey(moduleKey, checklistId);
    const draft = this.drafts()[key];
    if (!draft || typeof value !== 'string') return;
    this.patchDraft(key, { ...draft, severity: value as ReadinessFeedbackSeverity });
  }

  isSaving(moduleKey: string, checklistId: string): boolean {
    return this.savingKeys().has(this.draftKey(moduleKey, checklistId));
  }

  isResolving(issueId: string): boolean {
    return this.resolvingIds().has(issueId);
  }

  saveIssue(
    moduleKey: string,
    check: { id: string; done: boolean },
  ): void {
    const key = this.draftKey(moduleKey, check.id);
    const draft = this.drafts()[key];
    if (!draft) return;

    const description = draft.description.trim();
    if (description.length < 3) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Нужно описание',
        detail: 'Напишите, что не так (минимум 3 символа).',
        life: 4000,
      });
      return;
    }

    this.savingKeys.update((set) => new Set(set).add(key));

    this.feedbackApi
      .saveIssue({
        module_key: moduleKey,
        checklist_id: check.id,
        dispute: check.done && !draft.agreed,
        description,
        severity: draft.severity,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingKeys.update((set) => {
            const next = new Set(set);
            next.delete(key);
            return next;
          });
          this.drafts.update((all) => {
            const copy = { ...all };
            delete copy[key];
            return copy;
          });
          this.messageService.add({
            severity: 'success',
            summary: 'Замечание сохранено',
            detail: 'AI увидит его в .opencode/readiness-feedback.yaml',
            life: 4000,
          });
          this.feedbackUpdated.emit();
        },
        error: () => {
          this.savingKeys.update((set) => {
            const next = new Set(set);
            next.delete(key);
            return next;
          });
          this.messageService.add({
            severity: 'error',
            summary: 'Не удалось сохранить',
            detail: 'Проверьте права admin.settings.edit',
            life: 5000,
          });
        },
      });
  }

  resolveIssue(issue: ReadinessFeedbackIssue): void {
    this.resolvingIds.update((set) => new Set(set).add(issue.id));
    this.feedbackApi
      .resolveIssue(issue.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.resolvingIds.update((set) => {
            const next = new Set(set);
            next.delete(issue.id);
            return next;
          });
          this.messageService.add({
            severity: 'success',
            summary: 'Замечание закрыто',
            life: 3000,
          });
          this.feedbackUpdated.emit();
        },
        error: () => {
          this.resolvingIds.update((set) => {
            const next = new Set(set);
            next.delete(issue.id);
            return next;
          });
          this.messageService.add({
            severity: 'error',
            summary: 'Не удалось закрыть',
            life: 4000,
          });
        },
      });
  }

  async copyPrompt(issue: ReadinessFeedbackIssue): Promise<void> {
    const text = issue.ai_prompt?.trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      this.messageService.add({
        severity: 'info',
        summary: 'Промпт скопирован',
        life: 2500,
      });
    } catch {
      this.messageService.add({
        severity: 'warn',
        summary: 'Не удалось скопировать',
        life: 3000,
      });
    }
  }

  close(): void {
    this.visible.set(false);
  }

  statusLabel(status: string): string {
    switch (status) {
      case 'frozen':
        return 'Frozen';
      case 'locked':
        return 'Locked';
      case 'wip':
        return 'WIP';
      case 'planned':
        return 'Planned';
      default:
        return status;
    }
  }

  statusClass(status: string): string {
    if (status === 'frozen') return 'readiness-showcase__status--frozen';
    if (status === 'locked') return 'readiness-showcase__status--locked';
    if (status === 'wip') return 'readiness-showcase__status--wip';
    return '';
  }

  private patchDraft(key: string, draft: ChecklistDraft): void {
    this.drafts.update((all) => ({ ...all, [key]: draft }));
  }
}
