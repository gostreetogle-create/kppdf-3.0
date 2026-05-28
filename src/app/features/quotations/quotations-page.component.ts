import {
  Component,
  inject,
  DestroyRef,
  OnInit,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { Router } from '@angular/router';
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
import { TenderOptionsService } from '../../shared/services/tender-options.service';
import { patchCrudColumnOptions } from '../../shared/services/crud-column-options.util';
import { createQuotationsStore } from './quotations.store';
import { PERMISSIONS } from '../../core/permissions';
import type { CrudAction } from '../../shared/crud/crud-page.types';

const QUOTATION_STATUS_OPTIONS: KpSelectOption[] = [
  { label: 'Черновик', value: 'draft' },
  { label: 'Отправлено', value: 'sent' },
  { label: 'Принято', value: 'accepted' },
  { label: 'Подтверждено', value: 'confirmed' },
  { label: 'Отклонено', value: 'rejected' },
  { label: 'Просрочено', value: 'expired' },
];

function quotationSeverity(value: unknown): string {
  const map: Record<string, string> = {
    draft: 'warn',
    sent: 'info',
    accepted: 'success',
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
      entityLabel="коммерческого предложения"
      description="Исходящие КП контрагентам"
      [store]="store"
      [columns]="columns()"
      [permissions]="PERMISSIONS.quotations"
      [severityFn]="quotationSeverity"
      createLabel="Создать КП"
      createRoute="/quotations/new"
      [extraRowActions]="rowActions"
      dialogWidth="min(920px, 96vw)"
    >
      <ng-template #form let-row>
        <div class="form-layout form-layout--2col">
          <div class="form-layout__column">
            <section class="form-section form-section--blue">
              <h3 class="form-section__title">
                <i class="pi pi-file-edit" aria-hidden="true"></i>
                Документ
              </h3>
              <div class="form-section__fields">
                <app-kp-input
                  label="Номер"
                  name="number"
                  placeholder="Например, КП-001"
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
                  label="Действительно до"
                  name="validUntil"
                  [value]="row['validUntil'] || ''"
                  (valueChange)="row['validUntil'] = $event"
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
                <app-kp-select
                  label="Тендер"
                  name="tenderId"
                  placeholder="Связанный тендер"
                  [value]="row['tenderId'] || ''"
                  (valueChange)="row['tenderId'] = $event"
                  [options]="tenderOptions()"
                />
              </div>
            </section>
          </div>
          <div class="form-layout__column">
            <section class="form-section form-section--purple">
              <h3 class="form-section__title">
                <i class="pi pi-building" aria-hidden="true"></i>
                Контрагент
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
              </div>
            </section>
            <section class="form-section form-section--amber">
              <h3 class="form-section__title">
                <i class="pi pi-comment" aria-hidden="true"></i>
                Условия
              </h3>
              <div class="form-section__fields">
                <app-kp-textarea
                  label="Примечание"
                  name="notes"
                  placeholder="Условия и комментарии"
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
export class QuotationsPageComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;
  readonly quotationSeverity = quotationSeverity;
  readonly statusOptions = QUOTATION_STATUS_OPTIONS;

  private readonly router = inject(Router);

  readonly rowActions: CrudAction<Record<string, unknown>>[] = [
    {
      id: 'compose',
      label: 'Оформить документ',
      icon: 'pi pi-file-edit',
      severity: 'secondary',
      permission: PERMISSIONS.quotations.edit,
      handler: (row) => {
        const id = row['_id'];
        if (typeof id === 'string' && id) {
          void this.router.navigate(['/quotations', id]);
        }
      },
    },
  ];

  readonly counterpartyOptions = signal<KpSelectOption[]>([]);
  readonly tenderOptions = signal<KpSelectOption[]>([]);

  readonly columns = signal<KpColumn[]>([
    { field: 'number', header: 'Номер', type: 'text', sortable: true, width: '140px' },
    { field: 'tenderId', header: 'Тендер', type: 'select', sortable: true, width: '160px', options: [] },
    {
      field: 'counterpartyId',
      header: 'Контрагент',
      type: 'select',
      sortable: true,
      options: [],
    },
    { field: 'date', header: 'Дата', type: 'date', sortable: true, width: '120px' },
    {
      field: 'statusId',
      header: 'Статус',
      type: 'tag',
      sortable: true,
      width: '130px',
      options: QUOTATION_STATUS_OPTIONS,
    },
    { field: 'total', header: 'Сумма', type: 'number', sortable: true, width: '120px' },
    { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
  ]);

  readonly store = createQuotationsStore(inject(DestroyRef));

  private readonly counterpartyOptionsService = inject(CounterpartyOptionsService);
  private readonly tenderOptionsService = inject(TenderOptionsService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.counterpartyOptionsService
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((options) => {
        this.counterpartyOptions.set(options);
        patchCrudColumnOptions(this.columns, 'counterpartyId', options);
      });

    this.tenderOptionsService
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((options) => {
        this.tenderOptions.set(options);
        patchCrudColumnOptions(this.columns, 'tenderId', options);
      });
  }
}
