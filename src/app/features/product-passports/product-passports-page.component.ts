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
import { ProductOptionsService } from '../../shared/services/product-options.service';
import { patchCrudColumnOptions } from '../../shared/services/crud-column-options.util';
import { createProductPassportsStore } from './product-passports.store';
import { PERMISSIONS } from '../../core/permissions';

@Component({
  selector: 'app-product-passports-page',
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
      title="Паспорта изделий"
      entityLabel="паспорта продукта"
      description="Технические паспорта продукции"
      [store]="store"
      [columns]="columns()"
      [permissions]="PERMISSIONS['product-passports']"
      createLabel="Создать паспорт"
      dialogWidth="min(920px, 96vw)"
    >
      <ng-template #form let-row>
        <div class="form-layout form-layout--2col">
          <div class="form-layout__column">
            <section class="form-section form-section--blue">
              <h3 class="form-section__title">
                <i class="pi pi-id-card" aria-hidden="true"></i>
                Основное
              </h3>
              <div class="form-section__fields">
                <app-kp-select
                  label="Продукт"
                  name="productId"
                  placeholder="Выберите продукт"
                  [value]="row['productId'] || ''"
                  (valueChange)="row['productId'] = $event"
                  [options]="productOptions()"
                  [required]="true"
                />
                <app-kp-input
                  label="Наименование"
                  name="name"
                  placeholder="Наименование изделия"
                  [value]="row['name'] || ''"
                  (valueChange)="row['name'] = $event"
                  [required]="true"
                />
                <app-kp-input
                  label="Категория"
                  name="category"
                  placeholder="Категория изделия"
                  [value]="row['category'] || ''"
                  (valueChange)="row['category'] = $event"
                  [required]="true"
                />
                <app-kp-datepicker
                  label="Дата"
                  name="date"
                  [value]="row['date'] || ''"
                  (valueChange)="row['date'] = $event"
                />
              </div>
            </section>
            <section class="form-section form-section--purple">
              <h3 class="form-section__title">
                <i class="pi pi-hashtag" aria-hidden="true"></i>
                Коды и номера
              </h3>
              <div class="form-section__fields">
                <div class="form-row--equal">
                  <app-kp-input-number
                    label="№ паспорта"
                    name="passportNumber"
                    placeholder="Номер"
                    [value]="row['passportNumber'] ?? null"
                    (valueChange)="row['passportNumber'] = $event"
                    [useGrouping]="false"
                    [required]="true"
                  />
                  <app-kp-input-number
                    label="Код продукта"
                    name="productCode"
                    placeholder="Код"
                    [value]="row['productCode'] ?? null"
                    (valueChange)="row['productCode'] = $event"
                    [useGrouping]="false"
                    [required]="true"
                  />
                </div>
                <app-kp-input
                  label="Код гарантии"
                  name="warrantyCode"
                  placeholder="Код гарантийного талона"
                  [value]="row['warrantyCode'] || ''"
                  (valueChange)="row['warrantyCode'] = $event"
                  [required]="true"
                />
                <app-kp-input
                  label="Артикул"
                  name="article"
                  placeholder="Артикул изделия"
                  [value]="row['article'] || ''"
                  (valueChange)="row['article'] = $event"
                />
              </div>
            </section>
          </div>
          <div class="form-layout__column">
            <section class="form-section form-section--green">
              <h3 class="form-section__title">
                <i class="pi pi-arrows-alt" aria-hidden="true"></i>
                Габариты
              </h3>
              <div class="form-section__fields">
                <div class="form-layout form-layout--grid">
                  <app-kp-input-number
                    label="Высота"
                    name="height"
                    placeholder="мм"
                    [value]="row['height'] ?? null"
                    (valueChange)="row['height'] = $event"
                    [useGrouping]="false"
                  />
                  <app-kp-input-number
                    label="Длина"
                    name="length"
                    placeholder="мм"
                    [value]="row['length'] ?? null"
                    (valueChange)="row['length'] = $event"
                    [useGrouping]="false"
                  />
                  <app-kp-input-number
                    label="Ширина"
                    name="width"
                    placeholder="мм"
                    [value]="row['width'] ?? null"
                    (valueChange)="row['width'] = $event"
                    [useGrouping]="false"
                  />
                </div>
                <app-kp-input-number
                  label="Вес (кг)"
                  name="weight"
                  placeholder="Масса в кг"
                  [value]="row['weight'] ?? null"
                  (valueChange)="row['weight'] = $event"
                  [useGrouping]="false"
                />
              </div>
            </section>
            <section class="form-section form-section--amber">
              <h3 class="form-section__title">
                <i class="pi pi-map-marker" aria-hidden="true"></i>
                Установка и описание
              </h3>
              <div class="form-section__fields">
                <app-kp-input
                  label="Объект установки"
                  name="installationSite"
                  placeholder="Место установки"
                  [value]="row['installationSite'] || ''"
                  (valueChange)="row['installationSite'] = $event"
                />
                <app-kp-input
                  label="Поставщик"
                  name="supplier"
                  placeholder="Наименование поставщика"
                  [value]="row['supplier'] || ''"
                  (valueChange)="row['supplier'] = $event"
                />
                <app-kp-textarea
                  label="Описание"
                  name="description"
                  placeholder="Техническое описание изделия"
                  [value]="row['description'] || ''"
                  (valueChange)="row['description'] = $event"
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
export class ProductPassportsPageComponent implements OnInit {
  readonly PERMISSIONS = PERMISSIONS;

  readonly productOptions = signal<KpSelectOption[]>([]);

  readonly columns = signal<KpColumn[]>([
    { field: 'name', header: 'Наименование', type: 'text', sortable: true },
    { field: 'productId', header: 'Продукт', type: 'select', sortable: true, options: [] },
    { field: 'category', header: 'Категория', type: 'text', sortable: true },
    { field: 'passportNumber', header: '№ паспорта', type: 'number', sortable: true, width: '120px' },
    { field: 'date', header: 'Дата', type: 'date', sortable: true, width: '110px' },
    { field: 'installationSite', header: 'Объект', type: 'text', sortable: true },
    { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
  ]);

  readonly store = createProductPassportsStore(inject(DestroyRef));

  private readonly productOptionsService = inject(ProductOptionsService);
  private readonly destroyRef = inject(DestroyRef);

  ngOnInit(): void {
    this.productOptionsService
      .load()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((options) => {
        this.productOptions.set(options);
        patchCrudColumnOptions(this.columns, 'productId', options);
      });
  }
}
