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

const YES_NO_OPTIONS: KpSelectOption[] = [
  { label: 'Да', value: 'true' },
  { label: 'Нет', value: 'false' },
];

function workOrderSeverity(value: unknown): string {
  const map: Record<string, string> = {
    pending: 'secondary',
    in_progress: 'warn',
    completed: 'success',
    cancelled: 'danger',
    new: 'info',
    on_hold: 'secondary',
    true: 'success',
    false: 'secondary',
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
      title="Производственные заказы"
      entityLabel="производственного заказа"
      description="Заказы на производство"
      [store]="store"
      [columns]="columns()"
      [permissions]="PERMISSIONS['work-orders']"
      [severityFn]="workOrderSeverity"
      createLabel="Создать заказ"
      dialogWidth="min(920px, 96vw)"
    >
      <ng-template #form let-row>
        <div class="form-layout form-layout--2col">
          <div class="form-layout__column">
            <section class="form-section form-section--blue">
              <h3 class="form-section__title">
                <i class="pi pi-file" aria-hidden="true"></i>
                Документ
              </h3>
              <div class="form-section__fields">
                <app-kp-input
                  label="Номер"
                  name="number"
                  placeholder="Например, ПЗ-001"
                  [value]="row['number'] || ''"
                  (valueChange)="row['number'] = $event"
                  [required]="true"
                />
                <app-kp-select
                  label="Статус"
                  name="statusId"
                  placeholder="Выберите статус"
                  [value]="row['statusId'] || 'pending'"
                  (valueChange)="row['statusId'] = $event"
                  [options]="statusOptions"
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
            </section>
            <section class="form-section form-section--amber">
              <h3 class="form-section__title">
                <i class="pi pi-calendar" aria-hidden="true"></i>
                Сроки
              </h3>
              <div class="form-section__fields">
                <app-kp-datepicker
                  label="Начало"
                  name="startDate"
                  [value]="row['startDate'] || ''"
                  (valueChange)="row['startDate'] = $event"
                />
                <app-kp-datepicker
                  label="Окончание"
                  name="endDate"
                  [value]="row['endDate'] || ''"
                  (valueChange)="row['endDate'] = $event"
                />
              </div>
            </section>
          </div>
          <div class="form-layout__column">
            <section class="form-section form-section--green">
              <h3 class="form-section__title">
                <i class="pi pi-cog" aria-hidden="true"></i>
                Производство
              </h3>
              <div class="form-section__fields">
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
                <app-kp-input-number
                  label="Количество"
                  name="qty"
                  placeholder="1"
                  [value]="row['qty'] ?? null"
                  (valueChange)="row['qty'] = $event"
                  [useGrouping]="false"
                  [required]="true"
                />
              </div>
            </section>
            <section class="form-section form-section--purple">
              <h3 class="form-section__title">
                <i class="pi pi-user" aria-hidden="true"></i>
                Исполнение
              </h3>
              <div class="form-section__fields">
                <app-kp-input
                  label="Ответственный"
                  name="assignedTo"
                  placeholder="ФИО исполнителя"
                  [value]="row['assignedTo'] || ''"
                  (valueChange)="row['assignedTo'] = $event"
                />
                <app-kp-textarea
                  label="Примечание"
                  name="notes"
                  placeholder="Дополнительная информация"
                  [value]="row['notes'] || ''"
                  (valueChange)="row['notes'] = $event"
                  [rows]="3"
                />
              </div>
            </section>
          </div>
        </div>
      </ng-template>
    </app-kp-crud-page>
  `,
})
export class WorkOrdersPageComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;
  readonly workOrderSeverity = workOrderSeverity;
  readonly statusOptions = WORK_ORDER_STATUS_OPTIONS;
  readonly yesNoOptions = YES_NO_OPTIONS;

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
    { field: 'isActive', header: 'Активен', type: 'boolean', sortable: true, width: '90px' },
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

  boolToStr(value: unknown): string {
    return value === true || value === 'true' ? 'true' : 'false';
  }
}
