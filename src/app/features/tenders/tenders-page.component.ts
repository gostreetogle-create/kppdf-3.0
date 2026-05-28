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
  KpInputNumberComponent,
  KpDatepickerComponent,
  type KpSelectOption,
  type KpColumn,
} from '../../shared/ui';
import { CounterpartyOptionsService } from '../../shared/services/counterparty-options.service';
import { patchCrudColumnOptions } from '../../shared/services/crud-column-options.util';
import { createTendersStore } from './tenders.store';
import { PERMISSIONS } from '../../core/permissions';
import type { CrudAction } from '../../shared/crud/crud-page.types';

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
      title="Тендеры"
      entityLabel="тендера"
      description="Входящие запросы от компаний"
      [store]="store"
      [columns]="columns()"
      [permissions]="PERMISSIONS.tenders"
      [severityFn]="tenderSeverity"
      [extraRowActions]="extraActions"
      createLabel="Создать тендер"
      dialogWidth="min(920px, 96vw)"
    >
      <ng-template #form let-row>
        <div class="form-layout form-layout--2col">
            <div class="form-layout__column">
              <section class="form-section form-section--blue">
                <h3 class="form-section__title">
                  <i class="pi pi-hashtag" aria-hidden="true"></i>
                  Идентификация
                </h3>
                <div class="form-section__fields">
                  <app-kp-input
                    label="Номер"
                    name="number"
                    placeholder="Например, ТН-001"
                    [value]="row['number'] || ''"
                    (valueChange)="row['number'] = $event"
                    [required]="true"
                  />
                  <app-kp-input
                    label="ID тендера"
                    name="tenderId"
                    placeholder="Внешний идентификатор"
                    [value]="row['tenderId'] || ''"
                    (valueChange)="row['tenderId'] = $event"
                    [required]="true"
                  />
                  <app-kp-datepicker
                    label="Дата"
                    name="date"
                    [value]="row['date'] || ''"
                    (valueChange)="row['date'] = $event"
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

              <section class="form-section form-section--purple">
                <h3 class="form-section__title">
                  <i class="pi pi-building" aria-hidden="true"></i>
                  Заказчик
                </h3>
                <div class="form-section__fields">
                  <app-kp-select
                    label="Компания"
                    name="companyId"
                    placeholder="Выберите компанию"
                    [value]="row['companyId'] || ''"
                    (valueChange)="row['companyId'] = $event"
                    [options]="companyOptions()"
                    [required]="true"
                  />
                  <app-kp-input
                    label="Email"
                    name="email"
                    type="email"
                    placeholder="contact@company.ru"
                    [value]="row['email'] || ''"
                    (valueChange)="row['email'] = $event"
                    [required]="true"
                  />
                </div>
              </section>
            </div>

            <div class="form-layout__column">
              <section class="form-section form-section--green">
                <h3 class="form-section__title">
                  <i class="pi pi-box" aria-hidden="true"></i>
                  Предмет закупки
                </h3>
                <div class="form-section__fields">
                  <app-kp-input
                    label="Тема"
                    name="subject"
                    placeholder="Тема запроса"
                    [value]="row['subject'] || ''"
                    (valueChange)="row['subject'] = $event"
                    [required]="true"
                  />
                  <app-kp-input
                    label="Товар"
                    name="productName"
                    placeholder="Наименование товара"
                    [value]="row['productName'] || ''"
                    (valueChange)="row['productName'] = $event"
                    [required]="true"
                  />
                  <div class="form-row--split">
                    <app-kp-input-number
                      label="Количество"
                      name="quantity"
                      placeholder="Кол-во"
                      [value]="row['quantity'] ?? null"
                      (valueChange)="row['quantity'] = $event"
                      [useGrouping]="false"
                      [required]="true"
                    />
                    <app-kp-input
                      label="Ед. изм."
                      name="unit"
                      placeholder="шт"
                      [value]="row['unit'] || ''"
                      (valueChange)="row['unit'] = $event"
                      [required]="true"
                    />
                  </div>
                  <app-kp-input
                    label="Правовая основа"
                    name="legalBasis"
                    placeholder="44-ФЗ, 223-ФЗ…"
                    [value]="row['legalBasis'] || ''"
                    (valueChange)="row['legalBasis'] = $event"
                  />
                </div>
              </section>

              <section class="form-section form-section--amber">
                <h3 class="form-section__title">
                  <i class="pi pi-file-edit" aria-hidden="true"></i>
                  Условия и требования
                </h3>
                <div class="form-section__fields">
                  <app-kp-textarea
                    label="Условия поставки"
                    name="deliveryTerms"
                    placeholder="Сроки и условия доставки"
                    [value]="row['deliveryTerms'] || ''"
                    (valueChange)="row['deliveryTerms'] = $event"
                    [rows]="3"
                  />
                  <app-kp-textarea
                    label="Требования к отклику"
                    name="responseRequirements"
                    placeholder="Требования к коммерческому предложению"
                    [value]="row['responseRequirements'] || ''"
                    (valueChange)="row['responseRequirements'] = $event"
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
export class TendersPageComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;
  readonly tenderSeverity = tenderSeverity;
  readonly statusOptions = TENDER_STATUS_OPTIONS;

  private readonly router = inject(Router);

  readonly extraActions: CrudAction<Record<string, unknown>>[] = [
    {
      id: 'create-quotation',
      label: 'Создать КП',
      icon: 'pi pi-file-edit',
      severity: 'info',
      permission: PERMISSIONS.quotations.create,
      handler: (row) => {
        const id = row['_id'];
        if (typeof id === 'string' && id) {
          void this.router.navigate(['/quotations/new'], { queryParams: { tenderId: id } });
        }
      },
    },
  ];

  readonly companyOptions = signal<KpSelectOption[]>([]);

  readonly columns = signal<KpColumn[]>([
    { field: 'number', header: 'Номер', type: 'text', sortable: true, width: '118px' },
    { field: 'tenderId', header: 'ID тендера', type: 'text', sortable: true, width: '120px' },
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
