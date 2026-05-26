import { Component, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';

import { KpCrudPageComponent } from '../../shared/crud/kp-crud-page.component';
import {
  KpInputComponent,
  KpSelectComponent,
  KpTextareaComponent,
  KpInputNumberComponent,
  KpDatepickerComponent,
  type KpSelectOption,
  type KpColumn,
} from '../../shared/ui';
import { createWorkOrdersStore } from './work-orders.store';
import { PERMISSIONS } from '../../core/permissions';

function workOrderSeverity(value: unknown): string {
  const map: Record<string, string> = {
    new: 'info',
    in_progress: 'warn',
    completed: 'success',
    cancelled: 'danger',
    on_hold: 'secondary',
  };
  return map[String(value)] || 'info';
}

@Component({
  selector: 'app-work-orders-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KpCrudPageComponent,
    KpInputComponent,
    KpSelectComponent,
    KpTextareaComponent,
    KpInputNumberComponent,
    KpDatepickerComponent,
  ],
  template: `
    <app-kp-crud-page
      title="Производственные наряды"
      description="Наряды на производство"
      [store]="store"
      [columns]="columns"
      [permissions]="PERMISSIONS['work-orders']"
      [severityFn]="workOrderSeverity"
      createLabel="Создать наряд"
    >
      <ng-template #form let-row>
        <div class="form-layout">
          <app-kp-input label="Номер" name="number" [value]="row['number'] || ''" (valueChange)="row['number'] = $event" />
          <app-kp-input label="Заказ" name="orderId" [value]="row['orderId'] || ''" (valueChange)="row['orderId'] = $event" [required]="true" />
          <app-kp-input label="Товар" name="productId" [value]="row['productId'] || ''" (valueChange)="row['productId'] = $event" [required]="true" />
          <app-kp-input-number label="Количество" name="qty" [value]="row['qty'] ?? null" (valueChange)="row['qty'] = $event" />
          <app-kp-select
            label="Статус"
            name="statusId"
            [value]="row['statusId'] || 'new'"
            (valueChange)="row['statusId'] = $event"
            [options]="statusOptions"
          />
          <app-kp-datepicker label="Начало" name="startDate" [value]="row['startDate'] || ''" (valueChange)="row['startDate'] = $event" />
          <app-kp-datepicker label="Окончание" name="endDate" [value]="row['endDate'] || ''" (valueChange)="row['endDate'] = $event" />
          <app-kp-input label="Ответственный" name="assignedTo" [value]="row['assignedTo'] || ''" (valueChange)="row['assignedTo'] = $event" />
          <app-kp-textarea label="Примечание" name="notes" [value]="row['notes'] || ''" (valueChange)="row['notes'] = $event" />
        </div>
      </ng-template>
    </app-kp-crud-page>
  `,
})
export class WorkOrdersPageComponent {
  readonly PERMISSIONS = PERMISSIONS;
  readonly workOrderSeverity = workOrderSeverity;

  readonly statusOptions: KpSelectOption[] = [
    { label: 'Новый', value: 'new' },
    { label: 'В работе', value: 'in_progress' },
    { label: 'Выполнен', value: 'completed' },
    { label: 'Отменён', value: 'cancelled' },
    { label: 'Приостановлен', value: 'on_hold' },
  ];

  readonly columns: KpColumn[] = [
    { field: 'number', header: 'Номер', type: 'text', sortable: true, width: '140px' },
    { field: 'orderId', header: 'Заказ', type: 'text', sortable: true },
    { field: 'productId', header: 'Товар', type: 'text', sortable: true },
    { field: 'qty', header: 'Кол-во', type: 'number', sortable: true, width: '90px' },
    { field: 'statusId', header: 'Статус', type: 'tag', sortable: true, width: '130px' },
    { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
  ];

  readonly store = createWorkOrdersStore(inject(DestroyRef));
}
