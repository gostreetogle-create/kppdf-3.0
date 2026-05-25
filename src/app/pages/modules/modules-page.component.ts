import { Component, signal, inject, OnInit } from '@angular/core';
import { NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, of, tap, catchError } from 'rxjs';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';

// Shared UI
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

// Service
import { CrudApiService } from '../../shared/services/crud-api.service';

// ===== Column definition =====
interface ColumnDef {
  field: string;
  header: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'tag' | 'date' | 'textarea';
  options?: { label: string; value: string }[];
  required?: boolean;
  readonly?: boolean;
  width?: string;
}

interface ModuleConfig {
  key: string;
  label: string;
  icon: string;
  basePath: string;
  idField: string;
  columns: ColumnDef[];
}

@Component({
  selector: 'app-modules-page',
  standalone: true,
  imports: [
    NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault, DatePipe,
    FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, SelectModule, TextareaModule,
    TagModule, ToastModule, ConfirmDialogModule, DatePickerModule,
    TooltipModule, EmptyStateComponent,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="page">
      <div class="page__header">
        <h1>Бизнес-процессы</h1>
      </div>

      <!-- Навигация по модулям -->
      <div class="mod-tabs">
        <p-button
          *ngFor="let mod of modules"
          [label]="mod.label"
          [icon]="mod.icon"
          [severity]="activeKey() === mod.key ? 'primary' : 'secondary'"
          [outlined]="activeKey() !== mod.key"
          (click)="selectModule(mod.key)"
          [pTooltip]="mod.label"
          tooltipPosition="bottom"
          size="small"
          styleClass="mod-tabs__btn"
        />
      </div>

      <!-- Панель инструментов -->
      <div class="page__content">
        <div class="mod-toolbar">
          <div class="mod-toolbar__left">
            <span class="mod-toolbar__title">
              {{ currentMod()?.label }}
              <span class="mod-toolbar__subtitle">
                {{ currentMod()?.basePath }}
              </span>
            </span>
            <span class="mod-toolbar__count" *ngIf="!loading()">
              {{ totalRecords() }}
              {{ totalRecords() === 1 ? 'запись' : (totalRecords() >= 2 && totalRecords() <= 4 ? 'записи' : 'записей') }}
            </span>
          </div>
          <div class="mod-toolbar__right">
            <span class="p-input-icon-left mod-search">
              <i class="pi pi-search"></i>
              <input
                pInputText
                type="text"
                class="mod-search__input"
                placeholder="Поиск..."
                [ngModel]="searchQuery()"
                (ngModelChange)="onSearch($event)"
              />
            </span>
            <p-button
              label="Добавить"
              icon="pi pi-plus"
              size="small"
              (click)="showAdd()"
            />
          </div>
        </div>

        <!-- Спиннер загрузки -->
        <div class="loading-state" *ngIf="loading()">Загрузка...</div>

        <!-- Таблица -->
        <p-table
          *ngIf="!loading()"
          [value]="rows()"
          [stripedRows]="true"
          [paginator]="true"
          [rows]="limit()"
          [totalRecords]="totalRecords()"
          [rowsPerPageOptions]="[10, 15, 25, 50]"
          [lazy]="true"
          [sortField]="sortField()"
          [sortOrder]="sortOrder()"
          (onPage)="onPageChange($event)"
          (onSort)="onSort($event)"
          size="small"
          styleClass="p-datatable-striped"
          [showCurrentPageReport]="true"
          currentPageReportTemplate="Записи {first}–{last} из {totalRecords}"
        >
          <ng-template pTemplate="header">
            <tr>
              <th *ngFor="let col of currentMod()?.columns; trackBy: trackByField" [style.width]="col.width">
                {{ col.header }}
              </th>
              <th style="width:90px">Действия</th>
            </tr>
          </ng-template>
          <ng-template pTemplate="body" let-row>
            <tr>
              <td *ngFor="let col of currentMod()?.columns; trackBy: trackByField">
                <ng-container [ngSwitch]="col.type">
                  <p-tag
                    *ngSwitchCase="'tag'"
                    [value]="row[col.field]"
                    [severity]="getSeverity(row[col.field])"
                  />
                  <span *ngSwitchCase="'boolean'">
                    <i
                      class="pi boolean-indicator"
                      [class.pi-check-circle]="row[col.field]"
                      [class.pi-circle]="!row[col.field]"
                      [class.boolean-indicator--yes]="row[col.field]"
                      [class.boolean-indicator--no]="!row[col.field]"
                    ></i>
                  </span>
                  <span *ngSwitchCase="'date'">
                    {{ row[col.field] ? (row[col.field] | date:'dd.MM.yyyy') : '—' }}
                  </span>
                  <span *ngSwitchDefault>{{ row[col.field] }}</span>
                </ng-container>
              </td>
              <td>
                <div class="table-actions">
                  <p-button
                    icon="pi pi-pencil"
                    [rounded]="true"
                    [text]="true"
                    severity="secondary"
                    size="small"
                    (click)="showEdit(row)"
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
              <td [attr.colspan]="(currentMod()?.columns?.length || 0) + 1">
                <app-empty-state
                  [compact]="true"
                  [description]="'Нет данных. Нажмите «Добавить» чтобы создать запись.'"
                >
                  <i empty-icon class="pi pi-inbox"></i>
                  <div empty-actions>
                    <p-button
                      label="Добавить"
                      icon="pi pi-plus"
                      size="small"
                      (click)="showAdd()"
                    />
                  </div>
                </app-empty-state>
              </td>
            </tr>
          </ng-template>
        </p-table>
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════
         Диалог создания/редактирования — жёсткая раскладка:
         - ширина 480px, max 90vw, modal, недраг, нерес
         - Flex-col gap-4 между полями
         - Flex-col gap-1 внутри поля (label + control)
         - w-full на всех контролах
         - Footer прижат вправо (justify-end gap-2)
         ════════════════════════════════════════════════════════════ -->
    <p-dialog
      [(visible)]="dialogVisible"
      [header]="dialogTitle"
      [modal]="true"
      [draggable]="false"
      [resizable]="false"
      [style]="{ width: '480px', maxWidth: '90vw' }"
      (onHide)="closeDialog()"
    >
      <!-- Body: flex-col gap-4 между полями -->
      <div class="flex flex-col gap-4">
        <ng-container *ngFor="let col of (currentMod()?.columns || []); trackBy: trackByField">
          <!-- Каждое поле: label + control в flex-col gap-1 -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">
              {{ col.header }}
              <span *ngIf="col.required" class="text-secondary">*</span>
            </label>

            <!-- Text (readonly для автонумерации) -->
            <input
              *ngIf="col.type === 'text'"
              pInputText
              [(ngModel)]="editRow[col.field]"
              [attr.required]="col.required ? '' : null"
              [readonly]="col.readonly || false"
              class="w-full"
              size="small"
            />

            <!-- Number -->
            <p-inputNumber
              *ngIf="col.type === 'number'"
              [(ngModel)]="editRow[col.field]"
              class="w-full"
              size="small"
            />

            <!-- Textarea -->
            <textarea
              *ngIf="col.type === 'textarea'"
              pInputTextarea
              [(ngModel)]="editRow[col.field]"
              class="w-full"
              rows="3"
            ></textarea>

            <!-- Select (если есть опции) -->
            <p-select
              *ngIf="col.options && col.options.length > 0"
              [options]="col.options || []"
              [(ngModel)]="editRow[col.field]"
              optionLabel="label"
              optionValue="value"
              placeholder="Выберите..."
              [showClear]="!col.required"
              class="w-full"
              size="small"
            />

            <!-- Boolean -->
            <p-select
              *ngIf="col.type === 'boolean'"
              [options]="booleanOptions"
              [(ngModel)]="editRow[col.field]"
              optionLabel="label"
              optionValue="value"
              placeholder="Выберите..."
              class="w-full"
              size="small"
            />

            <!-- Date -->
            <p-datepicker
              *ngIf="col.type === 'date'"
              [(ngModel)]="editRow[col.field]"
              class="w-full"
              size="small"
              dateFormat="dd.mm.yy"
            />
          </div>
        </ng-container>
      </div>

      <!-- Footer: кнопки прижаты вправо -->
      <ng-template pTemplate="footer">
        <div class="flex justify-end gap-2">
          <p-button
            label="Отмена"
            severity="secondary"
            [outlined]="true"
            size="small"
            (click)="closeDialog()"
            [disabled]="saving()"
          />
          <p-button
            label="Сохранить"
            size="small"
            (click)="save()"
            [loading]="saving()"
          />
        </div>
      </ng-template>
    </p-dialog>

    <!-- Toast -->
    <p-toast position="top-right" />
    <p-confirmDialog />
  `,
  styleUrl: './modules-page.component.scss',
})
export class ModulesPageComponent implements OnInit {
  private readonly crudApi = inject(CrudApiService);
  private readonly notification = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  // Состояние
  readonly activeKey = signal<string>('quotations');
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly totalRecords = signal(0);
  readonly page = signal(1);
  readonly limit = signal(10);
  readonly searchQuery = signal('');
  readonly sortField = signal('createdAt');
  readonly sortOrder = signal<-1 | 1>(-1);

  // Диалог
  dialogVisible = false;
  dialogTitle = '';
  editRow: Record<string, unknown> = {};
  isEditing = false;
  editId: string | null = null;

  // Debounced search
  private readonly searchSubject = new Subject<string>();

  // ===== Определения модулей =====
  readonly modules: ModuleConfig[] = [
    // ── CRM ──
    {
      key: 'quotations',
      label: 'КП',
      icon: 'pi pi-file-edit',
      basePath: '/directories/quotations',
      idField: '_id',
      columns: [
        { field: 'number', header: 'Номер', type: 'text', width: '140px', readonly: true },
        { field: 'counterpartyId', header: 'Контрагент', type: 'text' },
        { field: 'date', header: 'Дата', type: 'date', width: '120px' },
        { field: 'statusId', header: 'Статус', type: 'tag', width: '110px' },
        { field: 'total', header: 'Сумма', type: 'number', width: '120px' },
      ],
    },
    {
      key: 'orders',
      label: 'Заказы',
      icon: 'pi pi-shopping-cart',
      basePath: '/directories/orders',
      idField: '_id',
      columns: [
        { field: 'number', header: 'Номер', type: 'text', width: '140px', readonly: true },
        { field: 'counterpartyId', header: 'Контрагент', type: 'text' },
        { field: 'date', header: 'Дата', type: 'date', width: '120px' },
        { field: 'statusId', header: 'Статус', type: 'tag', width: '110px' },
        { field: 'total', header: 'Сумма', type: 'number', width: '120px' },
      ],
    },
    // ── PLM ──
    {
      key: 'boms',
      label: 'BOM',
      icon: 'pi pi-sitemap',
      basePath: '/directories/boms',
      idField: '_id',
      columns: [
        { field: 'productId', header: 'Товар', type: 'text' },
        { field: 'version', header: 'Версия', type: 'number', width: '90px' },
        { field: 'isActive', header: 'Активна', type: 'boolean', width: '100px' },
      ],
    },
    {
      key: 'operations',
      label: 'Операции',
      icon: 'pi pi-cog',
      basePath: '/directories/operations',
      idField: '_id',
      columns: [
        { field: 'number', header: '№', type: 'number', width: '60px' },
        { field: 'name', header: 'Название', type: 'text' },
        { field: 'workshop', header: 'Цех', type: 'text' },
        { field: 'duration', header: 'Длит. (ч)', type: 'number', width: '100px' },
        { field: 'costPerHour', header: 'Ст-ть часа', type: 'number', width: '110px' },
        { field: 'isActive', header: 'Активна', type: 'boolean', width: '100px' },
      ],
    },
    {
      key: 'tech-processes',
      label: 'Техпроцессы',
      icon: 'pi pi-chart-scatter',
      basePath: '/directories/tech-processes',
      idField: '_id',
      columns: [
        { field: 'productId', header: 'Товар', type: 'text' },
        { field: 'totalDuration', header: 'Длит. (ч)', type: 'number', width: '110px' },
        { field: 'isActive', header: 'Активна', type: 'boolean', width: '100px' },
      ],
    },
    // ── ERP Снабжение ──
    {
      key: 'purchase-requests',
      label: 'Заявки',
      icon: 'pi pi-send',
      basePath: '/directories/purchase-requests',
      idField: '_id',
      columns: [
        { field: 'number', header: 'Номер', type: 'text', width: '140px' },
        { field: 'date', header: 'Дата', type: 'date', width: '120px' },
        { field: 'statusId', header: 'Статус', type: 'tag', width: '110px' },
      ],
    },
    {
      key: 'purchase-orders',
      label: 'Заказы пост.',
      icon: 'pi pi-truck',
      basePath: '/directories/purchase-orders',
      idField: '_id',
      columns: [
        { field: 'number', header: 'Номер', type: 'text', width: '140px', readonly: true },
        { field: 'supplierId', header: 'Поставщик', type: 'text' },
        { field: 'orderDate', header: 'Дата', type: 'date', width: '120px' },
        { field: 'statusId', header: 'Статус', type: 'tag', width: '110px' },
        { field: 'total', header: 'Сумма', type: 'number', width: '120px' },
      ],
    },
    // ── Склад ──
    {
      key: 'warehouses',
      label: 'Склады',
      icon: 'pi pi-home',
      basePath: '/directories/warehouses',
      idField: '_id',
      columns: [
        { field: 'name', header: 'Название', type: 'text' },
        { field: 'type', header: 'Тип', type: 'tag', width: '140px' },
        { field: 'address', header: 'Адрес', type: 'text' },
        { field: 'isActive', header: 'Активен', type: 'boolean', width: '100px' },
      ],
    },
    {
      key: 'stock-movements',
      label: 'Движения',
      icon: 'pi pi-arrow-right-arrow-left',
      basePath: '/stock/movements',
      idField: '_id',
      columns: [
        { field: 'date', header: 'Дата', type: 'date', width: '120px' },
        { field: 'type', header: 'Тип', type: 'tag', width: '130px' },
        { field: 'productId', header: 'Товар', type: 'text' },
        { field: 'warehouseId', header: 'Склад', type: 'text' },
        { field: 'qty', header: 'Кол-во', type: 'number', width: '100px' },
      ],
    },
    {
      key: 'reservations',
      label: 'Резервы',
      icon: 'pi pi-lock',
      basePath: '/stock/reservations',
      idField: '_id',
      columns: [
        { field: 'orderId', header: 'Заказ', type: 'text' },
        { field: 'isActive', header: 'Активен', type: 'boolean', width: '100px' },
      ],
    },
    // ── Производство ──
    {
      key: 'work-orders',
      label: 'Наряды',
      icon: 'pi pi-wrench',
      basePath: '/directories/work-orders',
      idField: '_id',
      columns: [
        { field: 'number', header: 'Номер', type: 'text', width: '140px', readonly: true },
        { field: 'orderId', header: 'Заказ', type: 'text' },
        { field: 'productId', header: 'Товар', type: 'text' },
        { field: 'qty', header: 'Кол-во', type: 'number', width: '100px' },
        { field: 'statusId', header: 'Статус', type: 'tag', width: '110px' },
      ],
    },
    {
      key: 'work-order-operations',
      label: 'Операции нар.',
      icon: 'pi pi-list-check',
      basePath: '/directories/work-order-operations',
      idField: '_id',
      columns: [
        { field: 'workOrderId', header: 'Наряд', type: 'text' },
        { field: 'operationId', header: 'Операция', type: 'text' },
        { field: 'order', header: '№', type: 'number', width: '50px' },
        { field: 'statusId', header: 'Статус', type: 'tag', width: '110px' },
      ],
    },
    // ── Себестоимость ──
    {
      key: 'cost-calculations',
      label: 'Калькуляции',
      icon: 'pi pi-calculator',
      basePath: '/cost',
      idField: '_id',
      columns: [
        { field: 'productId', header: 'Товар', type: 'text' },
        { field: 'bomVersion', header: 'BOM', type: 'number', width: '70px' },
        { field: 'isActive', header: 'Активна', type: 'boolean', width: '100px' },
      ],
    },
    {
      key: 'actual-costs',
      label: 'Факт. затраты',
      icon: 'pi pi-money-bill',
      basePath: '/directories/actual-costs',
      idField: '_id',
      columns: [
        { field: 'orderId', header: 'Заказ', type: 'text' },
        { field: 'type', header: 'Тип', type: 'tag', width: '120px' },
        { field: 'amount', header: 'Сумма', type: 'number', width: '120px' },
        { field: 'date', header: 'Дата', type: 'date', width: '120px' },
      ],
    },
    // ── Отгрузка ──
    {
      key: 'shipments',
      label: 'Отгрузки',
      icon: 'pi pi-box',
      basePath: '/directories/shipments',
      idField: '_id',
      columns: [
        { field: 'number', header: 'Номер', type: 'text', width: '140px', readonly: true },
        { field: 'orderId', header: 'Заказ', type: 'text' },
        { field: 'date', header: 'Дата', type: 'date', width: '120px' },
        { field: 'statusId', header: 'Статус', type: 'tag', width: '110px' },
      ],
    },
    {
      key: 'shipping-docs',
      label: 'Отгруз. док.',
      icon: 'pi pi-file',
      basePath: '/directories/shipping-docs',
      idField: '_id',
      columns: [
        { field: 'number', header: 'Номер', type: 'text', width: '140px', readonly: true },
        { field: 'date', header: 'Дата', type: 'date', width: '120px' },
        { field: 'type', header: 'Тип', type: 'tag', width: '110px' },
        { field: 'shipmentId', header: 'Отгрузка', type: 'text' },
        { field: 'totalAmount', header: 'Сумма', type: 'number', width: '120px' },
      ],
    },
    // ── Администрирование ──
    {
      key: 'counters',
      label: 'Счётчики',
      icon: 'pi pi-hashtag',
      basePath: '/counters',
      idField: '_id',
      columns: [
        { field: 'entity', header: 'Сущность', type: 'text' },
        { field: 'prefix', header: 'Префикс', type: 'text', width: '100px' },
        { field: 'year', header: 'Год', type: 'number', width: '80px' },
        { field: 'seq', header: 'След. №', type: 'number', width: '90px' },
      ],
    },
    {
      key: 'interactions',
      label: 'Взаимод.',
      icon: 'pi pi-comments',
      basePath: '/directories/interactions',
      idField: '_id',
      columns: [
        { field: 'counterpartyId', header: 'Контрагент', type: 'text' },
        { field: 'type', header: 'Тип', type: 'tag', width: '110px' },
        { field: 'description', header: 'Описание', type: 'text' },
      ],
    },
  ];

  currentMod = () => this.modules.find((m) => m.key === this.activeKey()) ?? null;

  // ===== TrackBy =====
  trackByField = (index: number, item: ColumnDef): string =>
    item.field || String(index);

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300))
      .subscribe(() => this.loadData());
  }

  ngOnInit(): void {
    this.loadData();
  }

  // ===== Загрузка =====
  loadData(): void {
    const mod = this.currentMod();
    if (!mod) return;

    this.loading.set(true);
    this.crudApi
      .list<Record<string, unknown>>(mod.basePath, {
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
            this.notification.add({
              severity: 'error',
              summary: 'Ошибка загрузки',
              detail: 'Не удалось загрузить данные модуля',
            });
            this.rows.set([]);
            this.totalRecords.set(0);
          },
        }),
        catchError(() => of(null)),
      )
      .subscribe(() => this.loading.set(false));
  }

  // ===== Переключение модуля =====
  selectModule(key: string): void {
    this.activeKey.set(key);
    this.page.set(1);
    this.searchQuery.set('');
    this.sortField.set('createdAt');
    this.sortOrder.set(-1);
    this.loadData();
  }

  // ===== Поиск =====
  onSearch(value: string): void {
    this.searchQuery.set(value);
    this.page.set(1);
    this.searchSubject.next(value);
  }

  // ===== Сортировка =====
  onSort(event: { field: string; order: number }): void {
    this.sortField.set(event.field || 'createdAt');
    this.sortOrder.set(event.order === 1 ? 1 : -1);
    this.loadData();
  }

  // ===== Пагинация =====
  onPageChange(event: { first: number; rows: number }): void {
    this.page.set(Math.floor(event.first / event.rows) + 1);
    this.limit.set(event.rows);
    this.loadData();
  }

  // ===== Показать диалог добавления =====
  showAdd(): void {
    this.isEditing = false;
    this.editId = null;
    this.dialogTitle = `Создание ${this.currentMod()?.label}`;
    this.editRow = {};
    this.dialogVisible = true;
  }

  // ===== Показать диалог редактирования =====
  showEdit(row: Record<string, unknown>): void {
    this.isEditing = true;
    this.editId = (row[this.currentMod()?.idField || '_id'] as string) ?? null;
    this.dialogTitle = `Редактирование ${this.currentMod()?.label}`;
    this.editRow = { ...row };
    this.dialogVisible = true;
  }

  // ===== Подтверждение удаления =====
  confirmDelete(row: Record<string, unknown>): void {
    const label = (row['number'] || row['name'] || row['entity'] || row['productId'] || '') as string;
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

  // ===== Удаление =====
  private deleteRow(row: Record<string, unknown>): void {
    const id = row[this.currentMod()?.idField || '_id'] as string;
    if (!id) return;

    this.saving.set(true);
    this.crudApi
      .delete(this.currentMod()?.basePath || '', id)
      .pipe(
        tap({
          next: () => {
            this.notification.add({
              severity: 'success',
              summary: 'Удалено',
              detail: 'Запись успешно удалена',
            });
            this.loadData();
          },
          error: () => {
            this.notification.add({
              severity: 'error',
              summary: 'Ошибка удаления',
              detail: 'Не удалось удалить запись',
            });
          },
        }),
      )
      .subscribe(() => this.saving.set(false));
  }

  // ===== Сохранение =====
  save(): void {
    const mod = this.currentMod();
    if (!mod) return;

    // Валидация required полей
    for (const col of mod.columns) {
      if (col.required && !this.editRow[col.field]) {
        this.notification.add({
          severity: 'warn',
          summary: 'Проверьте форму',
          detail: `Поле «${col.header}» обязательно`,
        });
        return;
      }
    }

    this.saving.set(true);

    if (this.isEditing && this.editId) {
      this.crudApi
        .update(mod.basePath, this.editId, this.editRow)
        .pipe(
          tap({
            next: () => {
              this.notification.add({
                severity: 'success',
                summary: 'Обновлено',
                detail: 'Запись успешно обновлена',
              });
              this.closeDialog();
              this.loadData();
            },
            error: () => {
              this.notification.add({
                severity: 'error',
                summary: 'Ошибка обновления',
                detail: 'Не удалось обновить запись',
              });
            },
          }),
        )
        .subscribe(() => this.saving.set(false));
    } else {
      this.crudApi
        .create(mod.basePath, this.editRow)
        .pipe(
          tap({
            next: () => {
              this.notification.add({
                severity: 'success',
                summary: 'Создано',
                detail: 'Запись успешно создана',
              });
              this.closeDialog();
              this.loadData();
            },
            error: () => {
              this.notification.add({
                severity: 'error',
                summary: 'Ошибка создания',
                detail: 'Не удалось создать запись',
              });
            },
          }),
        )
        .subscribe(() => this.saving.set(false));
    }
  }

  // ===== Закрыть диалог =====
  closeDialog(): void {
    this.dialogVisible = false;
    this.editRow = {};
    this.editId = null;
    this.isEditing = false;
  }

  // ===== Опции для булевых полей =====
  readonly booleanOptions = [
    { label: 'Да', value: true },
    { label: 'Нет', value: false },
  ];

  // ===== Severity для Tag =====
  getSeverity(value: unknown): 'success' | 'warn' | 'danger' | 'info' | 'secondary' | 'contrast' {
    const map: Record<string, 'success' | 'warn' | 'danger' | 'info' | 'secondary' | 'contrast'> = {
      new: 'info',
      draft: 'warn',
      active: 'success',
      approved: 'success',
      shipped: 'info',
      delivered: 'success',
      cancelled: 'danger',
      archived: 'danger',
      pending: 'warn',
      completed: 'success',
      true: 'info',
      false: 'secondary',
      // warehouse types
      raw_materials: 'info',
      production: 'warn',
      finished_goods: 'success',
      // interaction types
      call: 'info',
      email: 'warn',
      meeting: 'success',
      note: 'secondary',
      system: 'contrast',
      // movement types
      receipt: 'success',
      write_off: 'danger',
      transfer_in: 'info',
      transfer_out: 'warn',
      // cost types
      material: 'info',
      labor: 'warn',
      overhead: 'secondary',
      // doc types
      torg12: 'info',
      ttn: 'warn',
      invoice: 'success',
      // active/inactive
      Резерв: 'warn',
      'В работе': 'info',
      Выполнено: 'success',
      Отменён: 'danger',
      Черновик: 'warn',
    };
    const key = typeof value === 'string' ? value : String(value);
    return map[key] ?? 'info';
  }
}
