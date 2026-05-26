import { Component, inject, signal, computed, DestroyRef, ChangeDetectionStrategy } from '@angular/core';

import { PERMISSIONS } from '../../core/permissions';
import { AuthService } from '../../core/auth.service';
import type { KpColumn } from '../../shared/ui/kp-table.component';
import type { CrudPermissions } from '../../shared/crud/crud-page.types';

// UI
import { PageLayoutComponent } from '../../shared/ui/page-layout/page-layout.component';
import { KpCrudPageComponent } from '../../shared/crud/kp-crud-page.component';
import { KpInputComponent, KpSelectComponent, type KpSelectOption } from '../../shared/ui';

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
  { id: 'admin',  label: 'Администрирование', icon: 'pi pi-shield', keys: ['categories', 'users', 'roles', 'statuses', 'workTypes', 'settings'] },
];

// ── Quick-add presets ──────────────────────────────────────────
interface QuickPreset {
  label: string;
  value: Record<string, unknown>;
}

const QUICK_PRESETS: Partial<Record<DirKey, QuickPreset[]>> = {
  counterparties: [
    { label: '+ Поставщик',     value: { name: 'Новый поставщик', legalForm: 'ООО', roles: ['supplier'], isActive: true } },
    { label: '+ Клиент',        value: { name: 'Новый клиент', legalForm: 'ООО', roles: ['client'], isActive: true } },
  ],
  statuses: [
    { label: '+ Черновик',      value: { statusId: 'draft', label: 'Черновик', color: '#6b7280', entityType: 'ORDER', isInitial: true } },
    { label: '+ В работе',      value: { statusId: 'in_progress', label: 'В работе', color: '#f59e0b', entityType: 'ORDER' } },
    { label: '+ Выполнен',      value: { statusId: 'completed', label: 'Выполнен', color: '#10b981', entityType: 'ORDER', isFinal: true } },
  ],
  workTypes: [
    { label: '+ Сварка',        value: { name: 'Сварка', section: 'work', isActive: true } },
    { label: '+ Резка',         value: { name: 'Резка металла', section: 'work', isActive: true } },
    { label: '+ Чертеж',        value: { name: 'Разработка чертежа', section: 'drawing', isActive: true } },
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
      { field: 'name',       header: 'Название',      type: 'text', sortable: true },
      { field: 'parentId',   header: 'Родитель',      type: 'text' },
      { field: 'sortOrder',  header: 'Порядок',       type: 'number', sortable: true, width: '90px' },
      { field: 'isActive',   header: 'Активна',       type: 'boolean', sortable: true, width: '90px' },
      { field: 'createdAt',  header: 'Создан',        type: 'date', sortable: true, width: '120px' },
    ],
  },
  counterparties: {
    label: 'Контрагенты',
    icon: 'pi pi-users',
    columns: [
      { field: 'name',       header: 'Наименование',  type: 'text', sortable: true },
      { field: 'inn',        header: 'ИНН',           type: 'text', width: '130px' },
      { field: 'legalForm',  header: 'Форма',         type: 'tag',  sortable: true, width: '80px' },
      { field: 'phone',      header: 'Телефон',       type: 'text', width: '130px' },
      { field: 'email',      header: 'Email',         type: 'text' },
      { field: 'createdAt',  header: 'Создан',        type: 'date', sortable: true, width: '120px' },
    ],
  },
  users: {
    label: 'Пользователи',
    icon: 'pi pi-user',
    columns: [
      { field: 'username',     header: 'Логин',    type: 'text', sortable: true },
      { field: 'displayName',  header: 'Имя',      type: 'text' },
      { field: 'email',        header: 'Email',    type: 'text' },
      { field: 'role',         header: 'Роль',     type: 'tag', sortable: true, width: '110px' },
      { field: 'createdAt',    header: 'Создан',   type: 'date', sortable: true, width: '120px' },
    ],
  },
  roles: {
    label: 'Роли',
    icon: 'pi pi-shield',
    columns: [
      { field: 'name',        header: 'Код',        type: 'text', sortable: true, width: '110px' },
      { field: 'label',       header: 'Название',   type: 'tag',  sortable: true },
      { field: 'description', header: 'Описание',   type: 'text' },
      { field: 'isSystem',    header: 'Системная',  type: 'boolean', sortable: true, width: '100px' },
      { field: 'createdAt',   header: 'Создан',     type: 'date', sortable: true, width: '120px' },
    ],
  },
  statuses: {
    label: 'Статусы',
    icon: 'pi pi-tag',
    columns: [
      { field: 'statusId',   header: 'Код',         type: 'text', sortable: true, width: '120px' },
      { field: 'label',      header: 'Название',    type: 'text' },
      { field: 'entityType', header: 'Сущность',    type: 'tag',  sortable: true, width: '120px' },
      { field: 'color',      header: 'Цвет',        type: 'text', width: '80px' },
      { field: 'createdAt',  header: 'Создан',      type: 'date', sortable: true, width: '120px' },
    ],
  },
  workTypes: {
    label: 'Типы работ',
    icon: 'pi pi-wrench',
    columns: [
      { field: 'name',       header: 'Название',    type: 'text', sortable: true },
      { field: 'section',    header: 'Раздел',      type: 'tag',  sortable: true, width: '120px' },
      { field: 'createdAt',  header: 'Создан',      type: 'date', sortable: true, width: '120px' },
    ],
  },
  settings: {
    label: 'Настройки',
    icon: 'pi pi-cog',
    columns: [
      { field: 'key',         header: 'Ключ',        type: 'text', sortable: true },
      { field: 'value',       header: 'Значение',    type: 'text' },
      { field: 'description', header: 'Описание',    type: 'text' },
      { field: 'createdAt',   header: 'Создан',      type: 'date', sortable: true, width: '120px' },
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
  ],
  template: `
    <app-page-layout>
      <div page-header class="page__header">
        <h1>Справочники</h1>
        <p class="page__subtitle">Часто используемые данные — редактируйте, добавляйте, управляйте</p>
      </div>

      <!-- Department-grouped tab navigation -->
      @for (group of visibleGroups(); track group.id) {
        <div class="dir-dept">
          <div class="dir-dept__header">
            <i [class]="group.icon + ' dir-dept__icon'"></i>
            <span class="dir-dept__label">{{ group.label }}</span>
          </div>
          <div class="dir-dept__tabs">
            @for (key of group.keys; track key) {
              @if (canView(key)) {
                <button
                  class="dir-dept__btn"
                  [class.dir-dept__btn--active]="activeKey() === key"
                  (click)="selectDir(key)"
                >
                  <i [class]="DIR_DISPLAYS[key].icon + ' dir-dept__btn-icon'"></i>
                  <span>{{ DIR_DISPLAYS[key].label }}</span>
                </button>
              }
            }
          </div>
        </div>
      }

      <!-- Quick-add presets -->
      @if (currentPresets().length > 0) {
        <div class="quick-access">
          <span class="quick-access__label">Быстрое добавление:</span>
          @for (preset of currentPresets(); track preset.label) {
            <button
              class="quick-access__chip"
              (click)="createPreset(preset.value)"
            >
              {{ preset.label }}
            </button>
          }
        </div>
      }

      <!-- Active CRUD page per directory type -->
      @switch (activeKey()) {
        @case ('categories') {
          <app-kp-crud-page
            [embedded]="true"
            title="Категории"
            description="Группировка товаров и материалов"
            [store]="stores.categories"
            [columns]="DIR_DISPLAYS.categories.columns"
            [permissions]="DIR_PERMS.categories"
            [severityFn]="severityFn"
            createLabel="Создать категорию"
          >
            <ng-template #form let-row>
              <div class="form-layout">
                <app-kp-input label="Название"        name="name"      [value]="row['name'] || ''"              (valueChange)="row['name'] = $event" [required]="true" />
                <app-kp-input label="Родитель (ID)"   name="parentId"  [value]="row['parentId'] || ''"          (valueChange)="row['parentId'] = $event" />
                <app-kp-input label="Порядок сортировки" name="sortOrder" [value]="(row['sortOrder'] ?? '')"    (valueChange)="row['sortOrder'] = ($event === '' ? 0 : +$event)" />
                <app-kp-select
                  label="Активна"
                  name="isActive"
                  [value]="toStr(row['isActive'] ?? true)"
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
            description="Поставщики, клиенты, подрядчики"
            [store]="stores.counterparties"
            [columns]="DIR_DISPLAYS.counterparties.columns"
            [permissions]="DIR_PERMS.counterparties"
            [severityFn]="severityFn"
            createLabel="Создать контрагента"
          >
            <ng-template #form let-row>
              <div class="form-layout">
                <app-kp-input label="Наименование"      name="name"      [value]="row['name'] || ''"    (valueChange)="row['name'] = $event"   [required]="true" />
                <app-kp-input label="ИНН"               name="inn"       [value]="row['inn'] || ''"     (valueChange)="row['inn'] = $event" />
                <app-kp-select
                  label="Правовая форма"
                  name="legalForm"
                  [value]="row['legalForm'] || 'ООО'"
                  (valueChange)="row['legalForm'] = $event"
                  [options]="legalFormOptions"
                />
                <app-kp-input label="Телефон"  name="phone" [value]="row['phone'] || ''"  (valueChange)="row['phone'] = $event" />
                <app-kp-input label="Email"    name="email" [value]="row['email'] || ''"  (valueChange)="row['email'] = $event" />
              </div>
            </ng-template>
          </app-kp-crud-page>
        }

        @case ('users') {
          <app-kp-crud-page
            [embedded]="true"
            title="Пользователи"
            description="Учётные записи сотрудников"
            [store]="stores.users"
            [columns]="DIR_DISPLAYS.users.columns"
            [permissions]="DIR_PERMS.users"
            [severityFn]="severityFn"
            createLabel="Создать пользователя"
          >
            <ng-template #form let-row>
              <div class="form-layout">
                <app-kp-input label="Логин"       name="username"     [value]="row['username'] || ''"        (valueChange)="row['username'] = $event"     [required]="true" />
                <app-kp-input label="Отображаемое имя" name="displayName" [value]="row['displayName'] || ''" (valueChange)="row['displayName'] = $event" />
                <app-kp-input label="Email"       name="email"        [value]="row['email'] || ''"           (valueChange)="row['email'] = $event" />
                <app-kp-select
                  label="Роль"
                  name="role"
                  [value]="row['role'] || 'viewer'"
                  (valueChange)="row['role'] = $event"
                  [options]="roleOptions"
                />
              </div>
            </ng-template>
          </app-kp-crud-page>
        }

        @case ('roles') {
          <app-kp-crud-page
            [embedded]="true"
            title="Роли"
            description="Роли доступа и их права"
            [store]="stores.roles"
            [columns]="DIR_DISPLAYS.roles.columns"
            [permissions]="DIR_PERMS.roles"
            [severityFn]="severityFn"
            createLabel="Создать роль"
          >
            <ng-template #form let-row>
              <div class="form-layout">
                <app-kp-input label="Код роли"      name="name"        [value]="row['name'] || ''"       (valueChange)="row['name'] = $event"      [required]="true" />
                <app-kp-input label="Название"      name="label"       [value]="row['label'] || ''"      (valueChange)="row['label'] = $event" />
                <app-kp-input label="Описание"      name="description" [value]="row['description'] || ''" (valueChange)="row['description'] = $event" />
                <app-kp-select
                  label="Системная"
                  name="isSystem"
                  [value]="toStr(row['isSystem'] ?? false)"
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
            description="Статусы документов и процессов"
            [store]="stores.statuses"
            [columns]="DIR_DISPLAYS.statuses.columns"
            [permissions]="DIR_PERMS.statuses"
            [severityFn]="severityFn"
            createLabel="Создать статус"
          >
            <ng-template #form let-row>
              <div class="form-layout">
                <app-kp-input label="Код статуса" name="statusId" [value]="row['statusId'] || ''"       (valueChange)="row['statusId'] = $event"  [required]="true" />
                <app-kp-input label="Название"     name="label"   [value]="row['label'] || ''"          (valueChange)="row['label'] = $event" />
                <app-kp-select
                  label="Сущность"
                  name="entityType"
                  [value]="row['entityType'] || 'ORDER'"
                  (valueChange)="row['entityType'] = $event"
                  [options]="entityTypeOptions"
                />
                <app-kp-input label="Цвет (hex)" name="color" [value]="row['color'] || '#6b7280'" (valueChange)="row['color'] = $event" />
              </div>
            </ng-template>
          </app-kp-crud-page>
        }

        @case ('workTypes') {
          <app-kp-crud-page
            [embedded]="true"
            title="Типы работ"
            description="Виды работ и операций"
            [store]="stores.workTypes"
            [columns]="DIR_DISPLAYS.workTypes.columns"
            [permissions]="DIR_PERMS.workTypes"
            [severityFn]="severityFn"
            createLabel="Создать тип работы"
          >
            <ng-template #form let-row>
              <div class="form-layout">
                <app-kp-input label="Название" name="name" [value]="row['name'] || ''" (valueChange)="row['name'] = $event" [required]="true" />
                <app-kp-select
                  label="Раздел"
                  name="section"
                  [value]="row['section'] || 'work'"
                  (valueChange)="row['section'] = $event"
                  [options]="workSectionOptions"
                />
              </div>
            </ng-template>
          </app-kp-crud-page>
        }

        @case ('settings') {
          <app-kp-crud-page
            [embedded]="true"
            title="Настройки"
            description="Системные настройки и конфигурация"
            [store]="stores.settings"
            [columns]="DIR_DISPLAYS.settings.columns"
            [permissions]="DIR_PERMS.settings"
            [severityFn]="severityFn"
            createLabel="Создать настройку"
          >
            <ng-template #form let-row>
              <div class="form-layout">
                <app-kp-input label="Ключ"         name="key"          [value]="row['key'] || ''"          (valueChange)="row['key'] = $event"          [required]="true" />
                <app-kp-input label="Значение"     name="value"        [value]="row['value'] || ''"         (valueChange)="row['value'] = $event" />
                <app-kp-input label="Описание"     name="description"  [value]="row['description'] || ''"   (valueChange)="row['description'] = $event" />
              </div>
            </ng-template>
          </app-kp-crud-page>
        }

        @default {
          <div class="p-4 text-center text-secondary">Выберите справочник</div>
        }
      }
    </app-page-layout>
  `,
  styleUrl: './directories-page.component.scss',
})
export class DirectoriesPageComponent {
  readonly stores: DirStores;
  readonly DIR_PERMS: Record<DirKey, CrudPermissions>;
  readonly DIR_DISPLAYS = DIR_DISPLAYS;
  readonly severityFn = dirSeverity;

