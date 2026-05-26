import { Component, signal, computed, inject, OnInit, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Subject, debounceTime, of, tap, catchError, forkJoin } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { MODULE_PERM_PREFIX } from '../../core/permissions';
import { CrudApiService } from '../../shared/services/crud-api.service';
import { CounterpartyOptionsService } from '../../shared/services/counterparty-options.service';
import { ProductOptionsService } from '../../shared/services/product-options.service';
import { OrderOptionsService } from '../../shared/services/order-options.service';
import { WarehouseOptionsService } from '../../shared/services/warehouse-options.service';
import { ShipmentOptionsService } from '../../shared/services/shipment-options.service';
import { WorkOrderOptionsService } from '../../shared/services/work-order-options.service';
import { OperationOptionsService } from '../../shared/services/operation-options.service';

import { ConfirmationService, MessageService } from 'primeng/api';
import {
  KpTableComponent,
  KpButtonComponent,
  KpDialogComponent,
  KpToastComponent,
  KpConfirmDialogComponent,
  KpInputComponent,
  KpSelectComponent,
  KpTextareaComponent,
  KpInputNumberComponent,
  KpDatepickerComponent,
  type KpColumn,
  type KpSelectOption,
} from '../../shared/ui';

/** Справочник для полей *Id в формах модулей */
type ColumnRef =
  | 'counterparty'
  | 'product'
  | 'order'
  | 'warehouse'
  | 'shipment'
  | 'workOrder'
  | 'operation';

