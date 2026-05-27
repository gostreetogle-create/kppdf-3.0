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
import { CounterpartyOptionsService } from '../../shared/services/counterparty-options.service';
import { QuotationOptionsService } from '../../shared/services/quotation-options.service';
import { patchCrudColumnOptions } from '../../shared/services/crud-column-options.util';
import { createOrdersStore } from './orders.store';
import { PERMISSIONS } from '../../core/permissions';

const ORDER_STATUS_OPTIONS: KpSelectOption[] = [
  { label: 'Черновик', value: 'draft' },
  { label: 'Подтверждён', value: 'confirmed' },
  { label: 'В работе', value: 'in_progress' },
  { label: 'Выполнен', value: 'completed' },
  { label: 'Отменён', value: 'cancelled' },
];

function orderSeverity(value: unknown): string {
  const map: Record<string, string> = {
    draft: 'warn',
    confirmed: 'info',
    in_progress: 'warn',
    completed: 'success',
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
      entityLabel="заказа"
      description="Заказы от клиентов"
      [store]="store"
      [columns]="columns()"
      [permissions]="PERMISSIONS.orders"
      [severityFn]="orderSeverity"
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
                  placeholder="Например, ЗК-001"
                  [value]="row['number'] || ''"
                  (valueChange)="row['number'] = $event"
                  [required]="true"
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
                  placeholder="Выберите статус"
                  [value]="row['statusId'] || 'draft'"
                  (valueChange)="row['statusId'] = $event"
                  [options]="statusOptions"
                  [required]="true"
                />
              </div>
            </section>
          </div>
          <div class="form-layout__column">
            <section class="form-section form-section--purple">
              <h3 class="form-section__title">
                <i class="pi pi-users" aria-hidden="true"></i>
                Контрагент и основание
              </h3>
              <div class="form-section__fields">
                <app-kp-select
                  label="Контрагент"
                  name="counterpartyId"
                  placeholder="Выберите контрагента"
                  [value]="row['counterpartyId'] || ''"
                  (valueChange)="row['counterpartyId'] = $event"
                  [options]="counterpartyOptions()"
                  [required]="true"
                />
                <app-kp-select
                  label="КП основание"
                  name="quotationId"
                  placeholder="Выберите КП"
                  [value]="row['quotationId'] || ''"
                  (valueChange)="row['quotationId'] = $event"
                  [options]="quotationOptions()"
                />
              </div>
            </section>
            <section class="form-section form-section--amber">
              <h3 class="form-section__title">
                <i class="pi pi-comment" aria-hidden="true"></i>
                Примечание
              </h3>
              <div class="form-section__fields">
                <app-kp-textarea
                  label="Примечание"
                  name="notes"
                  placeholder="Комментарий к заказу"
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
export class OrdersPageComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;
  readonly orderSeverity = orderSeverity;
  readonly statusOptions = ORDER_STATUS_OPTIONS;

  readonly counterpartyOptions = signal<KpSelectOption[]>([]);
  readonly quotationOptions = signal<KpSelectOption[]>([]);

  readonly columns = signal<KpColumn[]>([
    { field: 'number', header: 'Номер', type: 'text', sortable: true, width: '140px' },
    { field: 'counterpartyId', header: 'Контрагент', type: 'select', sortable: true, options: [] },
    { field: 'date', header: 'Дата', type: 'date', sortable: true, width: '120px' },
    {
      field: 'statusId',
      header: 'Статус',
      type: 'tag',
      sortable: true,
      width: '130px',
      options: ORDER_STATUS_OPTIONS,
    },
    { field: 'total', header: 'Сумма', type: 'number', sortable: true, width: '120px' },
    { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
  ]);

  readonly store = createOrdersStore(inject(DestroyRef));

  private readonly counterpartyOptionsService = inject(CounterpartyOptionsService);
  private readonly quotationOptionsService = inject(QuotationOptionsService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.counterpartyOptionsService
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((options) => {
        this.counterpartyOptions.set(options);
        patchCrudColumnOptions(this.columns, 'counterpartyId', options);
      });

    this.quotationOptionsService
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((options) => this.quotationOptions.set(options));
  }
}
