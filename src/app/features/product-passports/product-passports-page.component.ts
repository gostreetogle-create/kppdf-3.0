import { Component, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';

import { KpCrudPageComponent } from '../../shared/crud/kp-crud-page.component';
import {
  KpInputComponent,
  KpTextareaComponent,
  KpDatepickerComponent,
  type KpColumn,
} from '../../shared/ui';
import { createProductPassportsStore } from './product-passports.store';
import { PERMISSIONS } from '../../core/permissions';

function passportSeverity(value: unknown): string {
  const map: Record<string, string> = {
    active: 'success',
    archived: 'danger',
  };
  return map[String(value)] || 'info';
}

@Component({
  selector: 'app-product-passports-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KpCrudPageComponent,
    KpInputComponent,
    KpTextareaComponent,
    KpDatepickerComponent,
  ],
  template: `
    <app-kp-crud-page
      title="Паспорта изделий"
      entityLabel="паспорта изделия"
      description="Технические паспорта продукции"
      [store]="store"
      [columns]="columns"
      [permissions]="PERMISSIONS['product-passports']"
      [severityFn]="passportSeverity"
      createLabel="Создать паспорт"
    >
      <ng-template #form let-row>
        <div class="form-layout">
          <app-kp-input label="Наименование" name="name" [value]="row['name'] || ''" (valueChange)="row['name'] = $event" [required]="true" />
          <app-kp-input label="Категория" name="category" [value]="row['category'] || ''" (valueChange)="row['category'] = $event" [required]="true" />
          <app-kp-input label="№ паспорта" name="passportNumber" [value]="row['passportNumber'] !== null && row['passportNumber'] !== undefined ? '' + row['passportNumber'] : ''" (valueChange)="row['passportNumber'] = $event" />
          <app-kp-input label="Код гарантии" name="warrantyCode" [value]="row['warrantyCode'] || ''" (valueChange)="row['warrantyCode'] = $event" />
          <app-kp-input label="Артикул" name="article" [value]="row['article'] || ''" (valueChange)="row['article'] = $event" />
          <app-kp-datepicker label="Дата" name="date" [value]="row['date'] || ''" (valueChange)="row['date'] = $event" />
          <div class="form-layout form-layout--grid">
            <app-kp-input label="Высота" name="height" [value]="row['height'] || ''" (valueChange)="row['height'] = $event" />
            <app-kp-input label="Длина" name="length" [value]="row['length'] || ''" (valueChange)="row['length'] = $event" />
            <app-kp-input label="Ширина" name="width" [value]="row['width'] || ''" (valueChange)="row['width'] = $event" />
          </div>
          <app-kp-input label="Вес (кг)" name="weight" [value]="row['weight'] || ''" (valueChange)="row['weight'] = $event" />
          <app-kp-input label="Объект установки" name="installationSite" [value]="row['installationSite'] || ''" (valueChange)="row['installationSite'] = $event" />
          <app-kp-input label="Поставщик" name="supplier" [value]="row['supplier'] || ''" (valueChange)="row['supplier'] = $event" />
          <app-kp-textarea label="Описание" name="description" [value]="row['description'] || ''" (valueChange)="row['description'] = $event" />
        </div>
      </ng-template>
    </app-kp-crud-page>
  `,
})
export class ProductPassportsPageComponent {
  readonly PERMISSIONS = PERMISSIONS;
  readonly passportSeverity = passportSeverity;

  readonly columns: KpColumn[] = [
    { field: 'name', header: 'Наименование', type: 'text', sortable: true },
    { field: 'category', header: 'Категория', type: 'text', sortable: true },
    { field: 'passportNumber', header: '№ паспорта', type: 'number', sortable: true, width: '120px' },
    { field: 'date', header: 'Дата', type: 'date', sortable: true, width: '110px' },
    { field: 'installationSite', header: 'Объект', type: 'text', sortable: true },
    { field: 'createdAt', header: 'Создан', type: 'date', sortable: true, width: '120px' },
  ];

  readonly store = createProductPassportsStore(inject(DestroyRef));
}