  readonly yesNoOptions: KpSelectOption[] = [
    { label: 'Да', value: 'true' },
    { label: 'Нет', value: 'false' },
  ];

  readonly legalFormOptions: KpSelectOption[] = [
    { label: 'ООО', value: 'ООО' },
    { label: 'ИП', value: 'ИП' },
    { label: 'АО', value: 'АО' },
    { label: 'Физлицо', value: 'Физлицо' },
  ];

  readonly roleOptions: KpSelectOption[] = [
    { label: 'Администратор', value: 'admin' },
    { label: 'Менеджер', value: 'manager' },
    { label: 'Наблюдатель', value: 'viewer' },
  ];

  readonly entityTypeOptions: KpSelectOption[] = [
    { label: 'Заказ', value: 'ORDER' },
    { label: 'Позиция заказа', value: 'ORDER_ITEM' },
    { label: 'Задача', value: 'WORK_TASK' },
    { label: 'Заявка', value: 'MATERIAL_REQUEST' },
  ];

  readonly workSectionOptions: KpSelectOption[] = [
    { label: 'Материалы', value: 'materials' },
    { label: 'Работа', value: 'work' },
    { label: 'Задача', value: 'task' },
    { label: 'Чертеж', value: 'drawing' },
  ];

  private readonly auth = inject(AuthService);

