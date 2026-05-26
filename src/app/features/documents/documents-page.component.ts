import { Component, signal, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, of, tap, catchError } from 'rxjs';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';

// Services
import { CrudApiService } from '../../shared/services/crud-api.service';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

@Component({
  selector: 'app-documents-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DatePipe, DecimalPipe, RouterModule, FormsModule,
    TableModule, ButtonModule, DialogModule,
    InputTextModule, TagModule,
    ToastModule, ConfirmDialogModule, TooltipModule, DatePickerModule,
    EmptyStateComponent,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="documents">
      <div class="documents__header">
        <div>
          <h1>Документы</h1>
          <p class="documents__subtitle">Коммерческие предложения, договоры, отгрузки и другие документы</p>
        </div>
        <div class="documents__header-actions">
          <p-button
            label="Создать КП"
            icon="pi pi-plus"
            size="small"
            (click)="createNew()"
          />
        </div>
      </div>

      <!-- КП / Заказы tabs -->
      <div class="doc-tabs">
        @for (tab of tabs; track tab.key) {
          <p-button
            [label]="tab.label"
            [icon]="tab.icon"
            [severity]="activeTab() === tab.key ? 'primary' : 'secondary'"
            [outlined]="activeTab() !== tab.key"
            (click)="selectTab(tab.key)"
            size="small"
            styleClass="doc-tabs__btn"
          />
        }
      </div>

      <!-- Toolbar -->
      <div class="documents__toolbar">
        <div class="documents__toolbar-left">
          <span class="documents__toolbar-title">
            {{ currentTab?.label }}
          </span>
          @if (!loading()) {
            <span class="documents__toolbar-count">
              {{ totalRecords() }} записей
            </span>
          }
        </div>
        <div class="documents__toolbar-right">
          <span class="p-input-icon-left doc-search">
            <i class="pi pi-search"></i>
            <input
              pInputText
              type="text"
              placeholder="Поиск..."
              [ngModel]="searchQuery()"
              (ngModelChange)="onSearch($event)"
            />
          </span>
        </div>
      </div>

      <!-- Loading -->
      @if (loading()) {
        <div class="loading-state">Загрузка...</div>
      }

      <!-- Table -->
      @if (!loading()) {
        <p-table
          [value]="rows()"
          [stripedRows]="true"
          [paginator]="true"
          [rows]="limit()"
          [totalRecords]="totalRecords()"
          [rowsPerPageOptions]="[10, 15, 25, 50]"
          [lazy]="true"
          (onPage)="onPageChange($event)"
          (onSort)="onSort($event)"
          size="small"
          styleClass="p-datatable-striped"
          [showCurrentPageReport]="true"
          currentPageReportTemplate="Записи {first}–{last} из {totalRecords}"
        >
          <ng-template pTemplate="header">
            <tr>
              <th style="width:140px">Номер</th>
              <th>Контрагент</th>
              <th style="width:120px">Дата</th>
              <th style="width:110px">Статус</th>
              <th style="width:120px">Сумма</th>
              <th style="width:90px">Действия</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr class="documents__row" (click)="editDocument(row)" style="cursor:pointer">
              <td>{{ row['number'] }}</td>
              <td>{{ row['counterpartyId'] }}</td>
              <td>{{ row['date'] ? (row['date'] | date:'dd.MM.yyyy') : '—' }}</td>
              <td>
                <p-tag [value]="row['statusId']" [severity]="getSeverity(row['statusId'])" />
              </td>
              <td>{{ row['total'] || 0 | number:'1.2-2' }}</td>
              <td>
                <div class="table-actions" (click)="$event.stopPropagation()">
                  <p-button
                    icon="pi pi-file-edit"
                    [rounded]="true"
                    [text]="true"
                    severity="secondary"
                    size="small"
                    (click)="editDocument(row)"
                    pTooltip="Редактировать"
                  />
                  <p-button
                    icon="pi pi-trash"
                    [rounded]="true"
                    [text]="true"
                    severity="danger"
                    size="small"
                    (click)="confirmDelete(row)"
                    pTooltip="Удалить"
                  />
                </div>
              </td>
            </tr>
          </ng-template>
          <ng-template pTemplate="emptymessage">
            <tr>
              <td colspan="6">
                <app-empty-state
                  [compact]="true"
                  [description]="'Нет документов. Нажмите «Создать КП» чтобы создать новый документ.'"
                >
                  <i empty-icon class="pi pi-file"></i>
                  <div empty-actions>
                    <p-button
                      label="Создать КП"
                      icon="pi pi-plus"
                      size="small"
                      (click)="createNew()"
                    />
                  </div>
                </app-empty-state>
              </td>
            </tr>
          </ng-template>
        </p-table>
      }
    </div>

    <p-toast position="top-right" />
    <p-confirmDialog />
  `,
  styleUrl: './documents-page.component.scss',
})
export class DocumentsPageComponent implements OnInit {
  private readonly crudApi = inject(CrudApiService);
  private readonly router = inject(Router);
  private readonly notification = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  readonly activeTab = signal<'quotations' | 'orders'>('quotations');
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly loading = signal(false);
  readonly totalRecords = signal(0);
  readonly page = signal(1);
  readonly limit = signal(15);
  readonly searchQuery = signal('');
  readonly sortField = signal('createdAt');
  readonly sortOrder = signal<-1 | 1>(-1);

  private readonly searchSubject = new Subject<string>();

  readonly tabs = [
    { key: 'quotations' as const, label: 'Коммерческие предложения', icon: 'pi pi-file-edit', apiPath: '/directories/quotations' },
    { key: 'orders' as const, label: 'Заказы', icon: 'pi pi-shopping-cart', apiPath: '/directories/orders' },
  ];

  get currentTab() {
    return this.tabs.find(t => t.key === this.activeTab());
  }

  constructor() {
    this.searchSubject.pipe(debounceTime(300)).subscribe(() => this.loadData());
  }

  ngOnInit(): void {
    this.loadData();
  }

  loadData(): void {
    const tab = this.currentTab;
    if (!tab) return;

    this.loading.set(true);
    this.crudApi
      .list<Record<string, unknown>>(tab.apiPath, {
        page: this.page(),
        limit: this.limit(),
        search: this.searchQuery() || undefined,
        sort: this.sortField(),
        order: this.sortOrder() === 1 ? 'asc' : 'desc',
      })
      .pipe(
        tap({
          next: (res) => {
            this.rows.set(res.data || []);
            this.totalRecords.set(res.total || 0);
          },
          error: () => {
            this.notification.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось загрузить документы' });
            this.rows.set([]);
            this.totalRecords.set(0);
          },
        }),
        catchError(() => of(null)),
      )
      .subscribe(() => this.loading.set(false));
  }

  selectTab(key: 'quotations' | 'orders'): void {
    this.activeTab.set(key);
    this.page.set(1);
    this.searchQuery.set('');
    this.loadData();
  }

  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.page.set(1);
    this.searchSubject.next(value);
  }

  onSort(event: { field: string; order: number }): void {
    this.sortField.set(event.field || 'createdAt');
    this.sortOrder.set(event.order === 1 ? 1 : -1);
    this.loadData();
  }

  onPageChange(event: { first: number; rows: number }): void {
    this.page.set(Math.floor(event.first / event.rows) + 1);
    this.limit.set(event.rows);
    this.loadData();
  }

  createNew(): void {
    this.router.navigate(['/documents', 'new']);
  }

  editDocument(row: Record<string, unknown>): void {
    const id = row['_id'] as string;
    if (id) {
      this.router.navigate(['/documents', id]);
    }
  }

  confirmDelete(row: Record<string, unknown>): void {
    const label = (row['number'] || '') as string;
    this.confirmationService.confirm({
      message: `Удалить документ «${label}»?`,
      header: 'Подтверждение удаления',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Удалить',
      rejectLabel: 'Отмена',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => this.deleteRow(row),
    });
  }

  private deleteRow(row: Record<string, unknown>): void {
    const id = row['_id'] as string;
    if (!id) return;

    this.crudApi
      .delete(this.currentTab?.apiPath || '/directories/quotations', id)
      .pipe(
        tap({
          next: () => {
            this.notification.add({ severity: 'success', summary: 'Удалено', detail: 'Документ удалён' });
            this.loadData();
          },
          error: () => {
            this.notification.add({ severity: 'error', summary: 'Ошибка', detail: 'Не удалось удалить документ' });
          },
        }),
      )
      .subscribe();
  }

  getSeverity(value: unknown): 'success' | 'warn' | 'danger' | 'info' | 'secondary' | 'contrast' {
    const map: Record<string, any> = {
      draft: 'warn', approved: 'success', sent: 'info', cancelled: 'danger',
      completed: 'success', in_progress: 'info', new: 'info',
    };
    return map[String(value)] ?? 'info';
  }
}
