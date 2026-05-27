import {
  Component,
  inject,
  signal,
  computed,
  DestroyRef,
  OnInit,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { PERMISSIONS } from '../../core/permissions';
import { AuthService } from '../../core/auth.service';
import type { KpColumn } from '../../shared/ui/kp-table.component';
import type { CrudPermissions } from '../../shared/crud/crud-page.types';
import { CategoryOptionsService } from '../../shared/services/category-options.service';

// UI
import { PageLayoutComponent } from '../../shared/ui/page-layout/page-layout.component';
import { KpCrudPageComponent } from '../../shared/crud/kp-crud-page.component';
import {
  KpInputComponent,
  KpSelectComponent,
  KpInputNumberComponent,
  KpButtonComponent,
  type KpSelectOption,
} from '../../shared/ui';

// Store
import { createDirStores, type DirStores } from './directories.store';

// ── Department groups ──────────────────────────────────────────
interface DirGroup {
  id: string;
  label: string;
  icon: string;
  keys: DirKey[];
}

type DirKey = keyof DirStores;

const DIR_GROUPS: DirGroup[] = [
  { id: 'office', label: 'Офис', icon: 'pi pi-building', keys: ['counterparties'] },
  {
    id: 'admin',
    label: 'Администрирование',
    icon: 'pi pi-shield',
    keys: ['categories', 'users', 'roles', 'statuses', 'workTypes', 'settings'],
  },
];

// ── Shared select/tag options ──────────────────────────────────
const YES_NO_OPTIONS: KpSelectOption[] = [
  { label: 'Да', value: 'true' },
  { label: 'Нет', value: 'false' },
];

const LEGAL_FORM_OPTIONS: KpSelectOption[] = [
  { label: 'ООО', value: 'ООО' },
  { label: 'ИП', value: 'ИП' },
  { label: 'АО', value: 'АО' },
  { label: 'ПАО', value: 'ПАО' },
  { label: 'Физлицо', value: 'Физлицо' },
  { label: 'Другое', value: 'Другое' },
];

const USER_ROLE_OPTIONS: KpSelectOption[] = [
  { label: 'Администратор', value: 'admin' },
  { label: 'Менеджер', value: 'manager' },
  { label: 'Наблюдатель', value: 'viewer' },
];

const COUNTERPARTY_ROLE_OPTIONS: KpSelectOption[] = [
  { label: 'Клиент', value: 'client' },
  { label: 'Поставщик', value: 'supplier' },
  { label: 'Компания', value: 'company' },
];

const ENTITY_TYPE_OPTIONS: KpSelectOption[] = [
  { label: 'Заказ', value: 'ORDER' },
  { label: 'Позиция заказа', value: 'ORDER_ITEM' },
  { label: 'Задача', value: 'WORK_TASK' },
  { label: 'Заявка', value: 'MATERIAL_REQUEST' },
];

const WORK_SECTION_OPTIONS: KpSelectOption[] = [
  { label: 'Материалы', value: 'materials' },
  { label: 'Работа', value: 'work' },
  { label: 'Задача', value: 'task' },
  { label: 'Чертеж', value: 'drawing' },
];

// ── Quick-add presets ──────────────────────────────────────────
interface QuickPreset {
  label: string;
  value: Record<string, unknown>;
}

const QUICK_PRESETS: Partial<Record<DirKey, QuickPreset[]>> = {
  counterparties: [
    { label: 'Поставщик', value: { name: 'Новый поставщик', legalForm: 'ООО', roles: ['supplier'], isActive: true } },
    { label: 'Клиент', value: { name: 'Новый клиент', legalForm: 'ООО', roles: ['client'], isActive: true } },
  ],
  statuses: [
    { label: 'Черновик', value: { statusId: 'draft', label: 'Черновик', color: '#6b7280', entityType: 'ORDER', isInitial: true } },
    { label: 'В работе', value: { statusId: 'in_progress', label: 'В работе', color: '#f59e0b', entityType: 'ORDER' } },
    { label: 'Выполнен', value: { statusId: 'completed', label: 'Выполнен', color: '#10b981', entityType: 'ORDER', isFinal: true } },
  ],
  workTypes: [
    { label: 'Сварка', value: { name: 'Сварка', section: 'work', isActive: true } },
    { label: 'Резка', value: { name: 'Резка металла', section: 'work', isActive: true } },
    { label: 'Чертеж', value: { name: 'Разработка чертежа', section: 'drawing', isActive: true } },
  ],
};

// ── Severity function ──────────────────────────────────────────
function dirSeverity(value: unknown): string {
  const map: Record<string, string> = {
    active: 'success',
    draft: 'warn',
    archived: 'danger',
    admin: 'info',
    manager: 'warn',
    viewer: 'secondary',
    ООО: 'info',
    ИП: 'success',
    АО: 'warn',
    ПАО: 'warn',
    Физлицо: 'secondary',
    Другое: 'secondary',
    ORDER: 'info',
    ORDER_ITEM: 'secondary',
    WORK_TASK: 'warn',
    MATERIAL_REQUEST: 'success',
    materials: 'info',
    work: 'warn',
    task: 'success',
    drawing: 'secondary',
    client: 'info',
    supplier: 'success',
    company: 'warn',
  };
  return map[String(value)] || 'info';
}

/** Build CrudPermissions from PERMISSIONS entry */
function perms(key: DirKey): CrudPermissions {
  const p = PERMISSIONS[key] as { view: string; create: string; edit: string; delete: string } | undefined;
  return {
    view: p?.view ?? `admin.${key}.view`,
    create: p?.create,
    update: p?.edit,
    delete: p?.delete,
  };
}

// ── Directory display configs ─────────────────────────────────
interface DirDisplay {
  label: string;
  icon: string;
  columns: KpColumn[];
}

const DIR_DISPLAYS: Record<DirKey, DirDisplay> = {
  categories: {
    label: 'Категории',
    icon: 'pi pi-sitemap',
    columns: [
      { field: 'name', header: 'Название', type: 'text', sortable: true },
      { field: 'parentId', header: 'Родитель', type: 'select', options: [] },
      { field: 'sortOrder', header: 'Порядок', type: 'number', sortable: true, width: '90px' },
      { field: 'isActive', header: 'Активна', type: 'boolean', sortable: true, width: '90px' },
      { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
    ],
  },
  counterparties: {
    label: 'Контрагенты',
    icon: 'pi pi-users',
    columns: [
      { field: 'name', header: 'Наименование', type: 'text', sortable: true },
      { field: 'inn', header: 'ИНН', type: 'text', width: '130px' },
      { field: 'kpp', header: 'КПП', type: 'text', width: '110px' },
      {
        field: 'legalForm',
        header: 'Форма',
        type: 'tag',
        sortable: true,
        width: '90px',
        options: LEGAL_FORM_OPTIONS,
      },
      { field: 'phone', header: 'Телефон', type: 'text', width: '130px' },
      { field: 'email', header: 'Email', type: 'text' },
      { field: 'isActive', header: 'Активен', type: 'boolean', sortable: true, width: '90px' },
      { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
    ],
  },
  users: {
    label: 'Пользователи',
    icon: 'pi pi-user',
    columns: [
      { field: 'username', header: 'Логин', type: 'text', sortable: true },
      { field: 'displayName', header: 'Имя', type: 'text' },
      { field: 'email', header: 'Email', type: 'text' },
      {
        field: 'role',
        header: 'Роль',
        type: 'tag',
        sortable: true,
        width: '130px',
        options: USER_ROLE_OPTIONS,
      },
      { field: 'isActive', header: 'Активен', type: 'boolean', sortable: true, width: '90px' },
      { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
    ],
  },
  roles: {
    label: 'Роли',
    icon: 'pi pi-shield',
    columns: [
      { field: 'name', header: 'Код', type: 'text', sortable: true, width: '110px' },
      { field: 'label', header: 'Название', type: 'text', sortable: true },
      { field: 'description', header: 'Описание', type: 'text' },
      { field: 'isSystem', header: 'Системная', type: 'boolean', sortable: true, width: '100px' },
      { field: 'sortOrder', header: 'Порядок', type: 'number', sortable: true, width: '90px' },
      { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
    ],
  },
  statuses: {
    label: 'Статусы',
    icon: 'pi pi-tag',
    columns: [
      { field: 'statusId', header: 'Код', type: 'text', sortable: true, width: '120px' },
      { field: 'label', header: 'Название', type: 'text' },
      {
        field: 'entityType',
        header: 'Сущность',
        type: 'tag',
        sortable: true,
        width: '140px',
        options: ENTITY_TYPE_OPTIONS,
      },
      { field: 'color', header: 'Цвет', type: 'text', width: '80px' },
      { field: 'isInitial', header: 'Начальный', type: 'boolean', width: '100px' },
      { field: 'isFinal', header: 'Финальный', type: 'boolean', width: '100px' },
      { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
    ],
  },
  workTypes: {
    label: 'Типы работ',
    icon: 'pi pi-wrench',
    columns: [
      { field: 'name', header: 'Название', type: 'text', sortable: true },
      {
        field: 'section',
        header: 'Раздел',
        type: 'tag',
        sortable: true,
        width: '120px',
        options: WORK_SECTION_OPTIONS,
      },
      { field: 'isActive', header: 'Активен', type: 'boolean', sortable: true, width: '90px' },
      { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
    ],
  },
  settings: {
    label: 'Настройки',
    icon: 'pi pi-cog',
    columns: [
      { field: 'key', header: 'Ключ', type: 'text', sortable: true },
      { field: 'value', header: 'Значение', type: 'text' },
      { field: 'group', header: 'Группа', type: 'text', width: '120px' },
      { field: 'description', header: 'Описание', type: 'text' },
      { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
    ],
  },
};

@Component({
  selector: 'app-directories-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    PageLayoutComponent,
    KpCrudPageComponent,
    KpInputComponent,
    KpSelectComponent,
    KpInputNumberComponent,
    KpButtonComponent,
  ],
  template: `
    <app-page-layout>
      <div page-header class="page__header">
        <h1>Справочники</h1>
        <p class="page__subtitle">Часто используемые данные — редактируйте, добавляйте, управляйте</p>
      </div>

      @for (group of visibleGroups(); track group.id) {
        <div class="dir-dept">
          <div class="dir-dept__header">
            <i [class]="group.icon + ' dir-dept__icon'"></i>
            <span class="dir-dept__label">{{ group.label }}</span>
          </div>
          <div class="dir-dept__tabs">
            @for (key of group.keys; track key) {
              @if (canView(key)) {
                <app-kp-button
                  [label]="DIR_DISPLAYS[key].label"
                  [icon]="DIR_DISPLAYS[key].icon"
                  severity="secondary"
                  size="small"
                  [text]="activeKey() !== key"
                  [styleClass]="'dir-dept__btn' + (activeKey() === key ? ' dir-dept__btn--active' : '')"
                  (buttonClick)="selectDir(key)"
                />
              }
            }
          </div>
        </div>
      }

      @if (currentPresets().length > 0) {
        <div class="quick-access">
          <span class="quick-access__label">Быстрое добавление:</span>
          @for (preset of currentPresets(); track preset.label) {
            <app-kp-button
              [label]="preset.label"
              icon="pi pi-plus"
              severity="secondary"
              size="small"
              [text]="true"
              styleClass="quick-access__chip"
              (buttonClick)="createPreset(preset.value)"
            />
          }
        </div>
      }

      @switch (activeKey()) {
        @case ('categories') {
          <app-kp-crud-page
            [embedded]="true"
            title="Категории"
            entityLabel="категории"
            description="Группировка товаров и материалов"
            [store]="stores.categories"
            [columns]="categoryColumns()"
            [permissions]="DIR_PERMS.categories"
            [severityFn]="severityFn"
            createLabel="Создать категорию"
          >
            <ng-template #form let-row>
              <div class="form-layout">
                <app-kp-input
                  label="Название"
                  name="name"
                  placeholder="Введите название категории"
                  [value]="row['name'] || ''"
                  (valueChange)="row['name'] = $event"
                  [required]="true"
                />
                <app-kp-select
                  label="Родительская категория"
                  name="parentId"
                  placeholder="Выберите родителя (необязательно)"
                  [value]="row['parentId'] || ''"
                  (valueChange)="row['parentId'] = $event || null"
                  [options]="categoryOptions()"
                />
                <app-kp-input-number
                  label="Порядок сортировки"
                  name="sortOrder"
                  placeholder="0"
                  [value]="row['sortOrder'] ?? 0"
                  (valueChange)="row['sortOrder'] = $event ?? 0"
                />
                <app-kp-select
                  label="Активна"
                  name="isActive"
                  placeholder="Выберите"
                  [value]="boolToStr(row['isActive'] ?? true)"
                  (valueChange)="row['isActive'] = $event === 'true'"
                  [options]="yesNoOptions"
                />
              </div>
            </ng-template>
          </app-kp-crud-page>
        }

        @case ('counterparties') {
          <app-kp-crud-page
            [embedded]="true"
            title="Контрагенты"
            entityLabel="контрагента"
            description="Поставщики, клиенты, подрядчики"
            [store]="stores.counterparties"
            [columns]="DIR_DISPLAYS.counterparties.columns"
            [permissions]="DIR_PERMS.counterparties"
            [severityFn]="severityFn"
            createLabel="Создать контрагента"
          >
            <ng-template #form let-row>
              <div class="form-layout">
                <app-kp-input
                  label="Наименование"
                  name="name"
                  placeholder="Полное наименование организации"
                  [value]="row['name'] || ''"
                  (valueChange)="row['name'] = $event"
                  [required]="true"
                />
                <app-kp-input
                  label="ИНН"
                  name="inn"
                  placeholder="10 или 12 цифр"
                  [value]="row['inn'] || ''"
                  (valueChange)="row['inn'] = $event"
                />
                <app-kp-input
                  label="КПП"
                  name="kpp"
                  placeholder="9 цифр"
                  [value]="row['kpp'] || ''"
                  (valueChange)="row['kpp'] = $event"
                />
                <app-kp-select
                  label="Правовая форма"
                  name="legalForm"
                  placeholder="Выберите форму"
                  [value]="row['legalForm'] || 'ООО'"
                  (valueChange)="row['legalForm'] = $event"
                  [options]="legalFormOptions"
                />
                <app-kp-select
                  label="Роль"
                  name="roles"
                  placeholder="Выберите роль"
                  [value]="primaryRole(row['roles'])"
                  (valueChange)="row['roles'] = [$event]"
                  [options]="counterpartyRoleOptions"
                />
                <app-kp-input
                  label="Телефон"
                  name="phone"
                  placeholder="+7 (___) ___-__-__"
                  [value]="row['phone'] || ''"
                  (valueChange)="row['phone'] = $event"
                />
                <app-kp-input
                  label="Email"
                  name="email"
                  placeholder="example@company.ru"
                  [value]="row['email'] || ''"
                  (valueChange)="row['email'] = $event"
                />
                <app-kp-select
                  label="Активен"
                  name="isActive"
                  placeholder="Выберите"
                  [value]="boolToStr(row['isActive'] ?? true)"
                  (valueChange)="row['isActive'] = $event === 'true'"
                  [options]="yesNoOptions"
                />
              </div>
            </ng-template>
          </app-kp-crud-page>
        }

        @case ('users') {
          <app-kp-crud-page
            [embedded]="true"
            title="Пользователи"
            entityLabel="пользователя"
            description="Учётные записи сотрудников"
            [store]="stores.users"
            [columns]="DIR_DISPLAYS.users.columns"
            [permissions]="DIR_PERMS.users"
            [severityFn]="severityFn"
            createLabel="Создать пользователя"
          >
            <ng-template #form let-row>
              <div class="form-layout">
                <app-kp-input
                  label="Логин"
                  name="username"
                  placeholder="Введите логин"
                  [value]="row['username'] || ''"
                  (valueChange)="row['username'] = $event"
                  [required]="true"
                />
                <app-kp-input
                  label="Отображаемое имя"
                  name="displayName"
                  placeholder="Имя для отображения"
                  [value]="row['displayName'] || ''"
                  (valueChange)="row['displayName'] = $event"
                />
                <app-kp-input
                  label="Email"
                  name="email"
                  placeholder="user@company.ru"
                  [value]="row['email'] || ''"
                  (valueChange)="row['email'] = $event"
                />
                <app-kp-select
                  label="Роль"
                  name="role"
                  placeholder="Выберите роль"
                  [value]="row['role'] || 'viewer'"
                  (valueChange)="row['role'] = $event"
                  [options]="roleOptions"
                />
                <app-kp-select
                  label="Активен"
                  name="isActive"
                  placeholder="Выберите"
                  [value]="boolToStr(row['isActive'] ?? true)"
                  (valueChange)="row['isActive'] = $event === 'true'"
                  [options]="yesNoOptions"
                />
              </div>
            </ng-template>
          </app-kp-crud-page>
        }

        @case ('roles') {
          <app-kp-crud-page
            [embedded]="true"
            title="Роли"
            entityLabel="роли"
            description="Роли доступа и их права"
            [store]="stores.roles"
            [columns]="DIR_DISPLAYS.roles.columns"
            [permissions]="DIR_PERMS.roles"
            [severityFn]="severityFn"
            createLabel="Создать роль"
          >
            <ng-template #form let-row>
              <div class="form-layout">
                <app-kp-input
                  label="Код роли"
                  name="name"
                  placeholder="Например, manager"
                  [value]="row['name'] || ''"
                  (valueChange)="row['name'] = $event"
                  [required]="true"
                />
                <app-kp-input
                  label="Название"
                  name="label"
                  placeholder="Отображаемое название"
                  [value]="row['label'] || ''"
                  (valueChange)="row['label'] = $event"
                />
                <app-kp-input
                  label="Описание"
                  name="description"
                  placeholder="Краткое описание роли"
                  [value]="row['description'] || ''"
                  (valueChange)="row['description'] = $event"
                />
                <app-kp-input-number
                  label="Порядок"
                  name="sortOrder"
                  placeholder="0"
                  [value]="row['sortOrder'] ?? 0"
                  (valueChange)="row['sortOrder'] = $event ?? 0"
                />
                <app-kp-select
                  label="Системная"
                  name="isSystem"
                  placeholder="Выберите"
                  [value]="boolToStr(row['isSystem'] ?? false)"
                  (valueChange)="row['isSystem'] = $event === 'true'"
                  [options]="yesNoOptions"
                />
              </div>
            </ng-template>
          </app-kp-crud-page>
        }

        @case ('statuses') {
          <app-kp-crud-page
            [embedded]="true"
            title="Статусы"
            entityLabel="статуса"
            description="Статусы документов и процессов"
            [store]="stores.statuses"
            [columns]="DIR_DISPLAYS.statuses.columns"
            [permissions]="DIR_PERMS.statuses"
            [severityFn]="severityFn"
            createLabel="Создать статус"
          >
            <ng-template #form let-row>
              <div class="form-layout">
                <app-kp-input
                  label="Код статуса"
                  name="statusId"
                  placeholder="Например, draft"
                  [value]="row['statusId'] || ''"
                  (valueChange)="row['statusId'] = $event"
                  [required]="true"
                />
                <app-kp-input
                  label="Название"
                  name="label"
                  placeholder="Отображаемое название"
                  [value]="row['label'] || ''"
                  (valueChange)="row['label'] = $event"
                />
                <app-kp-select
                  label="Сущность"
                  name="entityType"
                  placeholder="Выберите тип сущности"
                  [value]="row['entityType'] || 'ORDER'"
                  (valueChange)="row['entityType'] = $event"
                  [options]="entityTypeOptions"
                />
                <app-kp-input
                  label="Цвет (hex)"
                  name="color"
                  placeholder="#6b7280"
                  [value]="row['color'] || '#6b7280'"
                  (valueChange)="row['color'] = $event"
                />
                <app-kp-input-number
                  label="Порядок"
                  name="sortOrder"
                  placeholder="0"
                  [value]="row['sortOrder'] ?? 0"
                  (valueChange)="row['sortOrder'] = $event ?? 0"
                />
                <app-kp-select
                  label="Начальный статус"
                  name="isInitial"
                  placeholder="Выберите"
                  [value]="boolToStr(row['isInitial'] ?? false)"
                  (valueChange)="row['isInitial'] = $event === 'true'"
                  [options]="yesNoOptions"
                />
                <app-kp-select
                  label="Финальный статус"
                  name="isFinal"
                  placeholder="Выберите"
                  [value]="boolToStr(row['isFinal'] ?? false)"
                  (valueChange)="row['isFinal'] = $event === 'true'"
                  [options]="yesNoOptions"
                />
              </div>
            </ng-template>
          </app-kp-crud-page>
        }

        @case ('workTypes') {
          <app-kp-crud-page
            [embedded]="true"
            title="Типы работ"
            entityLabel="типа работ"
            description="Виды работ и операций"
            [store]="stores.workTypes"
            [columns]="DIR_DISPLAYS.workTypes.columns"
            [permissions]="DIR_PERMS.workTypes"
            [severityFn]="severityFn"
            createLabel="Создать тип работы"
          >
            <ng-template #form let-row>
              <div class="form-layout">
                <app-kp-input
                  label="Название"
                  name="name"
                  placeholder="Введите название"
                  [value]="row['name'] || ''"
                  (valueChange)="row['name'] = $event"
                  [required]="true"
                />
                <app-kp-select
                  label="Раздел"
                  name="section"
                  placeholder="Выберите раздел"
                  [value]="row['section'] || 'work'"
                  (valueChange)="row['section'] = $event"
                  [options]="workSectionOptions"
                />
                <app-kp-input
                  label="Описание"
                  name="description"
                  placeholder="Краткое описание"
                  [value]="row['description'] || ''"
                  (valueChange)="row['description'] = $event"
                />
                <app-kp-select
                  label="Активен"
                  name="isActive"
                  placeholder="Выберите"
                  [value]="boolToStr(row['isActive'] ?? true)"
                  (valueChange)="row['isActive'] = $event === 'true'"
                  [options]="yesNoOptions"
                />
              </div>
            </ng-template>
          </app-kp-crud-page>
        }

        @case ('settings') {
          <app-kp-crud-page
            [embedded]="true"
            title="Настройки"
            entityLabel="настройки"
            description="Системные настройки и конфигурация"
            [store]="stores.settings"
            [columns]="DIR_DISPLAYS.settings.columns"
            [permissions]="DIR_PERMS.settings"
            [severityFn]="severityFn"
            createLabel="Создать настройку"
          >
            <ng-template #form let-row>
              <div class="form-layout">
                <app-kp-input
                  label="Ключ"
                  name="key"
                  placeholder="Например, app.timezone"
                  [value]="row['key'] || ''"
                  (valueChange)="row['key'] = $event"
                  [required]="true"
                />
                <app-kp-input
                  label="Значение"
                  name="value"
                  placeholder="Значение параметра"
                  [value]="row['value'] || ''"
                  (valueChange)="row['value'] = $event"
                />
                <app-kp-input
                  label="Группа"
                  name="group"
                  placeholder="Например, general"
                  [value]="row['group'] || ''"
                  (valueChange)="row['group'] = $event"
                />
                <app-kp-input
                  label="Описание"
                  name="description"
                  placeholder="Назначение настройки"
                  [value]="row['description'] || ''"
                  (valueChange)="row['description'] = $event"
                />
              </div>
            </ng-template>
          </app-kp-crud-page>
        }

        @default {
          <div class="dir-empty">Выберите справочник</div>
        }
      }
    </app-page-layout>
  `,
  styleUrl: './directories-page.component.scss',
})
export class DirectoriesPageComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly auth = inject(AuthService);
  private readonly categoryOptionsService = inject(CategoryOptionsService);

  readonly stores = createDirStores(this.destroyRef);
  readonly DIR_PERMS = (() => {
    const map = {} as Record<DirKey, CrudPermissions>;
    for (const key of Object.keys(DIR_DISPLAYS) as DirKey[]) {
      map[key] = perms(key);
    }
    return map;
  })();
  readonly DIR_DISPLAYS = DIR_DISPLAYS;
  readonly severityFn = dirSeverity;

  readonly yesNoOptions = YES_NO_OPTIONS;
  readonly legalFormOptions = LEGAL_FORM_OPTIONS;
  readonly roleOptions = USER_ROLE_OPTIONS;
  readonly counterpartyRoleOptions = COUNTERPARTY_ROLE_OPTIONS;
  readonly entityTypeOptions = ENTITY_TYPE_OPTIONS;
  readonly workSectionOptions = WORK_SECTION_OPTIONS;

  readonly categoryOptions = signal<KpSelectOption[]>([]);

  readonly categoryColumns = computed(() =>
    DIR_DISPLAYS.categories.columns.map((col) =>
      col.field === 'parentId'
        ? { ...col, type: 'select' as const, options: this.categoryOptions() }
        : col,
    ),
  );

  readonly activeKey = signal<DirKey>('counterparties');

  readonly visibleGroups = computed(() =>
    DIR_GROUPS.map((g) => ({
      ...g,
      keys: g.keys.filter((k) => this.canView(k)),
    })).filter((g) => g.keys.length > 0),
  );

  readonly currentPresets = computed(() => QUICK_PRESETS[this.activeKey()] ?? []);

  ngOnInit(): void {
    this.categoryOptionsService
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((options) => this.categoryOptions.set(options));
  }

  canView(key: DirKey): boolean {
    const p = this.DIR_PERMS[key];
    return !p?.view || this.auth.hasPermission(p.view);
  }

  selectDir(key: DirKey): void {
    this.activeKey.set(key);
  }

  createPreset(value: Record<string, unknown>): void {
    this.stores[this.activeKey()].create(value);
  }

  boolToStr(value: unknown): string {
    return value === true || value === 'true' ? 'true' : 'false';
  }

  primaryRole(roles: unknown): string {
    if (Array.isArray(roles) && roles.length > 0) {
      return String(roles[0]);
    }
    return 'client';
  }
}