// ===== Column definition =====
interface ColumnDef {
  field: string;
  header: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'tag' | 'date' | 'textarea';
  ref?: ColumnRef;
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

// ===== Отделы =====
interface DepartmentGroup {
  id: string;
  label: string;
  icon: string;
  modules: ModuleConfig[];
}

const DEPARTMENTS: { id: string; label: string; icon: string }[] = [
  { id: 'office', label: 'Офис', icon: 'pi pi-building' },
  { id: 'production', label: 'Производство', icon: 'pi pi-cog' },
  { id: 'warehouse', label: 'Склад', icon: 'pi pi-warehouse' },
  { id: 'accounting', label: 'Бухгалтерия', icon: 'pi pi-calculator' },
  { id: 'admin', label: 'Администрирование', icon: 'pi pi-shield' },
];

/** Маппинг модуль → отдел */
const MODULE_DEPT: Record<string, string> = {
  interactions: 'office',
  boms: 'production',
  operations: 'production',
  'tech-processes': 'production',
  'work-order-operations': 'production',
  'purchase-requests': 'warehouse',
  warehouses: 'warehouse',
  'stock-movements': 'warehouse',
  reservations: 'warehouse',
  'cost-calculations': 'accounting',
  'actual-costs': 'accounting',
  'shipping-docs': 'accounting',
  counters: 'admin',
};

@Component({
  selector: 'app-modules-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KpToastComponent,
    KpConfirmDialogComponent,
    KpTableComponent,
    KpButtonComponent,
    KpDialogComponent,
    KpInputComponent,
    KpSelectComponent,
    KpTextareaComponent,
    KpInputNumberComponent,
    KpDatepickerComponent,
  ],
  providers: [MessageService, ConfirmationService],
  template: `
    <div class="page">
      <div class="page__header">
        <h1>Бизнес-процессы</h1>
      </div>

      <!-- Навигация по модулям (только с правом просмотра) — группировка по отделам -->
      @for (group of visibleGroups(); track group.id) {
        <div class="mod-dept">
          <div class="mod-dept__header">
            <i [class]="group.icon + ' mod-dept__icon'"></i>
            <span class="mod-dept__label">{{ group.label }}</span>
          </div>
          <div class="mod-dept__tabs">
            @for (mod of group.modules; track mod.key) {
              <app-kp-button
                [label]="mod.label"
                [icon]="mod.icon"
                [severity]="activeKey() === mod.key ? 'primary' : 'secondary'"
                [outlined]="activeKey() !== mod.key"
                (buttonClick)="selectModule(mod.key)"
                [tooltip]="mod.label"
                size="small"
                styleClass="mod-dept__btn"
              />
            }
          </div>
        </div>
      }

      <app-kp-table
        [columns]="tableColumns()"
        [data]="rows()"
        [total]="totalRecords()"
        [loading]="loading()"
        [searchQuery]="searchQuery()"
        [limit]="limit()"
        [sortField]="sortField()"
        [sortOrder]="sortOrder()"
        [title]="currentMod()?.label || ''"
        [canUpdate]="canEditModule()"
        [canDelete]="canDeleteModule()"
        [severityFn]="severityFn"
        (searchChange)="onSearch($event)"
        (pageEvent)="onPageChange($event)"
        (sortChange)="onSort($event)"
        (edit)="showEdit($event)"
        (deleteRow)="confirmDelete($event)"
      >
        @if (canCreateModule()) {
          <ng-template table-actions>
            <app-kp-button
              label="Добавить"
              icon="pi pi-plus"
              size="small"
              (buttonClick)="showAdd()"
            />
          </ng-template>
        }
      </app-kp-table>
    </div>

    <!-- ════════════════════════════════════════════════════════════
         Диалог создания/редактирования
         ════════════════════════════════════════════════════════════ -->
    <app-kp-dialog
      [visible]="dialogVisible()"
      (visibleChange)="dialogVisible.set($event)"
      [header]="dialogTitle"
      (hide)="closeDialog()"
    >
      <div class="form-layout">
        @for (col of (currentMod()?.columns || []); track col.field || $index) {
          @if (col.ref) {
            <app-kp-select
              [label]="col.header"
              [name]="col.field"
              [value]="toStr(editRow[col.field])"
              (valueChange)="editRow[col.field] = $event"
              [options]="refOptions()[col.ref] || []"
              [placeholder]="'Выберите ' + col.header.toLowerCase()"
              [required]="col.required || false"
            />
          } @else if (col.type === 'text') {
            <app-kp-input
              [label]="col.header"
              [name]="col.field"
              [value]="toStr(editRow[col.field])"
              (valueChange)="editRow[col.field] = $event"
              [required]="col.required || false"
              [readonly]="col.readonly || false"
            />
          } @else if (col.type === 'number') {
            <app-kp-input-number
              [label]="col.header"
              [name]="col.field"
              [value]="toNum(editRow[col.field])"
              (valueChange)="editRow[col.field] = $event"
              [required]="col.required || false"
            />
          } @else if (col.type === 'textarea') {
            <app-kp-textarea
              [label]="col.header"
              [name]="col.field"
              [value]="toStr(editRow[col.field])"
              (valueChange)="editRow[col.field] = $event"
              [required]="col.required || false"
            />
          } @else if (col.options && col.options.length > 0) {
            <app-kp-select
              [label]="col.header"
              [name]="col.field"
              [value]="toStr(editRow[col.field])"
              (valueChange)="editRow[col.field] = $event"
              [options]="col.options"
              [required]="col.required || false"
            />
          } @else if (col.type === 'boolean') {
            <app-kp-select
              [label]="col.header"
              [name]="col.field"
              [value]="toStr(editRow[col.field])"
              (valueChange)="editRow[col.field] = $event === 'true'"
              [options]="booleanSelectOptions"
              [required]="col.required || false"
            />
          } @else if (col.type === 'date') {
            <app-kp-datepicker
              [label]="col.header"
              [name]="col.field"
              [value]="formatDateValue(editRow[col.field])"
              (valueChange)="editRow[col.field] = $event"
              [required]="col.required || false"
            />
          }
        }
      </div>
      <div kpDialogFooter class="kp-crud-dialog__footer">
        <app-kp-button
          label="Отмена"
          severity="secondary"
          [outlined]="true"
          (buttonClick)="closeDialog()"
          [disabled]="saving()"
        />
        <app-kp-button
          label="Сохранить"
          (buttonClick)="save()"
          [loading]="saving()"
        />
      </div>
    </app-kp-dialog>

    <!-- Toast -->
    <app-kp-toast position="top-right" />
    <app-kp-confirm-dialog />
  `,
  styleUrl: './modules-page.component.scss',
})
export class ModulesPageComponent implements OnInit {
  private readonly crudApi = inject(CrudApiService);
  private readonly notification = inject(MessageService);
  private readonly confirmationService = inject(ConfirmationService);

