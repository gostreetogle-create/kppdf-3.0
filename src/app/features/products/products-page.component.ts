import { Component, inject, DestroyRef, ChangeDetectionStrategy, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { KpCrudPageComponent } from '../../shared/crud/kp-crud-page.component';
import {
  KpInputComponent,
  KpInputNumberComponent,
  KpSelectComponent,
  KpTextareaComponent,
  type KpSelectOption,
  type KpColumn,
} from '../../shared/ui';
import { AttributesEditorComponent } from '../attributes/attributes-editor.component';
import { CategoryOptionsService } from '../../shared/services/category-options.service';
import { patchCrudColumnOptions } from '../../shared/services/crud-column-options.util';
import { createProductsStore } from './products.store';
import { PERMISSIONS } from '../../core/permissions';

const PRODUCT_KIND_OPTIONS: KpSelectOption[] = [
  { label: 'Товар', value: 'ITEM' },
  { label: 'Услуга', value: 'SERVICE' },
  { label: 'Работа', value: 'WORK' },
];

const PRODUCT_STATUS_OPTIONS: KpSelectOption[] = [
  { label: 'Активен', value: 'active' },
  { label: 'Черновик', value: 'draft' },
  { label: 'Архив', value: 'archived' },
];

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
    KpInputNumberComponent,
    KpSelectComponent,
    KpTextareaComponent,
    AttributesEditorComponent,
  ],
  template: `
    <app-kp-crud-page
      title="Товары"
      entityLabel="товара"
      description="Справочник товаров, услуг и работ"
      [store]="store"
      [columns]="columns()"
      [permissions]="PERMISSIONS.products"
      [severityFn]="productSeverity"
      createLabel="Создать товар"
      dialogWidth="680px"
    >
      <ng-template #form let-row let-id="id">
        <div class="form-layout">
          <app-kp-input
            label="Наименование"
            name="name"
            placeholder="Введите наименование"
            [value]="row['name'] || ''"
            (valueChange)="row['name'] = $event"
            [required]="true"
          />
          <app-kp-input
            label="Артикул"
            name="sku"
            placeholder="Например, PRD-001"
            [value]="row['sku'] || ''"
            (valueChange)="row['sku'] = $event"
          />
          <app-kp-select
            label="Тип"
            name="kind"
            placeholder="Выберите тип"
            [value]="row['kind'] || 'ITEM'"
            (valueChange)="row['kind'] = $event"
            [options]="kindOptions"
            [required]="true"
          />
          <app-kp-select
            label="Категория"
            name="categoryId"
            placeholder="Выберите категорию"
            [value]="row['categoryId'] || ''"
            (valueChange)="row['categoryId'] = $event"
            [options]="categoryOptions()"
          />
          <app-kp-input
            label="Единица измерения"
            name="unit"
            placeholder="шт, м, кг…"
            [value]="row['unit'] || ''"
            (valueChange)="row['unit'] = $event"
          />
          <app-kp-input-number
            label="Цена"
            name="listPrice"
            placeholder="0"
            [value]="row['listPrice'] ?? 0"
            (valueChange)="row['listPrice'] = $event"
            [min]="0"
          />
          <app-kp-input-number
            label="Остаток"
            name="stockQty"
            placeholder="0"
            [value]="row['stockQty'] ?? 0"
            (valueChange)="row['stockQty'] = $event"
            [min]="0"
          />
          <app-kp-select
            label="Статус"
            name="status"
            placeholder="Выберите статус"
            [value]="row['status'] || 'active'"
            (valueChange)="row['status'] = $event"
            [options]="statusOptions"
            [required]="true"
          />
          <app-kp-textarea
            label="Описание"
            name="description"
            placeholder="Краткое описание товара"
            [value]="row['description'] || ''"
            (valueChange)="row['description'] = $event"
          />
          @if (id) {
            <app-attributes-editor entityType="product" [entityId]="id" />
          } @else {
            <p class="form-hint">Дополнительные характеристики будут доступны после сохранения товара.</p>
          }
        </div>
      </ng-template>
    </app-kp-crud-page>
  `,
})
export class ProductsPageComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;
  readonly productSeverity = productSeverity;
  readonly kindOptions = PRODUCT_KIND_OPTIONS;
  readonly statusOptions = PRODUCT_STATUS_OPTIONS;

  readonly categoryOptions = signal<KpSelectOption[]>([]);

  readonly columns = signal<KpColumn[]>([
    { field: 'sku', header: 'Артикул', type: 'text', sortable: true, width: '110px' },
    { field: 'name', header: 'Наименование', type: 'text', sortable: true },
    {
      field: 'kind',
      header: 'Тип',
      type: 'tag',
      sortable: true,
      width: '110px',
      options: PRODUCT_KIND_OPTIONS,
    },
    { field: 'unit', header: 'Ед. изм.', type: 'text', sortable: true, width: '90px' },
    { field: 'categoryId', header: 'Категория', type: 'select', sortable: true, options: [] },
    { field: 'listPrice', header: 'Цена', type: 'number', sortable: true, width: '100px' },
    { field: 'stockQty', header: 'Остаток', type: 'number', sortable: true, width: '100px' },
    {
      field: 'status',
      header: 'Статус',
      type: 'tag',
      sortable: true,
      width: '110px',
      options: PRODUCT_STATUS_OPTIONS,
    },
  ]);

  readonly store = createProductsStore(inject(DestroyRef));

  private readonly categoryOptionsService = inject(CategoryOptionsService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.categoryOptionsService
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((options) => {
        this.categoryOptions.set(options);
        patchCrudColumnOptions(this.columns, 'categoryId', options);
      });
  }
}
