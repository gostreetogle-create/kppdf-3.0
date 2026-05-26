import { Component, signal, computed, inject, OnInit, ChangeDetectionStrategy } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, debounceTime, of, tap, catchError } from 'rxjs';
import { AuthService } from '../../core/auth.service';
import { HasPermissionDirective } from '../../shared/directives/has-permission.directive';
import { MODULE_PERM_PREFIX } from '../../core/permissions';

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
  tenders: 'office',
  quotations: 'office',
  orders: 'office',
  interactions: 'office',
  'product-passports': 'production',
  boms: 'production',
  operations: 'production',
  'tech-processes': 'production',
  'work-orders': 'production',
  'work-order-operations': 'production',
  'purchase-requests': 'warehouse',
  'purchase-orders': 'warehouse',
  warehouses: 'warehouse',
  'stock-movements': 'warehouse',
  reservations: 'warehouse',
  shipments: 'warehouse',
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
    DatePipe, FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, SelectModule, TextareaModule,
    TagModule, ToastModule, ConfirmDialogModule, DatePickerModule,
    TooltipModule, EmptyStateComponent, HasPermissionDirective,
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
              <p-button
                [label]="mod.label"
                [icon]="mod.icon"
                [severity]="activeKey() === mod.key ? 'primary' : 'secondary'"
                [outlined]="activeKey() !== mod.key"
                (click)="selectModule(mod.key)"
                [pTooltip]="mod.label"
                tooltipPosition="bottom"
                size="small"
                styleClass="mod-dept__btn"
              />
            }
          </div>
        </div>
      }

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
            @if (!loading()) {
              <span class="mod-toolbar__count">
                {{ totalRecords() }}
                {{ totalRecords() === 1 ? 'запись' : (totalRecords() >= 2 && totalRecords() <= 4 ? 'записи' : 'записей') }}
              </span>
            }
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
              *appHasPermission="(modulePermPrefix[activeKey()] || 'office.') + '.create'"
              label="Добавить"
              icon="pi pi-plus"
              size="small"
              (click)="showAdd()"
            />
          </div>
        </div>

        <!-- Фильтры (только для тендеров) -->
        @if (activeKey() === 'tenders') {
          <div class="mod-filters">
            <p-select
              [options]="companyOptions()"
              [(ngModel)]="selectedCompanyFilter"
              (ngModelChange)="onFilterChange()"
              optionLabel="label"
              optionValue="value"
              placeholder="Все компании"
              [showClear]="true"
              class="mod-filters__select"
              size="small"
            />
            <p-select
              [options]="tenderStatusOptions"
              [(ngModel)]="selectedStatusFilter"
              (ngModelChange)="onFilterChange()"
              optionLabel="label"
              optionValue="value"
              placeholder="Все статусы"
              [showClear]="true"
              class="mod-filters__select"
              size="small"
            />
          </div>
        }

        <!-- Спиннер загрузки -->
        @if (loading()) {
          <div class="loading-state">Загрузка...</div>
        }

        <!-- Таблица -->
        @if (!loading()) {
          <p-table
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
                @for (col of currentMod()?.columns; track col.field || $index) {
                  <th [style.width]="col.width">{{ col.header }}</th>
                }
                <th style="width:90px">Действия</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-row>
              <tr>
                @for (col of currentMod()?.columns; track col.field || $index) {
                  <td>
                    @switch (col.type) {
                      @case ('tag') {
                        <p-tag [value]="row[col.field]" [severity]="getSeverity(row[col.field])" />
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
                      @default {
                        <span>{{ getCellValue(row, col) }}</span>
                      }
                    }
                  </td>
                }
                <td>
                  <div class="table-actions">
                    <p-button
                      *appHasPermission="(modulePermPrefix[activeKey()] || 'office.') + '.edit'"
                      icon="pi pi-pencil"
                      [rounded]="true"
                      [text]="true"
                      severity="secondary"
                      size="small"
                      (click)="showEdit(row)"
                      pTooltip="Редактировать"
                    />
                    <p-button
                      *appHasPermission="(modulePermPrefix[activeKey()] || 'office.') + '.delete'"
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
                        *appHasPermission="(modulePermPrefix[activeKey()] || 'office.') + '.create'"
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
        }
      </div>
    </div>

    <!-- ════════════════════════════════════════════════════════════
         Диалог создания/редактирования
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
        @for (col of (currentMod()?.columns || []); track col.field || $index) {
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">
              {{ col.header }}
              @if (col.required) { <span class="text-secondary">*</span> }
            </label>

            @if (col.type === 'text') {
              <input
                pInputText
                [(ngModel)]="editRow[col.field]"
                [attr.required]="col.required ? '' : null"
                [readonly]="col.readonly || false"
                class="w-full"
                size="small"
              />
            } @else if (col.type === 'number') {
              <p-inputNumber
                [(ngModel)]="editRow[col.field]"
                class="w-full"
                size="small"
              />
            } @else if (col.type === 'textarea') {
              <textarea
                pInputTextarea
                [(ngModel)]="editRow[col.field]"
                class="w-full"
                rows="3"
              ></textarea>
            } @else if (col.options && col.options.length > 0) {
              <p-select
                [options]="col.options || []"
                [(ngModel)]="editRow[col.field]"
                optionLabel="label"
                optionValue="value"
                placeholder="Выберите..."
                [showClear]="!col.required"
                class="w-full"
                size="small"
              />
            } @else if (col.type === 'boolean') {
              <p-select
                [options]="booleanOptions"
                [(ngModel)]="editRow[col.field]"
                optionLabel="label"
                optionValue="value"
                placeholder="Выберите..."
                class="w-full"
                size="small"
              />
            } @else if (col.type === 'date') {
              <p-datepicker
                [(ngModel)]="editRow[col.field]"
                class="w-full"
                size="small"
                dateFormat="dd.mm.yy"
              />
            }
          </div>
        }
      </div>

      <!-- Footer -->
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

  // Компании для фильтра / отображения в тендерах
  readonly companies = signal<{ _id: string; name: string; shortName: string }[]>([]);
  readonly companyOptions = computed(() =>
    this.companies().map((c) => ({ label: c.shortName || c.name, value: c._id })),
  );
  readonly companyMap = computed(() => {
    const map: Record<string, string> = {};
    for (const c of this.companies()) map[c._id] = c.shortName || c.name;
    return map;
  });
  readonly selectedCompanyFilter = signal<string>('');
  readonly selectedStatusFilter = signal<string>('');

  // Опции статусов для тендеров
  readonly tenderStatusOptions = [
    { label: 'Новый', value: 'new' },
    { label: 'В работе', value: 'in_progress' },
    { label: 'КП отправлено', value: 'kp_sent' },
    { label: 'Выигран', value: 'won' },
    { label: 'Проигран', value: 'lost' },
  ];

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
    {
      key: 'tenders',
      label: 'Запросы',
      icon: 'pi pi-inbox',
      basePath: '/directories/tenders',
      idField: '_id',
      columns: [
        { field: 'number', header: 'Номер', type: 'text', width: '120px', readonly: true },
        { field: 'date', header: 'Дата', type: 'date', width: '110px' },
        { field: 'companyId', header: 'Компания', type: 'select', width: '150px' },
        { field: 'subject', header: 'Тема', type: 'text' },
        { field: 'productName', header: 'Товар', type: 'text', width: '160px' },
        { field: 'quantity', header: 'Кол-во', type: 'number', width: '80px' },
        { field: 'legalBasis', header: 'Прав. основа', type: 'text', width: '120px' },
        { field: 'statusId', header: 'Статус', type: 'tag', width: '150px' },
      ],
    },
    {
      key: 'product-passports',
      label: 'Паспорта',
      icon: 'pi pi-id-card',
      basePath: '/directories/product-passports',
      idField: '_id',
      columns: [
        { field: 'passportNumber', header: '№ паспорта', type: 'number', width: '110px' },
        { field: 'name', header: 'Наименование', type: 'text' },
        { field: 'category', header: 'Категория', type: 'text', width: '150px' },
        { field: 'date', header: 'Дата', type: 'date', width: '110px' },
        { field: 'height', header: 'Высота', type: 'number', width: '80px' },
        { field: 'weight', header: 'Вес (кг)', type: 'number', width: '90px' },
        { field: 'installationSite', header: 'Объект', type: 'text' },
      ],
    },
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

  currentMod = () => {
    const mod = this.modules.find((m) => m.key === this.activeKey()) ?? null;
    if (!mod) return null;
    if (mod.key === 'tenders') {
      return {
        ...mod,
        columns: mod.columns.map((col) => {
          if (col.field === 'companyId') {
            return { ...col, options: this.companyOptions() };
          }
          if (col.field === 'statusId') {
            return { ...col, options: this.tenderStatusOptions };
          }
          return col;
        }),
      };
    }
    return mod;
  };

  private readonly auth = inject(AuthService);

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
        filters: this.activeKey() === 'tenders'
          ? {
              companyId: this.selectedCompanyFilter(),
              statusId: this.selectedStatusFilter(),
            }
          : undefined,
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
    this.selectedCompanyFilter.set('');
    this.selectedStatusFilter.set('');
    this.sortField.set('createdAt');
    this.sortOrder.set(-1);
    if (key === 'tenders') {
      this.loadCompanies();
    }
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

  // ===== Загрузка компаний (для модуля тендеров) =====
  private loadCompanies(): void {
    this.crudApi
      .list<{ _id: string; name: string; shortName: string }>('/directories/counterparties', {
        all: true,
        limit: 100,
        filters: { roles: 'company' },
      })
      .subscribe({
        next: (res) => this.companies.set(res.data || []),
        error: () => this.companies.set([]),
      });
  }

  // ===== Получить название компании по ID =====
  getCompanyName(id: string): string {
    return this.companyMap()[id] || id;
  }

  // ===== Получить отображаемое значение ячейки =====
  getCellValue(row: Record<string, unknown>, col: ColumnDef): string {
    const val = row[col.field];
    if (col.field === 'companyId' && this.activeKey() === 'tenders') {
      return this.getCompanyName(val as string) || String(val ?? '—');
    }
    return String(val ?? '—');
  }

  // ===== Изменение фильтра =====
  onFilterChange(): void {
    this.page.set(1);
    this.loadData();
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
