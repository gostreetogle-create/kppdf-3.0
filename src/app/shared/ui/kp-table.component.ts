import { Component, input, output, model, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { InputTextModule } from 'primeng/inputtext';
import { EmptyStateComponent } from './empty-state/empty-state.component';
import { KpButtonComponent } from './kp-button.component';

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
  selector: 'app-kp-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, FormsModule,
    TableModule, TagModule, TooltipModule, InputTextModule,
    EmptyStateComponent, KpButtonComponent,
  ],
  template: `
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
              <i class="pi pi-search" aria-hidden="true"></i>
              <label class="visually-hidden" [attr.for]="searchInputId">Поиск</label>
              <input
                [id]="searchInputId"
                pInputText
                type="search"
                placeholder="Поиск..."
                [attr.aria-label]="'Поиск'"
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

    @if (loading()) {
      <div class="kp-table__loading" role="status">Загрузка данных...</div>
    }

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
        (onPage)="pageEvent.emit($event)"
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
              <th class="kp-table__actions-col">Действия</th>
            }
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            @for (col of columns(); track col.field || $index) {
              <td>
                @switch (col.type) {
                  @case ('tag') {
                    <p-tag [value]="row[col.field]" [severity]="($any(severityFn())(row[col.field]))" />
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
                  @if (canUpdate()) {
                    <app-kp-button
                      icon="pi pi-pencil"
                      [rounded]="true"
                      [text]="true"
                      severity="secondary"
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
                      size="small"
                      tooltip="Удалить"
                      ariaLabel="Удалить"
                      (buttonClick)="deleteRow.emit(row)"
                    />
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
  styleUrl: './kp-table.component.scss',
})
export class KpTableComponent {
  readonly searchInputId = `kp-search-${Math.random().toString(36).slice(2, 9)}`;

  readonly columns = input.required<KpColumn[]>();
  readonly data = input.required<object[]>();
  readonly total = input(0);
  readonly loading = input(false);

  readonly paginator = input(true);
  readonly page = model(1);
  readonly limit = model(15);
  readonly rowsPerPageOptions = input<number[]>([10, 15, 25, 50]);
  readonly sortField = model<string>('createdAt');
  readonly sortOrder = model<-1 | 1>(-1);

  readonly showSearch = input(true);
  readonly searchQuery = model<string>('');

  readonly title = input<string>('');
  readonly showActions = input(true);
  readonly showToolbarTitle = input(true);

  readonly showRowActions = input(true);
  readonly canUpdate = input(true);
  readonly canDelete = input(true);

  readonly emptyMessage = input('Нет данных');
  readonly severityFn = input<(value: unknown) => string>(() => 'info');

  readonly sortChange = output<KpSortEvent>();
  readonly pageEvent = output<KpPageEvent>();
  readonly searchChange = output<string>();
  readonly edit = output<Record<string, unknown>>();
  readonly deleteRow = output<Record<string, unknown>>();

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

  getSelectLabel(col: KpColumn, value: unknown): string {
    if (!col.options) return String(value ?? '—');
    const opt = col.options.find((o) => o.value === value);
    return opt?.label ?? String(value ?? '—');
  }
}
