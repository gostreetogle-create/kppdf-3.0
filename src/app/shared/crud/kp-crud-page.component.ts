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
import { ConfirmationService } from 'primeng/api';

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
            <p class="page__subtitle">{{ description() }}</p>
          }
        </div>
        <div page-toolbar>
          <ng-container *ngTemplateOutlet="tableBlock" />
        </div>
      </app-page-layout>
    }

    <ng-template #tableBlock>
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
      (hide)="closeDialog()"
    >
      <div class="form-layout">
        @if (formTemplate) {
          <ng-container
            [ngTemplateOutlet]="formTemplate"
            [ngTemplateOutletContext]="{ $implicit: editRow(), row: editRow() }"
          />
        } @else {
          <p class="text-secondary text-sm">Форма не задана. Используйте &lt;ng-template #form&gt;.</p>
        }
      </div>
      <div kpDialogFooter class="flex justify-end gap-2">
        <app-kp-button
          label="Отмена"
          severity="secondary"
          [outlined]="true"
          (buttonClick)="closeDialog()"
          [disabled]="store().saving()"
        />
        <app-kp-button
          label="Сохранить"
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

  readonly title = input.required<string>();
  readonly description = input<string>('');
  readonly store = input.required<CrudStore<object>>();
  readonly columns = input.required<KpColumn[]>();
  readonly permissions = input<CrudPermissions | null>(null);
  readonly createLabel = input('Создать');
  readonly embedded = input(false);
  readonly extraRowActions = input<CrudAction<Record<string, unknown>>[]>([]);
  readonly severityFn = input<(value: unknown) => string>(() => 'info');

  @ContentChild('form') formTemplate: TemplateRef<{ $implicit: Record<string, unknown>; row: Record<string, unknown> }> | null = null;

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
    this.dialogTitle.set(`Создание ${this.title()}`);
    this.dialogVisible.set(true);
  }

  openEdit(row: Record<string, unknown>): void {
    const id = row['_id'] as string | undefined;
    this.editing.set(true);
    this.editingId.set(id ?? null);
    const { _id: _idOmit, ...cleanRow } = row;
    void _idOmit;
    this.editRow.set(cleanRow);
    this.dialogTitle.set(`Редактирование ${this.title()}`);
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

  async save(): Promise<void> {
    const row = this.editRow();
    let result;
    if (this.editing() && this.editingId()) {
      result = await this.store().update(this.editingId()!, row);
    } else {
      result = await this.store().create(row);
    }
    if (result !== null) {
      this.closeDialog();
    }
  }
}
