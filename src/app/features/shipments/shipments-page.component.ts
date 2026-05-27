import {
  Component,
  inject,
  DestroyRef,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { KpCrudPageComponent } from '../../shared/crud/kp-crud-page.component';
import {
  KpInputComponent,
  KpSelectComponent,
  KpTextareaComponent,
  KpDatepickerComponent,
  type KpSelectOption,
  type KpColumn,
} from '../../shared/ui';
import { OrderOptionsService } from '../../shared/services/order-options.service';
import { patchCrudColumnOptions } from '../../shared/services/crud-column-options.util';
import { createShipmentsStore } from './shipments.store';
import { PERMISSIONS } from '../../core/permissions';

const SHIPMENT_STATUS_OPTIONS: KpSelectOption[] = [
  { label: 'Подготовка', value: 'preparing' },
  { label: 'Отгружено', value: 'shipped' },
  { label: 'Доставлено', value: 'delivered' },
  { label: 'Отменено', value: 'cancelled' },
];

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
      entityLabel="отгрузки"
      description="Отгрузка продукции клиентам"
      [store]="store"
      [columns]="columns()"
      [permissions]="PERMISSIONS.shipments"
      [severityFn]="shipmentSeverity"
      createLabel="Создать отгрузку"
    >
      <ng-template #form let-row>
        <div class="form-layout">
          <app-kp-input
            label="Номер"
            name="number"
            placeholder="Например, ОТ-001"
            [value]="row['number'] || ''"
            (valueChange)="row['number'] = $event"
            [required]="true"
          />
          <app-kp-select
            label="Заказ"
            name="orderId"
            placeholder="Выберите заказ"
            [value]="row['orderId'] || ''"
            (valueChange)="row['orderId'] = $event"
            [options]="orderOptions()"
            [required]="true"
          />
          <app-kp-datepicker
            label="Дата"
            name="date"
            [value]="row['date'] || ''"
            (valueChange)="row['date'] = $event"
          />
          <app-kp-select
            label="Статус"
            name="statusId"
            placeholder="Выберите статус"
            [value]="row['statusId'] || 'preparing'"
            (valueChange)="row['statusId'] = $event"
            [options]="statusOptions"
            [required]="true"
          />
          <app-kp-input
            label="Получатель"
            name="recipient"
            placeholder="ФИО или организация"
            [value]="row['recipient'] || ''"
            (valueChange)="row['recipient'] = $event"
          />
          <app-kp-textarea
            label="Адрес доставки"
            name="address"
            placeholder="Полный адрес доставки"
            [value]="row['address'] || ''"
            (valueChange)="row['address'] = $event"
            [rows]="2"
          />
          <app-kp-input
            label="Данные водителя"
            name="driverInfo"
            placeholder="ФИО, телефон, автомобиль"
            [value]="row['driverInfo'] || ''"
            (valueChange)="row['driverInfo'] = $event"
          />
        </div>
      </ng-template>
    </app-kp-crud-page>
  `,
})
export class ShipmentsPageComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;
  readonly shipmentSeverity = shipmentSeverity;
  readonly statusOptions = SHIPMENT_STATUS_OPTIONS;

  readonly orderOptions = signal<KpSelectOption[]>([]);

  readonly columns = signal<KpColumn[]>([
    { field: 'number', header: 'Номер', type: 'text', sortable: true, width: '140px' },
    { field: 'orderId', header: 'Заказ', type: 'select', sortable: true, options: [] },
    { field: 'date', header: 'Дата', type: 'date', sortable: true, width: '120px' },
    {
      field: 'statusId',
      header: 'Статус',
      type: 'tag',
      sortable: true,
      width: '130px',
      options: SHIPMENT_STATUS_OPTIONS,
    },
    { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
  ]);

  readonly store = createShipmentsStore(inject(DestroyRef));

  private readonly orderOptionsService = inject(OrderOptionsService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.orderOptionsService
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((options) => {
        this.orderOptions.set(options);
        patchCrudColumnOptions(this.columns, 'orderId', options);
      });
  }
}
