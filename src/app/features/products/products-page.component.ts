import { Component, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';

import { KpCrudPageComponent } from '../../shared/crud/kp-crud-page.component';
import {
  KpInputComponent,
  KpSelectComponent,
  KpTextareaComponent,
  type KpSelectOption,
  type KpColumn,
} from '../../shared/ui';
import { createProductsStore } from './products.store';
import { PERMISSIONS } from '../../core/permissions';

function productSeverity(value: unknown): string {
  const map: Record<string, string> = {
    active: 'success',
    draft: 'warn',
    archived: 'danger',
    ITEM: 'info',
    SERVICE: 'warn',
    WORK: 'success',
  };
  return map[String(value)] || 'info';
}

@Component({
  selector: 'app-products-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KpCrudPageComponent,
    KpInputComponent,
    KpSelectComponent,
    KpTextareaComponent,
  ],
  template: `
    <app-kp-crud-page
      title="Товары"
      entityLabel="товара"
      description="Справочник товаров, услуг и работ"
      [store]="store"
      [columns]="columns"
      [permissions]="PERMISSIONS.products"
      [severityFn]="productSeverity"
      createLabel="Создать товар"
    >
      <ng-template #form let-row>
        <div class="form-layout">
          <app-kp-input
            label="Наименование"
            name="name"
            [value]="row['name'] || ''"
            (valueChange)="row['name'] = $event"
            [required]="true"
          />
          <app-kp-input
            label="Артикул"
            name="sku"
            [value]="row['sku'] || ''"
            (valueChange)="row['sku'] = $event"
          />
          <app-kp-select
            label="Тип"
            name="kind"
            [value]="row['kind'] || 'ITEM'"
            (valueChange)="row['kind'] = $event"
            [options]="kindOptions"
            [required]="true"
          />
          <app-kp-input
            label="Единица измерения"
            name="unit"
            [value]="row['unit'] || ''"
            (valueChange)="row['unit'] = $event"
          />
          <app-kp-select
            label="Статус"
            name="status"
            [value]="row['status'] || 'active'"
            (valueChange)="row['status'] = $event"
            [options]="statusOptions"
          />
          <app-kp-textarea
            label="Описание"
            name="description"
            [value]="row['description'] || ''"
            (valueChange)="row['description'] = $event"
          />
        </div>
      </ng-template>
    </app-kp-crud-page>
  `,
})
export class ProductsPageComponent {
  readonly PERMISSIONS = PERMISSIONS;
  readonly productSeverity = productSeverity;

  readonly kindOptions: KpSelectOption[] = [
    { label: 'Товар', value: 'ITEM' },
    { label: 'Услуга', value: 'SERVICE' },
    { label: 'Работа', value: 'WORK' },
  ];

  readonly statusOptions: KpSelectOption[] = [
    { label: 'Активен', value: 'active' },
    { label: 'Черновик', value: 'draft' },
    { label: 'Архив', value: 'archived' },
  ];

  readonly columns: KpColumn[] = [
    { field: 'name', header: 'Наименование', type: 'text', sortable: true },
    { field: 'sku', header: 'Артикул', type: 'text', sortable: true },
    { field: 'kind', header: 'Тип', type: 'tag', sortable: true },
    { field: 'unit', header: 'Ед. изм.', type: 'text', sortable: true, width: '100px' },
    { field: 'status', header: 'Статус', type: 'tag', sortable: true, width: '110px' },
    { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
  ];

  readonly store = createProductsStore(inject(DestroyRef));
}
