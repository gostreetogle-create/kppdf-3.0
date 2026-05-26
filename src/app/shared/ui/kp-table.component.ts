import { Component, input, output, model, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { ButtonModule } from 'primeng/button';
import { EmptyStateComponent } from './empty-state/empty-state.component';

// ── Types ──────────────────────────────────────────────────
export interface KpColumn {
  field: string;
  header: string;
  type: 'text' | 'number' | 'tag' | 'boolean' | 'date' | 'select' | 'textarea';
  width?: string;
  options?: { label: string; value: unknown }[];
  sortable?: boolean;
  required?: boolean;
  readonly?: boolean;
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
  selector: 'kp-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, FormsModule,
    TableModule, TagModule, TooltipModule, InputTextModule, ButtonModule,
    EmptyStateComponent,
  ],
  template: `
    <!-- Toolbar -->
    @if (showSearch() || showActions()) {
      <div class="kp-table__toolbar">
        <div class="kp-table__toolbar-left">
          @if (title(); as t) {
            <span class="kp-table__title">{{ t }}</span>
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
            <span class="p-input-icon-left kp-table__search">
              <i class="pi pi-search"></i>
              <input
                pInputText
                type="text"
                placeholder="Поиск..."
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearch($event)"
                size="small"
              />
            </span>
          }
          <ng-content select="[table-actions]" />
        </div>
      </div>
    }

    <!-- Loading -->
    @if (loading()) {
      <div class="kp-table__loading">Загрузка данных...</div>
    }

    <!-- Table -->
    @if (!loading()) {
      <p-table
        [value]="data()"
        [stripedRows]="true"
        [paginator]="paginator()"
        [rows]="limit()"
        [totalRecords]="total()"
        [rowsPerPageOptions]="rowsPerPageOptions()"
        [lazy]="true"
        [sortField]="sortField()"
        [sortOrder]="sortOrder()"
        (onPage)="onPageChange.emit($event)"
        (onSort)="onSortHandler($event)"
        size="small"
        styleClass="p-datatable-striped"
        [showCurrentPageReport]="true"
        currentPageReportTemplate="Записи {first}–{last} из {totalRecords}"
      >
        <ng-template pTemplate="header">
          <tr>
            @for (col of columns(); track col.field || $index) {
              <th
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
              <th style="width:90px">Действия</th>
            }
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            @for (col of columns(); track col.field || $index) {
              <td>
                @switch (col.type) {
                  @case ('tag') {
                    <p-tag [value]="row[col.field]" [severity]="severityFn()(row[col.field])" />
                  }
                  @case ('boolean') {
                    <i
                      class="pi boolean-indicator"
                      [class.pi-check-circle]="row[col.field]"
                      [class.pi-circle]="!row[col.field]"
                      [class.boolean-indicator--yes]="row[col.field]"
                      [class.boolean-indicator--no]="!row[col.field]"
                    ></i>
                  }
                  @case ('date') {
                    <span>{{ row[col.field] ? (row[col.field] | date:'dd.MM.yyyy') : '—' }}</span>
                  }
                  @case ('select') {
                    <span>{{ getSelectLabel(col, row[col.field]) }}</span>
                  }
                  @case ('number') {
                    <span>{{ row[col.field] ?? '—' }}</span>
                  }
                  @default {
                    <span>{{ row[col.field] ?? '—' }}</span>
                  }
                }
              </td>
            }
            @if (showRowActions()) {
              <td>
                <div class="table-actions">
                  <p-button
                    icon="pi pi-pencil"
                    [rounded]="true"
                    [text]="true"
                    severity="secondary"
                    size="small"
                    (click)="onEdit.emit(row)"
                    pTooltip="Редактировать"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [rounded]="true"
                    [text]="true"
                    severity="danger"
                    size="small"
                    (click)="onDelete.emit(row)"
                    pTooltip="Удалить"
                  />
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
                [description]="emptyMessage()"
              >
                <i empty-icon class="pi pi-inbox"></i>
              </app-empty-state>
            </td>
          </tr>
        </ng-template>
      </p-table>
    }
  `,
  styles: [`
    .kp-table__toolbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--kp-space-2, 0.5rem);
      margin-bottom: var(--kp-space-3, 0.75rem);
    }
    .kp-table__toolbar-left {
      display: flex;
      align-items: center;
      gap: var(--kp-space-2, 0.5rem);
    }
    .kp-table__toolbar-right {
      display: flex;
      align-items: center;
      gap: var(--kp-space-2, 0.5rem);
    }
    .kp-table__title {
      font-size: 1rem;
      font-weight: 600;
      color: var(--kp-text, #1e293b);
    }
    .kp-table__count {
      font-size: 0.75rem;
      color: var(--kp-text-muted, #94a3b8);
    }
    .kp-table__loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--kp-space-8, 2rem);
      color: var(--kp-text-muted, #94a3b8);
    }
  `],
})
export class KpTableComponent {
  // ── Data ──
  readonly columns = input.required<KpColumn[]>();
  readonly data = input.required<Record<string, unknown>[]>();
  readonly total = input(0);
  readonly loading = input(false);

  // ── Pagination ──
  readonly paginator = input(true);
  readonly page = model(1);
  readonly limit = model(15);
  readonly rowsPerPageOptions = input<number[]>([10, 15, 25, 50]);
  readonly sortField = model<string>('createdAt');
  readonly sortOrder = model<-1 | 1>(-1);

  // ── Search ──
  readonly showSearch = input(true);
  readonly searchQuery = model<string>('');

  // ── Toolbar ──
  readonly title = input<string>('');
  readonly showActions = input(true);

  // ── Row actions ──
  readonly showRowActions = input(true);
  readonly permCreate = input<string>('');

  // ── Empty state ──
  readonly emptyMessage = input('Нет данных');

  // ── Severity function ──
  readonly severityFn = input<(value: unknown) => string>(() => 'info');

  // ── Outputs ──
  readonly onSort = output<KpSortEvent>();
  readonly onPageChange = output<KpPageEvent>();
  readonly onSearchChange = output<string>();
  readonly onEdit = output<Record<string, unknown>>();
  readonly onDelete = output<Record<string, unknown>>();

  // ── Handlers ──
  onSortHandler(event: { field?: string; order?: number }): void {
    this.onSort.emit({
      field: event.field || 'createdAt',
      order: (event.order === 1 ? 1 : -1) as 1 | -1,
    });
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.onSearchChange.emit(value);
  }

  getSelectLabel(col: KpColumn, value: unknown): string {
    if (!col.options) return String(value ?? '—');
    const opt = col.options.find((o) => o.value === value);
    return opt?.label ?? String(value ?? '—');
  }
}
