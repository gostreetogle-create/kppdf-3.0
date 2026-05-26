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
import { createQuotationsStore } from './quotations.store';
import { PERMISSIONS } from '../../core/permissions';

function quotationSeverity(value: unknown): string {
  const map: Record<string, string> = {
    draft: 'warn',
    sent: 'info',
    confirmed: 'success',
    rejected: 'danger',
    expired: 'secondary',
  };
  return map[String(value)] || 'info';
}

@Component({
  selector: 'app-quotations-page',
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
      title="Коммерческие предложения"
      description="Исходящие КП контрагентам"
      [store]="store"
      [columns]="columns"
      [permissions]="PERMISSIONS.quotations"
      [severityFn]="quotationSeverity"
      createLabel="Создать КП"
    >
      <ng-template #form let-row>
        <div class="form-layout">
          <app-kp-input label="Номер" name="number" [value]="row['number'] || ''" (valueChange)="row['number'] = $event" />
          <app-kp-input
            label="Контрагент"
            name="counterpartyId"
            [value]="row['counterpartyId'] || ''"
            (valueChange)="row['counterpartyId'] = $event"
            [required]="true"
          />
          <app-kp-datepicker label="Дата" name="date" [value]="row['date'] || ''" (valueChange)="row['date'] = $event" />
          <app-kp-datepicker
            label="Действительно до"
            name="validUntil"
            [value]="row['validUntil'] || ''"
            (valueChange)="row['validUntil'] = $event"
          />
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
export class QuotationsPageComponent {
  readonly PERMISSIONS = PERMISSIONS;
  readonly quotationSeverity = quotationSeverity;

  readonly statusOptions: KpSelectOption[] = [
    { label: 'Черновик', value: 'draft' },
    { label: 'Отправлено', value: 'sent' },
    { label: 'Подтверждено', value: 'confirmed' },
    { label: 'Отклонено', value: 'rejected' },
    { label: 'Просрочено', value: 'expired' },
  ];

  readonly columns: KpColumn[] = [
    { field: 'number', header: 'Номер', type: 'text', sortable: true, width: '140px' },
    { field: 'counterpartyId', header: 'Контрагент', type: 'text', sortable: true },
    { field: 'date', header: 'Дата', type: 'date', sortable: true, width: '120px' },
    { field: 'statusId', header: 'Статус', type: 'tag', sortable: true, width: '130px' },
    { field: 'total', header: 'Сумма', type: 'number', sortable: true, width: '120px' },
    { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
  ];

  readonly store = createQuotationsStore(inject(DestroyRef));
}
