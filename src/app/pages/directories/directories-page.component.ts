import { Component, signal, inject, OnInit } from '@angular/core';
import { NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault } from '@angular/common';
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
import { CardModule } from 'primeng/card';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';

// Shared UI
import { PageLayoutComponent } from '../../shared/ui/page-layout/page-layout.component';
import { EmptyStateComponent } from '../../shared/ui/empty-state/empty-state.component';

// Services
import { DirectoryService } from '../../core/directory.service';
import { NotificationService } from '../../core/notification.service';

// ===== Column definition =====
interface ColumnDef {
  field: string;
  header: string;
  type: 'text' | 'number' | 'select' | 'boolean' | 'tag';
  options?: { label: string; value: string }[];
  required?: boolean;
  width?: string;
}

interface DirectoryConfig {
  key: string;
  label: string;
  icon: string;
  apiPath: string;
  columns: ColumnDef[];
  idField: string;
  /** Быстрые действия / часто используемые значения для этого справочника */
  quickAddPresets?: { label: string; value: Record<string, unknown> }[];
}

@Component({
  selector: 'app-directories-page',
  standalone: true,
  imports: [
    NgFor, NgIf, NgSwitch, NgSwitchCase, NgSwitchDefault,
    FormsModule, TableModule, ButtonModule, DialogModule,
    InputTextModule, InputNumberModule, SelectModule,
    TagModule, CardModule, ToastModule, ConfirmDialogModule,
    TooltipModule,
    PageLayoutComponent, EmptyStateComponent,
  ],
  template: `
    <app-page-layout>
      <div page-header class="page__header">
        <h1>Справочники</h1>
        <p class="page__subtitle">Часто используемые данные — редактируйте, добавляйте, управляйте</p>
      </div>

      <!-- Навигация по справочникам -->
      <div class="dir-tabs">
        <p-button
          *ngFor="let dir of directories"
          [label]="dir.label"
          [icon]="dir.icon"
          [severity]="activeKey() === dir.key ? 'primary' : 'secondary'"
          [outlined]="activeKey() !== dir.key"
          (click)="selectDir(dir.key)"
          [pTooltip]="dir.label"
          tooltipPosition="bottom"
          size="small"
          styleClass="dir-tabs__btn"
        />
      </div>

      <div page-toolbar class="dir-toolbar">
        <div class="dir-toolbar__left">
          <span class="dir-toolbar__title">{{ currentDir()?.label }}</span>
          <span class="dir-toolbar__count" *ngIf="!loading()">
            {{ totalRecords() }} {{ totalRecords() === 1 ? 'запись' : (totalRecords() >= 2 && totalRecords() <= 4 ? 'записи' : 'записей') }}
          </span>
        </div>
        <div class="dir-toolbar__right">
          <span class="p-input-icon-left dir-search">
            <i class="pi pi-search"></i>
            <input
              pInputText
              type="text"
              class="dir-search__input"
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

      <!-- Быстрый доступ / часто используемые -->
      <div class="quick-access" *ngIf="hasQuickPresets() && !loading() && rows().length > 0">
        <span class="quick-access__label">Часто используемые:</span>
        <p-button
          *ngFor="let preset of currentDir()?.quickAddPresets"
          [label]="preset.label"
          size="small"
          severity="secondary"
          [outlined]="true"
          (click)="addFromPreset(preset.value)"
          styleClass="quick-access__chip"
        />
      </div>

      <!-- Спиннер загрузки -->
      <div class="loading-state" *ngIf="loading()">Загрузка данных...</div>

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
            <th *ngFor="let col of currentDir()?.columns; trackBy: trackByField" [style.width]="col.width">
              {{ col.header }}
            </th>
            <th style="width:90px">Действия</th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-row>
          <tr>
            <td *ngFor="let col of currentDir()?.columns; trackBy: trackByField">
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
            <td [attr.colspan]="(currentDir()?.columns?.length || 0) + 1">
              <app-empty-state
                [compact]="true"
                [description]="'Нет данных. Нажмите «Добавить» чтобы создать запись.'"
              >
                <i empty-icon class="pi pi-inbox"></i>
                <div empty-actions>
                  <p-button
                    label="Создать"
                    icon="pi pi-plus"
                    size="small"
                    (click)="showAdd()"
                  />
                  <p-button
                    *ngIf="hasQuickPresets()"
                    label="Использовать шаблон"
                    severity="secondary"
                    size="small"
                    (click)="addFromPreset(currentDir()?.quickAddPresets?.[0]?.value || {})"
                  />
                </div>
              </app-empty-state>
            </td>
          </tr>
        </ng-template>
      </p-table>
    </app-page-layout>

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
        <ng-container *ngFor="let col of (currentDir()?.columns || []); trackBy: trackByField">
          <!-- Каждое поле: label + control в flex-col gap-1 -->
          <div class="flex flex-col gap-1">
            <label class="text-sm font-medium">
              {{ col.header }}
              <span *ngIf="col.required" class="text-secondary">*</span>
            </label>

            <!-- Text -->
            <input
              *ngIf="col.type === 'text'"
              pInputText
              [(ngModel)]="editRow[col.field]"
              [attr.required]="col.required ? '' : null"
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
  styleUrl: './directories-page.component.scss',
})
export class DirectoriesPageComponent implements OnInit {
  private readonly directoryService = inject(DirectoryService);
  private readonly notification = inject(NotificationService);
  private readonly confirmationService = inject(ConfirmationService);

  // Состояние
  readonly activeKey = signal<string>('products');
  readonly rows = signal<Record<string, unknown>[]>([]);
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly totalRecords = signal(0);
  readonly page = signal(1);
  readonly limit = signal(25);
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

  // ===== Определения справочников =====
  readonly directories: DirectoryConfig[] = [
    {
      key: 'products',
      label: 'Товары',
      icon: 'pi pi-box',
      apiPath: 'products',
      idField: '_id',
      quickAddPresets: [
        { label: '+ Лист стальной', value: { name: 'Лист стальной', unit: 'м²', kind: 'ITEM', status: 'active' } },
        { label: '+ Крепёж', value: { name: 'Болт оцинк.', unit: 'шт', kind: 'ITEM', status: 'active' } },
        { label: '+ Услуга', value: { name: 'Работа', unit: 'ч', kind: 'WORK', status: 'active' } },
      ],
      columns: [
        { field: 'name', header: 'Наименование', type: 'text', required: true },
        { field: 'sku', header: 'Артикул', type: 'text' },
        {
          field: 'kind', header: 'Тип', type: 'select',
          options: [
            { label: 'Товар', value: 'ITEM' },
            { label: 'Услуга', value: 'SERVICE' },
            { label: 'Работа', value: 'WORK' },
          ],
        },
        { field: 'unit', header: 'Ед.изм', type: 'text' },
        { field: 'status', header: 'Статус', type: 'tag' },
      ],
    },
    {
      key: 'categories',
      label: 'Категории',
      icon: 'pi pi-sitemap',
      apiPath: 'categories',
      idField: '_id',
      quickAddPresets: [
        { label: '+ Металлопрокат', value: { name: 'Металлопрокат', sortOrder: 1, isActive: true } },
        { label: '+ Крепёж', value: { name: 'Крепёж', sortOrder: 2, isActive: true } },
        { label: '+ Электроника', value: { name: 'Электроника', sortOrder: 3, isActive: true } },
        { label: '+ Инструмент', value: { name: 'Инструмент', sortOrder: 5, isActive: true } },
      ],
      columns: [
        { field: 'name', header: 'Название', type: 'text', required: true },
        { field: 'parentId', header: 'Родитель', type: 'text' },
        { field: 'sortOrder', header: 'Порядок', type: 'number' },
        { field: 'isActive', header: 'Активна', type: 'boolean' },
      ],
    },
    {
      key: 'counterparties',
      label: 'Контрагенты',
      icon: 'pi pi-users',
      apiPath: 'counterparties',
      idField: '_id',
      quickAddPresets: [
        { label: '+ Поставщик (ООО)', value: { name: 'Новый поставщик', legalForm: 'ООО', roles: ['supplier'], isActive: true } },
        { label: '+ Клиент (ООО)', value: { name: 'Новый клиент', legalForm: 'ООО', roles: ['client'], isActive: true } },
        { label: '+ ИП', value: { name: 'Новый ИП', legalForm: 'ИП', roles: ['client'], isActive: true } },
      ],
      columns: [
        { field: 'name', header: 'Наименование', type: 'text', required: true },
        { field: 'inn', header: 'ИНН', type: 'text' },
        {
          field: 'legalForm', header: 'Форма', type: 'select',
          options: [
            { label: 'ООО', value: 'ООО' }, { label: 'ИП', value: 'ИП' },
            { label: 'АО', value: 'АО' }, { label: 'Физлицо', value: 'Физлицо' },
          ],
        },
        { field: 'phone', header: 'Телефон', type: 'text' },
        { field: 'email', header: 'Email', type: 'text' },
      ],
    },
    {
      key: 'users',
      label: 'Пользователи',
      icon: 'pi pi-user',
      apiPath: 'users',
      idField: '_id',
      columns: [
        { field: 'username', header: 'Логин', type: 'text', required: true },
        { field: 'displayName', header: 'Имя', type: 'text' },
        { field: 'email', header: 'Email', type: 'text' },
        {
          field: 'role', header: 'Роль', type: 'tag',
          options: [
            { label: 'Админ', value: 'admin' },
            { label: 'Менеджер', value: 'manager' },
            { label: 'Наблюдатель', value: 'viewer' },
          ],
        },
      ],
    },
    {
      key: 'roles',
      label: 'Роли',
      icon: 'pi pi-shield',
      apiPath: 'roles',
      idField: '_id',
      columns: [
        { field: 'name', header: 'Код', type: 'text', required: true },
        { field: 'label', header: 'Название', type: 'tag' },
        { field: 'description', header: 'Описание', type: 'text' },
        { field: 'isSystem', header: 'Системная', type: 'boolean' },
      ],
    },
    {
      key: 'statuses',
      label: 'Статусы',
      icon: 'pi pi-tag',
      apiPath: 'statuses',
      idField: '_id',
      quickAddPresets: [
        { label: '+ Черновик', value: { statusId: 'draft', label: 'Черновик', color: '#6b7280', entityType: 'ORDER', isInitial: true } },
        { label: '+ В работе', value: { statusId: 'in_progress', label: 'В работе', color: '#f59e0b', entityType: 'ORDER' } },
        { label: '+ Выполнен', value: { statusId: 'completed', label: 'Выполнен', color: '#10b981', entityType: 'ORDER', isFinal: true } },
      ],
      columns: [
        { field: 'statusId', header: 'Код', type: 'text', required: true },
        { field: 'label', header: 'Название', type: 'text' },
        {
          field: 'entityType', header: 'Сущность', type: 'select',
          options: [
            { label: 'Заказ', value: 'ORDER' },
            { label: 'Позиция заказа', value: 'ORDER_ITEM' },
            { label: 'Задача', value: 'WORK_TASK' },
            { label: 'Заявка', value: 'MATERIAL_REQUEST' },
          ],
        },
        { field: 'color', header: 'Цвет', type: 'text' },
      ],
    },
    {
      key: 'work-types',
      label: 'Типы работ',
      icon: 'pi pi-wrench',
      apiPath: 'work-types',
      idField: '_id',
      quickAddPresets: [
        { label: '+ Сварка', value: { name: 'Сварка', section: 'work', isActive: true } },
        { label: '+ Резка', value: { name: 'Резка металла', section: 'work', isActive: true } },
        { label: '+ Закупка', value: { name: 'Закупка материала', section: 'task', isActive: true } },
        { label: '+ Чертеж', value: { name: 'Разработка чертежа', section: 'drawing', isActive: true } },
      ],
      columns: [
        { field: 'name', header: 'Название', type: 'text', required: true },
        {
          field: 'section', header: 'Раздел', type: 'select',
          options: [
            { label: 'Материалы', value: 'materials' },
            { label: 'Работа', value: 'work' },
            { label: 'Задача', value: 'task' },
            { label: 'Чертеж', value: 'drawing' },
          ],
        },
      ],
    },
    {
      key: 'settings',
      label: 'Настройки',
      icon: 'pi pi-cog',
      apiPath: 'settings',
      idField: '_id',
      columns: [
        { field: 'key', header: 'Ключ', type: 'text', required: true },
        { field: 'value', header: 'Значение', type: 'text' },
        { field: 'description', header: 'Описание', type: 'text' },
      ],
    },
  ];

  currentDir = () => this.directories.find((d) => d.key === this.activeKey()) ?? null;

  /** Есть ли быстрые пресеты для текущего справочника */
  hasQuickPresets = (): boolean =>
    (this.currentDir()?.quickAddPresets?.length ?? 0) > 0;

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
    const dir = this.currentDir();
    if (!dir) return;

    this.loading.set(true);
    this.directoryService
      .list<Record<string, unknown>>(dir.apiPath, {
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
            this.notification.error('Ошибка загрузки', 'Не удалось загрузить данные справочника');
            this.rows.set([]);
            this.totalRecords.set(0);
          },
        }),
        catchError(() => of(null)),
      )
      .subscribe(() => this.loading.set(false));
  }

  // ===== Переключение =====
  selectDir(key: string): void {
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
    const page = Math.floor(event.first / event.rows) + 1;
    this.page.set(page);
    this.limit.set(event.rows);
    this.loadData();
  }

  // ===== Быстрое добавление из пресета =====
  addFromPreset(preset: Record<string, unknown>): void {
    this.isEditing = false;
    this.editId = null;
    this.dialogTitle = `Создание ${this.currentDir()?.label} (шаблон)`;
    this.editRow = { ...preset };
    this.dialogVisible = true;
  }

  // ===== Показать диалог добавления =====
  showAdd(): void {
    this.isEditing = false;
    this.editId = null;
    this.dialogTitle = `Добавление ${this.currentDir()?.label}`;
    this.editRow = {};
    this.dialogVisible = true;
  }

  // ===== Показать диалог редактирования =====
  showEdit(row: Record<string, unknown>): void {
    this.isEditing = true;
    this.editId = (row[this.currentDir()?.idField || '_id'] as string) ?? null;
    this.dialogTitle = `Редактирование ${this.currentDir()?.label}`;
    this.editRow = { ...row, _id: undefined };
    this.dialogVisible = true;
  }

  // ===== Подтверждение удаления =====
  confirmDelete(row: Record<string, unknown>): void {
    const label = (row['name'] || row['label'] || row['username'] || row['key'] || '') as string;
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
    const id = row[this.currentDir()?.idField || '_id'] as string;
    if (!id) return;

    this.saving.set(true);
    this.directoryService
      .delete(this.currentDir()?.apiPath || '', id)
      .pipe(
        tap({
          next: () => {
            this.notification.success('Удалено', 'Запись успешно удалена');
            this.loadData();
          },
          error: (err) => {
            this.notification.error('Ошибка удаления', err.error?.error || 'Не удалось удалить запись');
          },
        }),
      )
      .subscribe(() => this.saving.set(false));
  }

  // ===== Сохранение =====
  save(): void {
    const dir = this.currentDir();
    if (!dir) return;

    // Валидация required полей
    for (const col of dir.columns) {
      if (col.required && !this.editRow[col.field]) {
        this.notification.warn('Проверьте форму', `Поле «${col.header}» обязательно`);
        return;
      }
    }

    this.saving.set(true);

    if (this.isEditing && this.editId) {
      this.directoryService
        .update(dir.apiPath, this.editId, this.editRow)
        .pipe(
          tap({
            next: () => {
              this.notification.success('Обновлено', 'Запись успешно обновлена');
              this.closeDialog();
              this.loadData();
            },
            error: (err) => {
              this.notification.error('Ошибка обновления', err.error?.error || 'Не удалось обновить запись');
            },
          }),
        )
        .subscribe(() => this.saving.set(false));
    } else {
      this.directoryService
        .create(dir.apiPath, this.editRow)
        .pipe(
          tap({
            next: () => {
              this.notification.success('Создано', 'Запись успешно создана');
              this.closeDialog();
              this.loadData();
            },
            error: (err) => {
              this.notification.error('Ошибка создания', err.error?.error || 'Не удалось создать запись');
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
      active: 'success',
      draft: 'warn',
      archived: 'danger',
      admin: 'info',
      manager: 'warn',
      viewer: 'secondary',
      true: 'info',
      false: 'secondary',
      Администратор: 'danger',
      Менеджер: 'warn',
      Наблюдатель: 'secondary',
      Инженер: 'info',
    };
    const key = typeof value === 'string' ? value : String(value);
    return map[key] ?? 'info';
  }
}
