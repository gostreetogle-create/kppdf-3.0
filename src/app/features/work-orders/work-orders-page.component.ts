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
  KpInputNumberComponent,
  KpDatepickerComponent,
  type KpSelectOption,
  type KpColumn,
} from '../../shared/ui';
import { OrderOptionsService } from '../../shared/services/order-options.service';
import { ProductOptionsService } from '../../shared/services/product-options.service';
import { patchCrudColumnOptions } from '../../shared/services/crud-column-options.util';
import { createWorkOrdersStore } from './work-orders.store';
import { PERMISSIONS } from '../../core/permissions';

const WORK_ORDER_STATUS_OPTIONS: KpSelectOption[] = [
  { label: 'Ожидает', value: 'pending' },
  { label: 'В работе', value: 'in_progress' },
  { label: 'Выполнен', value: 'completed' },
  { label: 'Отменён', value: 'cancelled' },
];

function workOrderSeverity(value: unknown): string {
  const map: Record<string, string> = {
    pending: 'secondary',
    in_progress: 'warn',
    completed: 'success',
    cancelled: 'danger',
    new: 'info',
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
      entityLabel="производственного наряда"
      description="Наряды на производство"
      [store]="store"
      [columns]="columns()"
      [permissions]="PERMISSIONS['work-orders']"
      [severityFn]="workOrderSeverity"
      createLabel="Создать наряд"
    >
      <ng-template #form let-row>
        <div class="form-layout">
          <app-kp-input label="Номер" name="number" [value]="row['number'] || ''" (valueChange)="row['number'] = $event" />
          <app-kp-select
            label="Заказ"
            name="orderId"
            placeholder="Выберите заказ"
            [value]="row['orderId'] || ''"
            (valueChange)="row['orderId'] = $event"
            [options]="orderOptions()"
            [required]="true"
          />
          <app-kp-select
            label="Товар"
            name="productId"
            placeholder="Выберите товар"
            [value]="row['productId'] || ''"
            (valueChange)="row['productId'] = $event"
            [options]="productOptions()"
            [required]="true"
          />
          <app-kp-input-number label="Количество" name="qty" [value]="row['qty'] ?? null" (valueChange)="row['qty'] = $event" />
          <app-kp-select
            label="Статус"
            name="statusId"
            [value]="row['statusId'] || 'pending'"
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
export class WorkOrdersPageComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;
  readonly workOrderSeverity = workOrderSeverity;
  readonly statusOptions = WORK_ORDER_STATUS_OPTIONS;

  readonly orderOptions = signal<KpSelectOption[]>([]);
  readonly productOptions = signal<KpSelectOption[]>([]);

  readonly columns = signal<KpColumn[]>([
    { field: 'number', header: 'Номер', type: 'text', sortable: true, width: '140px' },
    { field: 'orderId', header: 'Заказ', type: 'select', sortable: true, options: [] },
    { field: 'productId', header: 'Товар', type: 'select', sortable: true, options: [] },
    { field: 'qty', header: 'Кол-во', type: 'number', sortable: true, width: '90px' },
    {
      field: 'statusId',
      header: 'Статус',
      type: 'tag',
      sortable: true,
      width: '130px',
      options: WORK_ORDER_STATUS_OPTIONS,
    },
    { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
  ]);

  readonly store = createWorkOrdersStore(inject(DestroyRef));

  private readonly orderOptionsService = inject(OrderOptionsService);
  private readonly productOptionsService = inject(ProductOptionsService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.orderOptionsService
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((options) => {
        this.orderOptions.set(options);
        patchCrudColumnOptions(this.columns, 'orderId', options);
      });

    this.productOptionsService
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((options) => {
        this.productOptions.set(options);
        patchCrudColumnOptions(this.columns, 'productId', options);
      });
  }
}
