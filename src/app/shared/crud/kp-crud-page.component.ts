import {
  Component,
  OnInit,
  input,
  ContentChild,
  TemplateRef,
  inject,
  model,
  signal,
  computed,
  ChangeDetectionStrategy,
} from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { ConfirmationService, MessageService } from 'primeng/api';

import { PageLayoutComponent } from '../ui/page-layout/page-layout.component';
import { KpTableComponent } from '../ui/kp-table.component';
import type { KpColumn } from '../ui/kp-table.component';
import { KpButtonComponent } from '../ui/kp-button.component';
import { KpDialogComponent, KpToastComponent, KpConfirmDialogComponent } from '../ui';
import { AuthService } from '../../core/auth.service';
import { CrudStore } from '../services/crud-store.service';
import type { CrudPermissions, CrudAction } from './crud-page.types';

@Component({
  selector: 'app-kp-crud-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgTemplateOutlet,
    KpToastComponent,
    KpConfirmDialogComponent,
    PageLayoutComponent,
    KpTableComponent,
    KpButtonComponent,
    KpDialogComponent,
  ],
  styleUrl: './kp-crud-page.component.scss',
  template: `
    @if (embedded()) {
      <div class="kp-crud-page kp-crud-page--embedded">
        <ng-container *ngTemplateOutlet="tableBlock" />
      </div>
    } @else {
      <app-page-layout>
        <div page-header class="page__header">
          <h1>{{ title() }}</h1>
          @if (description()) {
            <p class="page__subtitle page__subtitle--end">{{ description() }}</p>
          }
        </div>
        <div page-toolbar>
          <ng-container *ngTemplateOutlet="tableBlock" />
        </div>
      </app-page-layout>
    }

    <ng-template #tableBlock>
      @if (store().error() && !store().loading()) {
        <div class="kp-crud-page__error" role="alert">
          <i class="pi pi-exclamation-triangle kp-crud-page__error-icon" aria-hidden="true"></i>
          <span class="kp-crud-page__error-text">{{ store().error() }}</span>
          <app-kp-button
            label="Повторить"
            icon="pi pi-refresh"
            size="small"
            severity="secondary"
            [outlined]="true"
            (buttonClick)="retryLoad()"
          />
        </div>
      }
      <div class="kp-crud-page__table">
        <app-kp-table
          [columns]="columns()"
          [data]="store().items()"
          [total]="store().total()"
          [loading]="store().loading()"
          [searchQuery]="store().search()"
          [title]="embedded() ? title() : ''"
          [showRowActions]="showRowActions()"
          [canUpdate]="canUpdate()"
          [canDelete]="canDelete()"
          [severityFn]="severityFn()"
          (searchChange)="store().setSearch($event)"
          (pageEvent)="store().handlePageChange($event)"
          (sortChange)="store().handleSort($event)"
          (edit)="openEdit($event)"
          (deleteRow)="confirmDelete($event)"
        >
          @if (canCreate()) {
            <ng-template table-actions>
              <app-kp-button
                [label]="createLabel()"
                icon="pi pi-plus"
                size="small"
                (buttonClick)="openCreate()"
              />
            </ng-template>
          }
        </app-kp-table>
      </div>
    </ng-template>

    <app-kp-dialog
      [(visible)]="dialogVisible"
      [header]="dialogTitle()"
      [width]="dialogWidth()"
      (hide)="closeDialog()"
    >
      @if (formTemplate) {
        <ng-container
          [ngTemplateOutlet]="formTemplate"
          [ngTemplateOutletContext]="{ $implicit: editRow(), row: editRow(), id: editingId() }"
        />
      } @else {
        <p class="kp-crud-dialog__empty">Форма не задана. Используйте &lt;ng-template #form&gt;.</p>
      }
      <div kpDialogFooter class="kp-crud-dialog__footer">
        <app-kp-button
          label="Отмена"
          severity="secondary"
          size="small"
          [outlined]="true"
          (buttonClick)="closeDialog()"
          [disabled]="store().saving()"
        />
        <app-kp-button
          label="Сохранить"
          size="small"
          (buttonClick)="save()"
          [loading]="store().saving()"
        />
      </div>
    </app-kp-dialog>

    <app-kp-toast position="top-right" />
    <app-kp-confirm-dialog />
  `,
})
export class KpCrudPageComponent implements OnInit {
  ngOnInit(): void {
    this.store().load();
  }

