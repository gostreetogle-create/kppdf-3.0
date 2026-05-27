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
import { patchCrudColumnOptions } from '../../shared/services/crud-column-options.util';
import { createPurchaseOrdersStore } from './purchase-orders.store';
import { PERMISSIONS } from '../../core/permissions';

const PO_STATUS_OPTIONS: KpSelectOption[] = [
  { label: 'Новый', value: 'new' },
  { label: 'Отправлен', value: 'sent' },
  { label: 'Подтверждён поставщиком', value: 'confirmed_by_supplier' },
  { label: 'Частично получен', value: 'partially_received' },
  { label: 'Выполнен', value: 'completed' },
  { label: 'Отменён', value: 'cancelled' },
];

function poSeverity(value: unknown): string {
  const map: Record<string, string> = {
    new: 'warn',
    sent: 'info',
    confirmed_by_supplier: 'success',
    partially_received: 'info',
    completed: 'success',
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
      entityLabel="закупки"
      description="Закупки у поставщиков"
      [store]="store"
      [columns]="columns()"
      [permissions]="PERMISSIONS['purchase-orders']"
      [severityFn]="poSeverity"
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
                  placeholder="Например, ЗП-001"
                  [value]="row['number'] || ''"
                  (valueChange)="row['number'] = $event"
                  [required]="true"
                />
                <app-kp-datepicker
                  label="Дата заказа"
                  name="orderDate"
                  [value]="row['orderDate'] || ''"
                  (valueChange)="row['orderDate'] = $event"
                />
                <app-kp-datepicker
                  label="Дата поставки"
                  name="deliveryDate"
                  [value]="row['deliveryDate'] || ''"
                  (valueChange)="row['deliveryDate'] = $event"
                />
                <app-kp-select
                  label="Статус"
                  name="statusId"
                  placeholder="Выберите статус"
                  [value]="row['statusId'] || 'new'"
                  (valueChange)="row['statusId'] = $event"
                  [options]="statusOptions"
                  [required]="true"
                />
              </div>
            </section>
          </div>
          <div class="form-layout__column">
            <section class="form-section form-section--green">
              <h3 class="form-section__title">
                <i class="pi pi-truck" aria-hidden="true"></i>
                Поставщик
              </h3>
              <div class="form-section__fields">
                <app-kp-select
                  label="Поставщик"
                  name="supplierId"
                  placeholder="Выберите поставщика"
                  [value]="row['supplierId'] || ''"
                  (valueChange)="row['supplierId'] = $event"
                  [options]="supplierOptions()"
                  [required]="true"
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
                  placeholder="Комментарий к закупке"
                  [value]="row['notes'] || ''"
                  (valueChange)="row['notes'] = $event"
                  [rows]="4"
                />
              </div>
            </section>
          </div>
        </div>
      </ng-template>
    </app-kp-crud-page>
  `,
})
export class PurchaseOrdersPageComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;
  readonly poSeverity = poSeverity;
  readonly statusOptions = PO_STATUS_OPTIONS;

  readonly supplierOptions = signal<KpSelectOption[]>([]);

  readonly columns = signal<KpColumn[]>([
    { field: 'number', header: 'Номер', type: 'text', sortable: true, width: '140px' },
    { field: 'supplierId', header: 'Поставщик', type: 'select', sortable: true, options: [] },
    { field: 'orderDate', header: 'Дата заказа', type: 'date', sortable: true, width: '130px' },
    {
      field: 'statusId',
      header: 'Статус',
      type: 'tag',
      sortable: true,
      width: '180px',
      options: PO_STATUS_OPTIONS,
    },
    { field: 'total', header: 'Сумма', type: 'number', sortable: true, width: '120px' },
    { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
  ]);

  readonly store = createPurchaseOrdersStore(inject(DestroyRef));

  private readonly counterpartyOptionsService = inject(CounterpartyOptionsService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.counterpartyOptionsService
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((options) => {
        this.supplierOptions.set(options);
        patchCrudColumnOptions(this.columns, 'supplierId', options);
      });
  }
}
