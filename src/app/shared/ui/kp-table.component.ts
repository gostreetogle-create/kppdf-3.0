import { Component, input, output, model, computed, inject, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { EmptyStateComponent } from './empty-state/empty-state.component';
import { KpButtonComponent } from './kp-button.component';
import { KpSearchComponent } from './kp-search.component';
import { KpTagComponent } from './kp-tag.component';
import { KpPaginatorComponent } from './kp-paginator.component';
import { AuthService } from '../../core/auth.service';
import type { CrudAction } from '../crud/crud-page.types';

export interface KpColumn {
  field: string;
  header: string;
  type: 'text' | 'number' | 'tag' | 'boolean' | 'date' | 'select' | 'textarea' | 'image';
  width?: string;
  options?: { label: string; value: unknown }[];
  sortable?: boolean;
  required?: boolean;
  readonly?: boolean;
  /** Однострочное обрезание с «…» (по умолчанию для text/select) */
  ellipsis?: boolean;
  /** Многострочное обрезание (2 строки) для длинных тем */
  maxLines?: 1 | 2;
}

export interface KpSortEvent {
  field: string;
  order: 1 | -1;
}

export interface KpPageEvent {
  first: number;
  rows: number;
}

@Component({
  selector: 'app-kp-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, FormsModule,
    TableModule,
    EmptyStateComponent, KpButtonComponent, KpSearchComponent, KpTagComponent,
    KpPaginatorComponent, NgTemplateOutlet,
  ],
  template: `
    <div class="kp-table-panel">
      @if (showToolbar()) {
        <div class="kp-table__toolbar">
          <div class="kp-table__toolbar-left">
            @if (showToolbarTitle() && title()) {
              <span class="kp-table__title">{{ title() }}</span>
            }
            @if (!loading()) {
              <span class="kp-table__count">
                {{ total() }}
                {{ total() === 1 ? 'запись' : (total() >= 2 && total() <= 4 ? 'записи' : 'записей') }}
              </span>
            }
          </div>
          <div class="kp-table__toolbar-right">
            @if (showSearch()) {
              <app-kp-search
                [(query)]="searchQuery"
                placeholder="Поиск..."
                [debounceMs]="300"
                (searchChange)="onSearch($event)"
              />
            }
            <ng-content select="[table-actions]" />
          </div>
        </div>
      }

      @if (loading()) {
        <div class="kp-table__loading" role="status">Загрузка данных...</div>
      }

      @if (!loading()) {
        <div class="kp-table__scroll">
        <p-table
          [value]="data()"
          [stripedRows]="true"
          [resizableColumns]="true"
          [paginator]="false"
          [lazy]="true"
          [sortField]="sortField()"
          [sortOrder]="sortOrder()"
          (onSort)="onSortHandler($event)"
          size="small"
          styleClass="p-datatable-striped kp-table__datatable"
        >
          <ng-template pTemplate="header">
            <tr>
              @for (col of columns(); track col.field || $index) {
                <th
                  pResizableColumn
                  [style.width]="col.width"
                  [pSortableColumn]="col.sortable !== false ? col.field : undefined"
                >
                  {{ col.header }}
                  @if (col.sortable !== false) {
                    <p-sortIcon [field]="col.field" />
                  }
                </th>
              }
              @if (showRowActions()) {
                <th class="kp-table__actions-col">Действия</th>
              }
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              @for (col of columns(); track col.field || $index) {
                <td [class.kp-table__td--tag]="col.type === 'tag'">
                  @switch (col.type) {
                    @case ('tag') {
                      <app-kp-tag
                        [value]="getSelectLabel(col, row[col.field])"
                        [severity]="($any(severityFn())(row[col.field]))"
                      />
                    }
                    @case ('boolean') {
                      <span class="kp-table__bool">
                        <i
                          class="pi boolean-indicator"
                          [class.pi-check-circle]="row[col.field]"
                          [class.pi-circle]="!row[col.field]"
                          [class.boolean-indicator--yes]="row[col.field]"
                          [class.boolean-indicator--no]="!row[col.field]"
                          aria-hidden="true"
                        ></i>
                        <span class="visually-hidden">{{ row[col.field] ? 'Да' : 'Нет' }}</span>
                      </span>
                    }
                    @case ('date') {
                      <span class="kp-table__date">{{ row[col.field] ? (row[col.field] | date:'dd.MM.yyyy') : '—' }}</span>
                    }
                    @case ('image') {
                      <ng-container
                        *ngTemplateOutlet="photoPreview; context: { $implicit: row[col.field] }"
                      />
                    }
                    @case ('select') {
                      <span
                        class="kp-table__text"
                        [class.kp-table__text--ellipsis]="useEllipsis(col)"
                        [class.kp-table__text--lines-2]="col.maxLines === 2"
                        [attr.title]="cellTitle(col, row[col.field])"
                      >{{ getSelectLabel(col, row[col.field]) }}</span>
                    }
                    @case ('number') {
                      <span class="kp-table__number">{{ row[col.field] ?? '—' }}</span>
                    }
                    @default {
                      <span
                        class="kp-table__text"
                        [class.kp-table__text--ellipsis]="useEllipsis(col)"
                        [class.kp-table__text--lines-2]="col.maxLines === 2"
                        [attr.title]="cellTitle(col, row[col.field])"
                      >{{ formatCell(row[col.field]) }}</span>
                    }
                  }
                </td>
              }
              @if (showRowActions()) {
                <td>
                  <div class="table-actions">
                    @if (canUpdate()) {
                      <app-kp-button
                        icon="pi pi-pencil"
                        [rounded]="true"
                        [text]="true"
                        severity="secondary"
                        variant="flat"
                        size="small"
                        tooltip="Редактировать"
                        ariaLabel="Редактировать"
                        (buttonClick)="edit.emit(row)"
                      />
                    }
                    @if (canDelete()) {
                      <app-kp-button
                        icon="pi pi-trash"
                        [rounded]="true"
                        [text]="true"
                        severity="danger"
                        variant="flat"
                        size="small"
                        tooltip="Удалить"
                        ariaLabel="Удалить"
                        (buttonClick)="deleteRow.emit(row)"
                      />
                    }
                    @for (action of extraRowActions(); track action.id) {
                      @if (canExecAction(action) && (!action.visible || action.visible(row))) {
                        <app-kp-button
                          [icon]="action.icon || 'pi pi-bolt'"
                          [rounded]="true"
                          [text]="true"
                          [severity]="resolveButtonSeverity(action.severity)"
                          variant="flat"
                          size="small"
                          [tooltip]="action.label"
                          [ariaLabel]="action.label"
                          (buttonClick)="action.handler(row)"
                        />
                      }
                    }
                  </div>
                </td>
              }
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td [attr.colspan]="columns().length + (showRowActions() ? 1 : 0)">
                <app-empty-state
                  [compact]="true"
                  title="Нет данных"
                  [description]="emptyMessage()"
                >
                  <i empty-icon class="pi pi-inbox" aria-hidden="true"></i>
                </app-empty-state>
              </td>
            </tr>
          </ng-template>
        </p-table>
        </div>

        @if (paginator() && total() > 0) {
          <app-kp-paginator
            [first]="paginatorFirst()"
            [rows]="limit()"
            [totalRecords]="total()"
            [rowsPerPageOptions]="rowsPerPageOptions()"
            (pageChange)="onPaginatorPageChange($event)"
          />
        }
      }
    </div>

    <ng-template #photoPreview let-photos>
      @if (getFirstPhoto(photos)) {
        <img
          class="kp-table__photo-thumb"
          [src]="getFirstPhoto(photos)"
          alt="Фото"
          loading="lazy"
        />
      } @else {
        <span class="kp-table__photo-empty" aria-label="Нет фото">
          <i class="pi pi-image" aria-hidden="true"></i>
        </span>
      }
    </ng-template>
  `,
  styleUrl: './kp-table.component.scss',
})
export class KpTableComponent {
  private readonly authService = inject(AuthService);

