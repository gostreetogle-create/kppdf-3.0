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
import { createOrdersStore } from './orders.store';
import { PERMISSIONS } from '../../core/permissions';

function orderSeverity(value: unknown): string {
  const map: Record<string, string> = {
    new: 'info',
    confirmed: 'success',
    in_production: 'warn',
    shipped: 'info',
    delivered: 'success',
    cancelled: 'danger',
  };
  return map[String(value)] || 'info';
}

@Component({
  selector: 'app-orders-page',
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
      title="Заказы"
      description="Заказы от клиентов"
      [store]="store"
      [columns]="columns"
      [permissions]="PERMISSIONS.orders"
      [severityFn]="orderSeverity"
      createLabel="Создать заказ"
    >
      <ng-template #form let-row>
        <div class="form-layout">
          <app-kp-input
            label="Номер"
            name="number"
            [value]="row['number'] || ''"
            (valueChange)="row['number'] = $event"
          />
          <app-kp-input
            label="Контрагент"
            name="counterpartyId"
            [value]="row['counterpartyId'] || ''"
            (valueChange)="row['counterpartyId'] = $event"
            [required]="true"
          />
          <app-kp-input
            label="КП основание"
            name="quotationId"
            [value]="row['quotationId'] || ''"
            (valueChange)="row['quotationId'] = $event"
          />
          <app-kp-datepicker
            label="Дата"
            name="date"
            [value]="row['date'] || ''"
            (valueChange)="row['date'] = $event"
          />
          <app-kp-datepicker
            label="План. дата"
            name="plannedDate"
            [value]="row['plannedDate'] || ''"
            (valueChange)="row['plannedDate'] = $event"
          />
          <app-kp-select
            label="Статус"
            name="statusId"
            [value]="row['statusId'] || 'new'"
            (valueChange)="row['statusId'] = $event"
            [options]="statusOptions"
          />
          <app-kp-textarea
            label="Примечание"
            name="notes"
            [value]="row['notes'] || ''"
            (valueChange)="row['notes'] = $event"
          />
        </div>
      </ng-template>
    </app-kp-crud-page>
  `,
})
export class OrdersPageComponent {
  readonly PERMISSIONS = PERMISSIONS;
  readonly orderSeverity = orderSeverity;

  readonly statusOptions: KpSelectOption[] = [
    { label: 'Новый', value: 'new' },
    { label: 'Подтверждён', value: 'confirmed' },
    { label: 'В производстве', value: 'in_production' },
    { label: 'Отгружен', value: 'shipped' },
    { label: 'Доставлен', value: 'delivered' },
    { label: 'Отменён', value: 'cancelled' },
  ];

  readonly columns: KpColumn[] = [
    { field: 'number', header: 'Номер', type: 'text', sortable: true, width: '140px' },
    { field: 'counterpartyId', header: 'Контрагент', type: 'text', sortable: true },
    { field: 'date', header: 'Дата', type: 'date', sortable: true, width: '120px' },
    { field: 'statusId', header: 'Статус', type: 'tag', sortable: true, width: '130px' },
    { field: 'total', header: 'Сумма', type: 'number', sortable: true, width: '120px' },
    { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
  ];

  readonly store = createOrdersStore(inject(DestroyRef));
}
