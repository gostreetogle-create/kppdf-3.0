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
import { CounterpartyOptionsService } from '../../shared/services/counterparty-options.service';
import { patchCrudColumnOptions } from '../../shared/services/crud-column-options.util';
import { createTendersStore } from './tenders.store';
import { PERMISSIONS } from '../../core/permissions';

const TENDER_STATUS_OPTIONS: KpSelectOption[] = [
  { label: 'Новый', value: 'new' },
  { label: 'В работе', value: 'in_progress' },
  { label: 'КП отправлено', value: 'kp_sent' },
  { label: 'Выигран', value: 'won' },
  { label: 'Проигран', value: 'lost' },
];

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
      entityLabel="запроса"
      description="Входящие запросы от компаний"
      [store]="store"
      [columns]="columns()"
      [permissions]="PERMISSIONS.tenders"
      [severityFn]="tenderSeverity"
      createLabel="Создать запрос"
    >
      <ng-template #form let-row>
        <div class="form-layout">
          <app-kp-input label="Номер" name="number" [value]="row['number'] || ''" (valueChange)="row['number'] = $event" />
          <app-kp-datepicker label="Дата" name="date" [value]="row['date'] || ''" (valueChange)="row['date'] = $event" />
          <app-kp-select
            label="Компания"
            name="companyId"
            placeholder="Выберите компанию"
            [value]="row['companyId'] || ''"
            (valueChange)="row['companyId'] = $event"
            [options]="companyOptions()"
            [required]="true"
          />
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
export class TendersPageComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;
  readonly tenderSeverity = tenderSeverity;
  readonly statusOptions = TENDER_STATUS_OPTIONS;

  readonly companyOptions = signal<KpSelectOption[]>([]);

  readonly columns = signal<KpColumn[]>([
    { field: 'number', header: 'Номер', type: 'text', sortable: true, width: '118px' },
    { field: 'date', header: 'Дата', type: 'date', sortable: true, width: '108px' },
    { field: 'companyId', header: 'Компания', type: 'select', sortable: true, width: '160px', options: [] },
    { field: 'subject', header: 'Тема', type: 'text', sortable: true, maxLines: 2 },
    { field: 'productName', header: 'Товар', type: 'text', sortable: true, width: '140px' },
    { field: 'quantity', header: 'Кол-во', type: 'number', sortable: true, width: '72px' },
    {
      field: 'statusId',
      header: 'Статус',
      type: 'tag',
      sortable: true,
      width: '128px',
      options: TENDER_STATUS_OPTIONS,
    },
    { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '108px' },
  ]);

  readonly store = createTendersStore(inject(DestroyRef));

  private readonly counterpartyOptionsService = inject(CounterpartyOptionsService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.counterpartyOptionsService
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((options) => {
        this.companyOptions.set(options);
        patchCrudColumnOptions(this.columns, 'companyId', options);
      });
  }
}
