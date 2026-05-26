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
import { createTendersStore } from './tenders.store';
import { PERMISSIONS } from '../../core/permissions';

function tenderSeverity(value: unknown): string {
  const map: Record<string, string> = {
    new: 'info',
    in_progress: 'warn',
    kp_sent: 'info',
    won: 'success',
    lost: 'danger',
  };
  return map[String(value)] || 'info';
}

@Component({
  selector: 'app-tenders-page',
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
      title="Запросы"
      description="Входящие запросы от компаний"
      [store]="store"
      [columns]="columns"
      [permissions]="PERMISSIONS.tenders"
      [severityFn]="tenderSeverity"
      createLabel="Создать запрос"
    >
      <ng-template #form let-row>
        <div class="form-layout">
          <app-kp-input label="Номер" name="number" [value]="row['number'] || ''" (valueChange)="row['number'] = $event" />
          <app-kp-datepicker label="Дата" name="date" [value]="row['date'] || ''" (valueChange)="row['date'] = $event" />
          <app-kp-input label="Компания" name="companyId" [value]="row['companyId'] || ''" (valueChange)="row['companyId'] = $event" />
          <app-kp-input label="Email" name="email" type="email" [value]="row['email'] || ''" (valueChange)="row['email'] = $event" />
          <app-kp-input label="Тема" name="subject" [value]="row['subject'] || ''" (valueChange)="row['subject'] = $event" [required]="true" />
          <app-kp-input label="Товар" name="productName" [value]="row['productName'] || ''" (valueChange)="row['productName'] = $event" [required]="true" />
          <app-kp-input-number label="Количество" name="quantity" [value]="row['quantity'] ?? null" (valueChange)="row['quantity'] = $event" />
          <app-kp-input label="Ед. изм." name="unit" [value]="row['unit'] || ''" (valueChange)="row['unit'] = $event" />
          <app-kp-input label="Правовая основа" name="legalBasis" [value]="row['legalBasis'] || ''" (valueChange)="row['legalBasis'] = $event" />
          <app-kp-select
            label="Статус"
            name="statusId"
            [value]="row['statusId'] || 'new'"
            (valueChange)="row['statusId'] = $event"
            [options]="statusOptions"
          />
          <app-kp-textarea label="Условия поставки" name="deliveryTerms" [value]="row['deliveryTerms'] || ''" (valueChange)="row['deliveryTerms'] = $event" [rows]="2" />
          <app-kp-textarea label="Требования к отклику" name="responseRequirements" [value]="row['responseRequirements'] || ''" (valueChange)="row['responseRequirements'] = $event" [rows]="2" />
        </div>
      </ng-template>
    </app-kp-crud-page>
  `,
})
export class TendersPageComponent {
  readonly PERMISSIONS = PERMISSIONS;
  readonly tenderSeverity = tenderSeverity;

  readonly statusOptions: KpSelectOption[] = [
    { label: 'Новый', value: 'new' },
    { label: 'В работе', value: 'in_progress' },
    { label: 'КП отправлено', value: 'kp_sent' },
    { label: 'Выигран', value: 'won' },
    { label: 'Проигран', value: 'lost' },
  ];

  readonly columns: KpColumn[] = [
    { field: 'number', header: 'Номер', type: 'text', sortable: true, width: '120px' },
    { field: 'date', header: 'Дата', type: 'date', sortable: true, width: '110px' },
    { field: 'companyId', header: 'Компания', type: 'text', sortable: true },
    { field: 'subject', header: 'Тема', type: 'text', sortable: true },
    { field: 'productName', header: 'Товар', type: 'text', sortable: true, width: '160px' },
    { field: 'quantity', header: 'Кол-во', type: 'number', sortable: true, width: '80px' },
    { field: 'statusId', header: 'Статус', type: 'tag', sortable: true, width: '130px' },
    { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
  ];

  readonly store = createTendersStore(inject(DestroyRef));
}