  readonly activeKey = signal<DirKey>('counterparties');

  constructor() {
    const destroyRef = inject(DestroyRef);
    this.stores = createDirStores(destroyRef);

    // Build permissions for each directory type
    this.DIR_PERMS = {} as Record<DirKey, CrudPermissions>;
    for (const key of Object.keys(DIR_DISPLAYS) as DirKey[]) {
      this.DIR_PERMS[key] = perms(key);
    }
  }

  /** Filter groups to only those containing at least one visible directory */
  readonly visibleGroups = computed(() => {
    return DIR_GROUPS
      .map((g) => ({
        ...g,
        keys: g.keys.filter((k) => this.canView(k)),
      }))
      .filter((g) => g.keys.length > 0);
  });

  /** Quick-add presets for the active directory */
  readonly currentPresets = computed(() => {
    return QUICK_PRESETS[this.activeKey()] ?? [];
  });

  canView(key: DirKey): boolean {
    const p = this.DIR_PERMS[key];
    return !p?.view || this.auth.hasPermission(p.view);
  }

  selectDir(key: DirKey): void {
    this.activeKey.set(key);
  }

  createPreset(value: Record<string, unknown>): void {
    const store = this.stores[this.activeKey()];
    store.create(value);
  }

  toStr(value: unknown): string {
    return String(value ?? '');
  }
}
