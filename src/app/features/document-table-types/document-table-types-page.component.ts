import { Component, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { KpCrudPageComponent } from '../../shared/crud/kp-crud-page.component';
import {
  KpInputComponent,
  KpSelectComponent,
  KpInputNumberComponent,
  KpTextareaComponent,
  type KpSelectOption,
  type KpColumn,
} from '../../shared/ui';
import { createDocumentTableTypesStore } from './document-table-types.store';
import { PERMISSIONS } from '../../core/permissions';

const DOC_TYPE_OPTIONS: KpSelectOption[] = [
  { label: 'КП', value: 'quotation' },
  { label: 'Договор', value: 'contract' },
  { label: 'Счёт', value: 'invoice' },
  { label: 'Отгрузка', value: 'shipping' },
];

const PRODUCT_KIND_OPTIONS: KpSelectOption[] = [
  { label: 'Товар (ITEM)', value: 'ITEM' },
  { label: 'Услуга (SERVICE)', value: 'SERVICE' },
  { label: 'Работа (WORK)', value: 'WORK' },
];

const YES_NO: KpSelectOption[] = [
  { label: 'Да', value: 'true' },
  { label: 'Нет', value: 'false' },
];

function tableTypeSeverity(value: unknown): string {
  const map: Record<string, string> = {
    true: 'success',
    false: 'secondary',
    quotation: 'info',
    contract: 'warn',
    invoice: 'success',
    shipping: 'secondary',
  };
  return map[String(value)] || 'info';
}

@Component({
  selector: 'app-document-table-types-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KpCrudPageComponent,
    KpInputComponent,
    KpSelectComponent,
    KpInputNumberComponent,
    KpTextareaComponent,
  ],
  template: `
    <app-kp-crud-page
      title="Типы таблиц документов"
      entityLabel="типа таблицы"
      description="Настраиваемые таблицы для редакторов КП, договоров и других документов"
      [store]="store"
      [columns]="columns"
      [permissions]="PERMISSIONS['document-table-types']"
      [severityFn]="tableTypeSeverity"
      createLabel="Создать тип таблицы"
      dialogWidth="min(720px, 96vw)"
    >
      <ng-template #form let-row>
        <div class="form-layout">
          <app-kp-input
            label="Название (код)"
            name="name"
            placeholder="Например: products"
            [value]="row['name'] || ''"
            (valueChange)="row['name'] = $event"
            [required]="true"
          />
          <app-kp-input
            label="Метка"
            name="label"
            placeholder="Например: Товары"
            [value]="row['label'] || ''"
            (valueChange)="row['label'] = $event"
            [required]="true"
          />
          <app-kp-input
            label="Заголовок таблицы"
            name="title"
            placeholder="Например: Товары"
            [value]="row['title'] || ''"
            (valueChange)="row['title'] = $event"
            [required]="true"
          />
          <app-kp-select
            label="Тип документа"
            name="docType"
            placeholder="Выберите документ"
            [value]="row['docType'] || 'quotation'"
            (valueChange)="row['docType'] = $event"
            [options]="docTypeOptions"
            [required]="true"
          />
          <app-kp-input
            label="Источник данных"
            name="dataSource"
            placeholder="Например: products, services"
            [value]="row['dataSource'] || ''"
            (valueChange)="row['dataSource'] = $event"
          />
          <app-kp-select
            label="Тип продукта"
            name="productKind"
            placeholder="Фильтр для пикера"
            [value]="row['productKind'] || ''"
            (valueChange)="row['productKind'] = $event || undefined"
            [options]="productKindOptions"
          />
          <app-kp-textarea
            label="Колонки (JSON)"
            name="columnsJson"
            placeholder='[{"field":"sku","header":"Арт.","type":"text","width":"60px"},...]'
            [value]="columnsToJson(row['columns'])"
            (valueChange)="row['columns'] = jsonToColumns($event)"
            [rows]="6"
          />
          <app-kp-input-number
            label="Размер шрифта"
            name="fontSize"
            placeholder="10"
            [value]="row['fontSize'] ?? 10"
            (valueChange)="row['fontSize'] = $event"
            [min]="8"
            [max]="18"
          />
          <app-kp-input-number
            label="Порядок"
            name="sortOrder"
            placeholder="0"
            [value]="row['sortOrder'] ?? 0"
            (valueChange)="row['sortOrder'] = $event"
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
  `,
})
export class DocumentTableTypesPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly store = createDocumentTableTypesStore(this.destroyRef);
  readonly PERMISSIONS = PERMISSIONS;
  readonly docTypeOptions = DOC_TYPE_OPTIONS;
  readonly productKindOptions = PRODUCT_KIND_OPTIONS;
  readonly yesNoOptions = YES_NO;
  readonly tableTypeSeverity = tableTypeSeverity;

  readonly columns: KpColumn[] = [
    { field: 'name', header: 'Код', type: 'text', sortable: true, width: '130px' },
    { field: 'label', header: 'Метка', type: 'text', sortable: true, width: '120px' },
    { field: 'title', header: 'Заголовок', type: 'text', sortable: true },
    { field: 'docType', header: 'Документ', type: 'tag', options: DOC_TYPE_OPTIONS, sortable: true, width: '110px' },
    { field: 'dataSource', header: 'Источник', type: 'text', sortable: true, width: '120px' },
    { field: 'productKind', header: 'Тип', type: 'tag', options: PRODUCT_KIND_OPTIONS, sortable: true, width: '90px' },
    { field: 'sortOrder', header: 'Порядок', type: 'number', sortable: true, width: '90px' },
    { field: 'isActive', header: 'Активен', type: 'tag', options: YES_NO, width: '90px' },
  ];

  columnsToJson(columns: unknown): string {
    if (!Array.isArray(columns) || columns.length === 0) return '';
    return JSON.stringify(columns, null, 2);
  }

  jsonToColumns(value: string): unknown[] {
    if (!value || !value.trim()) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  boolToStr(value: unknown): string {
    return value === true || value === 'true' ? 'true' : 'false';
  }
}