  readonly columns = input.required<KpColumn[]>();
  readonly data = input.required<object[]>();
  readonly total = input(0);
  readonly loading = input(false);

  readonly paginator = input(true);
  readonly page = model(1);
  readonly limit = model(15);
  readonly rowsPerPageOptions = input<number[]>([10, 25, 50]);
  readonly sortField = model<string>('createdAt');
  readonly sortOrder = model<-1 | 1>(-1);

  readonly showSearch = input(true);
  readonly searchQuery = model<string>('');

  readonly title = input<string>('');
  readonly showToolbarTitle = input(true);
  readonly showActions = input(true);

  readonly showRowActions = input(true);
  readonly canUpdate = input(true);
  readonly canDelete = input(true);
  readonly extraRowActions = input<CrudAction<Record<string, unknown>>[]>([]);

  readonly emptyMessage = input('Нет данных');
  readonly severityFn = input<(value: unknown) => string>(() => 'info');

  readonly sortChange = output<KpSortEvent>();
  readonly pageEvent = output<KpPageEvent>();
  readonly searchChange = output<string>();
  readonly edit = output<Record<string, unknown>>();
  readonly deleteRow = output<Record<string, unknown>>();

  /** first-индекс текущей страницы (0-based), вычисляется из page и limit */
  readonly paginatorFirst = computed(() => (this.page() - 1) * this.limit());

