import { Component, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';

import { KpCrudPageComponent } from '../../shared/crud/kp-crud-page.component';
import {
  KpInputComponent,
  KpSelectComponent,
  KpTextareaComponent,
  KpDatepickerComponent,
  type KpSelectOption,
  type KpColumn,
} from '../../shared/ui';
import { createPurchaseOrdersStore } from './purchase-orders.store';
import { PERMISSIONS } from '../../core/permissions';

function poSeverity(value: unknown): string {
  const map: Record<string, string> = {
    draft: 'warn',
    sent: 'info',
    confirmed: 'success',
    partially_delivered: 'info',
    delivered: 'success',
    cancelled: 'danger',
  };
  return map[String(value)] || 'info';
}

@Component({
  selector: 'app-purchase-orders-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KpCrudPageComponent,
    KpInputComponent,
    KpSelectComponent,
    KpTextareaComponent,
    KpDatepickerComponent,
  ],
  template: `
    <app-kp-crud-page
      title="Заказы поставщикам"
      description="Закупки у поставщиков"
      [store]="store"
      [columns]="columns"
      [permissions]="PERMISSIONS['purchase-orders']"
      [severityFn]="poSeverity"
      createLabel="Создать заказ"
    >
      <ng-template #form let-row>
        <div class="form-layout">
          <app-kp-input label="Номер" name="number" [value]="row['number'] || ''" (valueChange)="row['number'] = $event" />
          <app-kp-input
            label="Поставщик"
            name="supplierId"
            [value]="row['supplierId'] || ''"
            (valueChange)="row['supplierId'] = $event"
            [required]="true"
          />
          <app-kp-datepicker label="Дата заказа" name="orderDate" [value]="row['orderDate'] || ''" (valueChange)="row['orderDate'] = $event" />
          <app-kp-datepicker label="Дата поставки" name="deliveryDate" [value]="row['deliveryDate'] || ''" (valueChange)="row['deliveryDate'] = $event" />
          <app-kp-select
            label="Статус"
            name="statusId"
            [value]="row['statusId'] || 'draft'"
            (valueChange)="row['statusId'] = $event"
            [options]="statusOptions"
          />
          <app-kp-textarea label="Примечание" name="notes" [value]="row['notes'] || ''" (valueChange)="row['notes'] = $event" />
        </div>
      </ng-template>
    </app-kp-crud-page>
  `,
})
export class PurchaseOrdersPageComponent {
  readonly PERMISSIONS = PERMISSIONS;
  readonly poSeverity = poSeverity;

  readonly statusOptions: KpSelectOption[] = [
    { label: 'Черновик', value: 'draft' },
    { label: 'Отправлен', value: 'sent' },
    { label: 'Подтверждён', value: 'confirmed' },
    { label: 'Частично получен', value: 'partially_delivered' },
    { label: 'Получен', value: 'delivered' },
    { label: 'Отменён', value: 'cancelled' },
  ];

  readonly columns: KpColumn[] = [
    { field: 'number', header: 'Номер', type: 'text', sortable: true, width: '140px' },
    { field: 'supplierId', header: 'Поставщик', type: 'text', sortable: true },
    { field: 'orderDate', header: 'Дата заказа', type: 'date', sortable: true, width: '130px' },
    { field: 'statusId', header: 'Статус', type: 'tag', sortable: true, width: '160px' },
    { field: 'total', header: 'Сумма', type: 'number', sortable: true, width: '120px' },
    { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
  ];

  readonly store = createPurchaseOrdersStore(inject(DestroyRef));
}