  // Состояние
  readonly activeKey = signal<string>('boms');
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly totalRecords = signal(0);
  readonly page = signal(1);
  readonly limit = signal(15);
  readonly searchQuery = signal('');
  readonly sortField = signal('createdAt');
  readonly sortOrder = signal<-1 | 1>(-1);



  // Диалог
  dialogVisible = signal(false);
  dialogTitle = '';
  editRow: Record<string, unknown> = {};
  isEditing = false;
  editId: string | null = null;

  // Debounced search
  private readonly searchSubject = new Subject<string>();

  // ===== Определения модулей =====
  readonly modules: ModuleConfig[] = [
    {
      key: 'boms',
      label: 'BOM',
      icon: 'pi pi-sitemap',
      basePath: '/directories/boms',
      idField: '_id',
      columns: [
        { field: 'productId', header: 'Товар', type: 'text', ref: 'product' },
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
        { field: 'productId', header: 'Товар', type: 'text', ref: 'product' },
        { field: 'totalDuration', header: 'Длит. (ч)', type: 'number', width: '110px' },
        { field: 'isActive', header: 'Активна', type: 'boolean', width: '100px' },
      ],
    },
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
        { field: 'productId', header: 'Товар', type: 'text', ref: 'product' },
        { field: 'warehouseId', header: 'Склад', type: 'text', ref: 'warehouse' },
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
        { field: 'orderId', header: 'Заказ', type: 'text', ref: 'order' },
        { field: 'isActive', header: 'Активен', type: 'boolean', width: '100px' },
      ],
    },
    {
      key: 'work-order-operations',
      label: 'Операции нар.',
      icon: 'pi pi-list-check',
      basePath: '/directories/work-order-operations',
      idField: '_id',
      columns: [
        { field: 'workOrderId', header: 'Наряд', type: 'text', ref: 'workOrder' },
        { field: 'operationId', header: 'Операция', type: 'text', ref: 'operation' },
        { field: 'order', header: '№', type: 'number', width: '50px' },
        { field: 'statusId', header: 'Статус', type: 'tag', width: '110px' },
      ],
    },
    {
      key: 'cost-calculations',
      label: 'Калькуляции',
      icon: 'pi pi-calculator',
      basePath: '/cost',
      idField: '_id',
      columns: [
        { field: 'productId', header: 'Товар', type: 'text', ref: 'product' },
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
        { field: 'orderId', header: 'Заказ', type: 'text', ref: 'order' },
        { field: 'type', header: 'Тип', type: 'tag', width: '120px' },
        { field: 'amount', header: 'Сумма', type: 'number', width: '120px' },
        { field: 'date', header: 'Дата', type: 'date', width: '120px' },
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
        { field: 'shipmentId', header: 'Отгрузка', type: 'text', ref: 'shipment' },
        { field: 'totalAmount', header: 'Сумма', type: 'number', width: '120px' },
      ],
    },
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
        { field: 'counterpartyId', header: 'Контрагент', type: 'text', ref: 'counterparty' },
        { field: 'type', header: 'Тип', type: 'tag', width: '110px' },
        { field: 'description', header: 'Описание', type: 'text' },
      ],
    },
  ];

  currentMod = () => {
    return this.modules.find((m) => m.key === this.activeKey()) ?? null;
  };

  private readonly auth = inject(AuthService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly counterpartyOptionsService = inject(CounterpartyOptionsService);
  private readonly productOptionsService = inject(ProductOptionsService);
  private readonly orderOptionsService = inject(OrderOptionsService);
  private readonly warehouseOptionsService = inject(WarehouseOptionsService);
  private readonly shipmentOptionsService = inject(ShipmentOptionsService);
  private readonly workOrderOptionsService = inject(WorkOrderOptionsService);
  private readonly operationOptionsService = inject(OperationOptionsService);

  readonly refOptions = signal<Record<ColumnRef, KpSelectOption[]>>({
    counterparty: [],
    product: [],
    order: [],
    warehouse: [],
    shipment: [],
    workOrder: [],
    operation: [],
  });

  /** Маппинг модуля → префикс разрешения (для шаблона) */
  readonly modulePermPrefix = MODULE_PERM_PREFIX;

  /** Видимые модули — только те, на чтение которых есть права */
  readonly visibleModules = computed(() =>
    this.modules.filter((m) => this.auth.hasPermission(`${MODULE_PERM_PREFIX[m.key] || 'office.'}.view`)),
  );

  /** Сгруппированные по отделам видимые модули (порядок = DEPARTMENTS) */
  readonly visibleGroups = computed<DepartmentGroup[]>(() => {
    const visible = this.visibleModules();
    return DEPARTMENTS
      .map((dept) => ({
        id: dept.id,
        label: dept.label,
        icon: dept.icon,
        modules: visible.filter((m) => MODULE_DEPT[m.key] === dept.id),
      }))
      .filter((g) => g.modules.length > 0);
  });

  constructor() {
    this.searchSubject
      .pipe(debounceTime(300))
      .subscribe(() => this.loadData());
  }

  ngOnInit(): void {
    forkJoin({
      counterparty: this.counterpartyOptionsService.load(),
      product: this.productOptionsService.load(),
      order: this.orderOptionsService.load(),
      warehouse: this.warehouseOptionsService.load(),
      shipment: this.shipmentOptionsService.load(),
      workOrder: this.workOrderOptionsService.load(),
      operation: this.operationOptionsService.load(),
    })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((refs) => this.refOptions.set(refs));

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
        filters: undefined,
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
  onSort(event: { field: string; order: 1 | -1 }): void {
    this.sortField.set(event.field || 'createdAt');
    this.sortOrder.set(event.order);
    this.loadData();
  }

  readonly tableColumns = computed((): KpColumn[] => {
    const mod = this.currentMod();
    if (!mod) return [];
    const refs = this.refOptions();
    return mod.columns.map((colDef) => {
      const { ref, ...rest } = colDef;
      const col: KpColumn = { ...rest, sortable: true };
      if (ref && refs[ref]?.length) {
        col.type = 'select';
        col.options = refs[ref];
      }
      return col;
    });
  });

  readonly severityFn = (value: unknown): string => this.getSeverity(value);

  readonly booleanSelectOptions: KpSelectOption[] = [
    { label: 'Да', value: 'true' },
    { label: 'Нет', value: 'false' },
  ];

  canEditModule(): boolean {
    return this.auth.hasPermission(`${MODULE_PERM_PREFIX[this.activeKey()] || 'office.'}.edit`);
  }

  canDeleteModule(): boolean {
    return this.auth.hasPermission(`${MODULE_PERM_PREFIX[this.activeKey()] || 'office.'}.delete`);
  }

  canCreateModule(): boolean {
    return this.auth.hasPermission(`${MODULE_PERM_PREFIX[this.activeKey()] || 'office.'}.create`);
  }

  toStr(value: unknown): string {
    return String(value ?? '');
  }

  toNum(value: unknown): number | null {
    if (value == null || value === '') return null;
    return Number(value);
  }

  formatDateValue(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    if (value instanceof Date) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return String(value);
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
    this.dialogVisible.set(true);
  }

  // ===== Показать диалог редактирования =====
  showEdit(row: Record<string, unknown>): void {
    this.isEditing = true;
    this.editId = (row[this.currentMod()?.idField || '_id'] as string) ?? null;
    this.dialogTitle = `Редактирование ${this.currentMod()?.label}`;
    this.editRow = { ...row };
    this.dialogVisible.set(true);
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
    this.dialogVisible.set(false);
    this.editRow = {};
    this.editId = null;
    this.isEditing = false;
  }

  // ===== Получить отображаемое значение ячейки =====
  getCellValue(row: Record<string, unknown>, col: ColumnDef): string {
    return String(row[col.field] ?? '—');
  }

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
      raw_materials: 'info',
      production: 'warn',
      finished_goods: 'success',
      call: 'info',
      email: 'warn',
      meeting: 'success',
      note: 'secondary',
      system: 'contrast',
      receipt: 'success',
      write_off: 'danger',
      transfer_in: 'info',
      transfer_out: 'warn',
      material: 'info',
      labor: 'warn',
      overhead: 'secondary',
      torg12: 'info',
      ttn: 'warn',
      invoice: 'success',
      in_progress: 'warn',
      kp_sent: 'info',
      won: 'success',
      lost: 'danger',
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
