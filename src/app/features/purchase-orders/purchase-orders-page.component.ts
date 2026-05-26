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
      entityLabel="заказа поставщику"
      description="Закупки у поставщиков"
      [store]="store"
      [columns]="columns()"
      [permissions]="PERMISSIONS['purchase-orders']"
      [severityFn]="poSeverity"
      createLabel="Создать заказ"
    >
      <ng-template #form let-row>
        <div class="form-layout">
          <app-kp-input label="Номер" name="number" [value]="row['number'] || ''" (valueChange)="row['number'] = $event" />
          <app-kp-select
            label="Поставщик"
            name="supplierId"
            placeholder="Выберите поставщика"
            [value]="row['supplierId'] || ''"
            (valueChange)="row['supplierId'] = $event"
            [options]="supplierOptions()"
            [required]="true"
          />
          <app-kp-datepicker label="Дата заказа" name="orderDate" [value]="row['orderDate'] || ''" (valueChange)="row['orderDate'] = $event" />
          <app-kp-datepicker label="Дата поставки" name="deliveryDate" [value]="row['deliveryDate'] || ''" (valueChange)="row['deliveryDate'] = $event" />
          <app-kp-select
            label="Статус"
            name="statusId"
            [value]="row['statusId'] || 'new'"
            (valueChange)="row['statusId'] = $event"
            [options]="statusOptions"
          />
          <app-kp-textarea label="Примечание" name="notes" [value]="row['notes'] || ''" (valueChange)="row['notes'] = $event" />
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
