import { Component, inject, DestroyRef, ChangeDetectionStrategy } from '@angular/core';
import { KpCrudPageComponent } from '../../shared/crud/kp-crud-page.component';
import {
  KpInputComponent,
  KpSelectComponent,
  KpInputNumberComponent,
  type KpSelectOption,
  type KpColumn,
} from '../../shared/ui';
import { createAttributeDefinitionsStore } from './attribute-definitions.store';
import { PERMISSIONS } from '../../core/permissions';

const ENTITY_TYPE_OPTIONS: KpSelectOption[] = [
  { label: 'Товар', value: 'product' },
  { label: 'Запрос', value: 'tender' },
  { label: 'Заказ', value: 'order' },
];

const ATTRIBUTE_TYPE_OPTIONS: KpSelectOption[] = [
  { label: 'Строка', value: 'string' },
  { label: 'Текст', value: 'text' },
  { label: 'Число', value: 'number' },
  { label: 'Да/Нет', value: 'boolean' },
  { label: 'Дата', value: 'date' },
  { label: 'Список', value: 'select' },
  { label: 'Мультивыбор', value: 'multiselect' },
];

const YES_NO: KpSelectOption[] = [
  { label: 'Да', value: 'true' },
  { label: 'Нет', value: 'false' },
];

@Component({
  selector: 'app-attribute-definitions-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KpCrudPageComponent,
    KpInputComponent,
    KpSelectComponent,
    KpInputNumberComponent,
  ],
  template: `
    <app-kp-crud-page
      title="Атрибуты (EAV)"
      entityLabel="атрибута"
      description="Определения дополнительных характеристик сущностей"
      [store]="store"
      [columns]="columns"
      [permissions]="PERMISSIONS.attributes"
      createLabel="Создать атрибут"
    >
      <ng-template #form let-row>
        <div class="form-layout">
          <app-kp-select
            label="Тип сущности"
            name="entityType"
            [value]="row['entityType'] || 'product'"
            (valueChange)="row['entityType'] = $event"
            [options]="entityTypeOptions"
            [required]="true"
          />
          <app-kp-input label="Код (name)" name="name" [value]="row['name'] || ''" (valueChange)="row['name'] = $event" [required]="true" />
          <app-kp-input label="Подпись" name="label" [value]="row['label'] || ''" (valueChange)="row['label'] = $event" [required]="true" />
          <app-kp-select
            label="Тип поля"
            name="type"
            [value]="row['type'] || 'string'"
            (valueChange)="row['type'] = $event"
            [options]="attributeTypeOptions"
            [required]="true"
          />
          <app-kp-input label="Единица" name="unit" [value]="row['unit'] || ''" (valueChange)="row['unit'] = $event" />
          <app-kp-input
            label="Варианты (через запятую)"
            name="options"
            [value]="optionsToStr(row['options'])"
            (valueChange)="row['options'] = strToOptions($event)"
          />
          <app-kp-input-number
            label="Порядок"
            name="sortOrder"
            [value]="row['sortOrder'] ?? 0"
            (valueChange)="row['sortOrder'] = $event ?? 0"
          />
          <app-kp-select
            label="Обязательное"
            name="required"
            [value]="boolToStr(row['required'] ?? false)"
            (valueChange)="row['required'] = $event === 'true'"
            [options]="yesNoOptions"
          />
          <app-kp-select
            label="Активен"
            name="isActive"
            [value]="boolToStr(row['isActive'] ?? true)"
            (valueChange)="row['isActive'] = $event === 'true'"
            [options]="yesNoOptions"
          />
        </div>
      </ng-template>
    </app-kp-crud-page>
  `,
})
export class AttributeDefinitionsPageComponent {
  private readonly destroyRef = inject(DestroyRef);
  readonly store = createAttributeDefinitionsStore(this.destroyRef);
  readonly PERMISSIONS = PERMISSIONS;
  readonly entityTypeOptions = ENTITY_TYPE_OPTIONS;
  readonly attributeTypeOptions = ATTRIBUTE_TYPE_OPTIONS;
  readonly yesNoOptions = YES_NO;

  readonly columns: KpColumn[] = [
    { field: 'entityType', header: 'Сущность', type: 'select', options: ENTITY_TYPE_OPTIONS },
    { field: 'name', header: 'Код', type: 'text' },
    { field: 'label', header: 'Подпись', type: 'text' },
    { field: 'type', header: 'Тип', type: 'select', options: ATTRIBUTE_TYPE_OPTIONS },
    { field: 'sortOrder', header: 'Порядок', type: 'number' },
    { field: 'required', header: 'Обязат.', type: 'tag', options: YES_NO },
    { field: 'isActive', header: 'Активен', type: 'tag', options: YES_NO },
  ];

  optionsToStr(options: unknown): string {
    return Array.isArray(options) ? options.join(', ') : '';
  }

  strToOptions(value: string): string[] {
    return value.split(',').map((s) => s.trim()).filter(Boolean);
  }

  boolToStr(value: unknown): string {
    return value === true || value === 'true' ? 'true' : 'false';
  }
}
