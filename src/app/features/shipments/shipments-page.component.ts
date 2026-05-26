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
import { createShipmentsStore } from './shipments.store';
import { PERMISSIONS } from '../../core/permissions';

function shipmentSeverity(value: unknown): string {
  const map: Record<string, string> = {
    preparing: 'warn',
    shipped: 'info',
    delivered: 'success',
    cancelled: 'danger',
  };
  return map[String(value)] || 'info';
}

@Component({
  selector: 'app-shipments-page',
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
      title="Отгрузки"
      description="Отгрузка продукции клиентам"
      [store]="store"
      [columns]="columns"
      [permissions]="PERMISSIONS.shipments"
      [severityFn]="shipmentSeverity"
      createLabel="Создать отгрузку"
    >
      <ng-template #form let-row>
        <div class="form-layout">
          <app-kp-input label="Номер" name="number" [value]="row['number'] || ''" (valueChange)="row['number'] = $event" />
          <app-kp-input label="Заказ" name="orderId" [value]="row['orderId'] || ''" (valueChange)="row['orderId'] = $event" [required]="true" />
          <app-kp-datepicker label="Дата" name="date" [value]="row['date'] || ''" (valueChange)="row['date'] = $event" />
          <app-kp-select
            label="Статус"
            name="statusId"
            [value]="row['statusId'] || 'preparing'"
            (valueChange)="row['statusId'] = $event"
            [options]="statusOptions"
          />
          <app-kp-input label="Получатель" name="recipient" [value]="row['recipient'] || ''" (valueChange)="row['recipient'] = $event" />
          <app-kp-textarea label="Адрес доставки" name="address" [value]="row['address'] || ''" (valueChange)="row['address'] = $event" [rows]="2" />
          <app-kp-input label="Данные водителя" name="driverInfo" [value]="row['driverInfo'] || ''" (valueChange)="row['driverInfo'] = $event" />
        </div>
      </ng-template>
    </app-kp-crud-page>
  `,
})
export class ShipmentsPageComponent {
  readonly PERMISSIONS = PERMISSIONS;
  readonly shipmentSeverity = shipmentSeverity;

  readonly statusOptions: KpSelectOption[] = [
    { label: 'Подготовка', value: 'preparing' },
    { label: 'Отгружено', value: 'shipped' },
    { label: 'Доставлено', value: 'delivered' },
    { label: 'Отменено', value: 'cancelled' },
  ];

  readonly columns: KpColumn[] = [
    { field: 'number', header: 'Номер', type: 'text', sortable: true, width: '140px' },
    { field: 'orderId', header: 'Заказ', type: 'text', sortable: true },
    { field: 'date', header: 'Дата', type: 'date', sortable: true, width: '120px' },
    { field: 'statusId', header: 'Статус', type: 'tag', sortable: true, width: '130px' },
    { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
  ];

  readonly store = createShipmentsStore(inject(DestroyRef));
}