  /** Тулбар всегда виден: поиск, действия и/или счётчик записей */
  readonly showToolbar = computed(
    () => this.showSearch() || this.showActions() || this.showToolbarTitle(),
  );

  /** UniButton: только primary | secondary | danger */
  resolveButtonSeverity(
    severity?: CrudAction<Record<string, unknown>>['severity'],
  ): 'primary' | 'secondary' | 'danger' {
    if (severity === 'danger') return 'danger';
    if (severity === 'secondary') return 'secondary';
    return 'primary';
  }

  getFirstPhoto(value: unknown): string | null {
    if (Array.isArray(value) && value.length > 0) {
      const first = value[0];
      if (typeof first === 'object' && first !== null && 'url' in first) {
        return (first as { url: string }).url || null;
      }
      if (typeof first === 'string') return (first as string).trim() || null;
    }
    if (typeof value === 'string' && value.trim()) {
      const parts = value.split(/[,;\n]+/).map((s: string) => s.trim()).filter(Boolean);
      return parts[0] || null;
    }
    return null;
  }

  onSortHandler(event: { field?: string; order?: number }): void {
    this.sortChange.emit({
      field: event.field || 'createdAt',
      order: (event.order === 1 ? 1 : -1) as 1 | -1,
    });
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.searchChange.emit(value);
  }

  onPaginatorPageChange(event: { first: number; rows: number }): void {
    const page = Math.floor(event.first / event.rows) + 1;
    this.page.set(page);
    this.limit.set(event.rows);
    this.pageEvent.emit(event);
  }

  getSelectLabel(col: KpColumn, value: unknown): string {
    if (!col.options) return String(value ?? '—');
    const opt = col.options.find((o) => o.value === value);
    return opt?.label ?? String(value ?? '—');
  }

  formatCell(value: unknown): string {
    if (value == null || value === '') return '—';
    return String(value);
  }

  useEllipsis(col: KpColumn): boolean {
    if (col.maxLines === 2) return false;
    if (col.ellipsis === false) return false;
    return col.type === 'text' || col.type === 'select' || col.type === 'textarea';
  }

  canExecAction(action: CrudAction<Record<string, unknown>>): boolean {
    if (!action.permission) return true;
    return this.authService.hasPermission(action.permission);
  }

  cellTitle(col: KpColumn, value: unknown): string | null {
    if (!this.useEllipsis(col) && col.maxLines !== 2) return null;
    const text =
      col.type === 'select'
        ? this.getSelectLabel(col, value)
        : this.formatCell(value);
    return text === '—' ? null : text;
  }
}