  private readonly auth = inject(AuthService);
  private readonly confirmationService = inject(ConfirmationService);
  private readonly messageService = inject(MessageService);

  readonly title = input.required<string>();
  /** Подпись сущности в родительном падеже для заголовка диалога, напр. «коммерческого предложения». */
  readonly entityLabel = input<string>('');
  readonly dialogWidth = input('520px');
  readonly description = input<string>('');
  readonly store = input.required<CrudStore<object>>();
  readonly columns = input.required<KpColumn[]>();
  readonly permissions = input<CrudPermissions | null>(null);
  readonly createLabel = input('Создать');
  readonly embedded = input(false);
  readonly extraRowActions = input<CrudAction<Record<string, unknown>>[]>([]);
  readonly severityFn = input<(value: unknown) => string>(() => 'info');

  @ContentChild('form') formTemplate: TemplateRef<{ $implicit: Record<string, unknown>; row: Record<string, unknown>; id: string | null }> | null = null;

  readonly dialogVisible = model(false);
  readonly editing = signal(false);
  readonly editingId = signal<string | null>(null);
  readonly editRow = signal<Record<string, unknown>>({});
  readonly dialogTitle = signal('');

  readonly showRowActions = computed(() => {
    const perms = this.permissions();
    return !!(perms?.update || perms?.delete || this.extraRowActions().length > 0);
  });

  readonly canCreate = computed(() => {
    const perms = this.permissions();
    return !perms?.create || this.auth.hasPermission(perms.create);
  });

  readonly canUpdate = computed(() => {
    const perms = this.permissions();
    return !perms?.update || this.auth.hasPermission(perms.update);
  });

  readonly canDelete = computed(() => {
    const perms = this.permissions();
    return !perms?.delete || this.auth.hasPermission(perms.delete);
  });

  openCreate(): void {
    this.editing.set(false);
    this.editingId.set(null);
    this.editRow.set({});
    this.dialogTitle.set(this.buildDialogTitle('create'));
    this.dialogVisible.set(true);
  }

  openEdit(row: Record<string, unknown>): void {
    const id = row['_id'] as string | undefined;
    this.editing.set(true);
    this.editingId.set(id ?? null);
    const { _id: _idOmit, ...cleanRow } = row;
    void _idOmit;
    this.editRow.set(cleanRow);
    this.dialogTitle.set(this.buildDialogTitle('edit'));
    this.dialogVisible.set(true);
  }

  closeDialog(): void {
    this.dialogVisible.set(false);
    this.editRow.set({});
    this.editingId.set(null);
    this.editing.set(false);
  }

  confirmDelete(row: Record<string, unknown>): void {
    const label = (row['name'] || row['label'] || row['title'] || row['_id'] || '') as string;
    this.confirmationService.confirm({
      message: `Удалить «${label}»?`,
      header: 'Подтверждение удаления',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Удалить',
      rejectLabel: 'Отмена',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteRow(row),
    });
  }

  private deleteRow(row: Record<string, unknown>): void {
    const id = row['_id'] as string | undefined;
    if (id) {
      this.store().delete(id);
    }
  }

  private buildDialogTitle(mode: 'create' | 'edit'): string {
    const entity = this.entityLabel().trim();
    if (entity) {
      return mode === 'create' ? `Создание ${entity}` : `Редактирование ${entity}`;
    }
    const title = this.title();
    return mode === 'create' ? `Создание: ${title}` : `Редактирование: ${title}`;
  }

  retryLoad(): void {
    this.store().load();
  }

  async save(): Promise<void> {
    const row = this.editRow();
    let result;
    try {
      if (this.editing() && this.editingId()) {
        result = await this.store().update(this.editingId()!, row);
      } else {
        result = await this.store().create(row);
      }
      if (result !== null) {
        this.closeDialog();
      } else {
        this.messageService.add({
          severity: 'error',
          summary: 'Ошибка сохранения',
          detail: 'Не удалось сохранить запись. Попробуйте ещё раз.',
          life: 4000,
        });
      }
    } catch (err) {
      this.messageService.add({
        severity: 'error',
        summary: 'Ошибка',
        detail: err instanceof Error ? err.message : 'Произошла непредвиденная ошибка',
        life: 5000,
      });
    }
  }
}
