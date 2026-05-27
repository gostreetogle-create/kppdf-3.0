import { Component, input, ChangeDetectionStrategy } from '@angular/core';
import {
  KpInputComponent,
  KpSelectComponent,
  KpTextareaComponent,
  KpInputNumberComponent,
  KpDatepickerComponent,
  type KpSelectOption,
} from '../../shared/ui';
import type { ColumnDef, ColumnRef } from './modules.config';

@Component({
  selector: 'app-module-dynamic-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    KpInputComponent,
    KpSelectComponent,
    KpTextareaComponent,
    KpInputNumberComponent,
    KpDatepickerComponent,
  ],
  template: `
    <div class="form-layout">
      @for (col of columns(); track col.field) {
        @if (col.ref) {
          <app-kp-select
            [label]="col.header"
            [name]="col.field"
            [value]="toStr(row()[col.field])"
            (valueChange)="row()[col.field] = $event"
            [options]="refOptions()[col.ref] || []"
            [placeholder]="refPlaceholder(col)"
            [loading]="!refOptionsReady()"
            [required]="col.required || false"
          />
        } @else if (col.type === 'text') {
          <app-kp-input
            [label]="col.header"
            [name]="col.field"
            [placeholder]="textPlaceholder(col)"
            [value]="toStr(row()[col.field])"
            (valueChange)="row()[col.field] = $event"
            [required]="col.required || false"
            [readonly]="col.readonly || false"
          />
        } @else if (col.type === 'number') {
          <app-kp-input-number
            [label]="col.header"
            [name]="col.field"
            [placeholder]="numberPlaceholder(col)"
            [value]="toNum(row()[col.field])"
            (valueChange)="row()[col.field] = $event"
            [required]="col.required || false"
          />
        } @else if (col.type === 'textarea') {
          <app-kp-textarea
            [label]="col.header"
            [name]="col.field"
            [placeholder]="textPlaceholder(col)"
            [value]="toStr(row()[col.field])"
            (valueChange)="row()[col.field] = $event"
            [required]="col.required || false"
          />
        } @else if (col.options && col.options.length > 0) {
          <app-kp-select
            [label]="col.header"
            [name]="col.field"
            [placeholder]="selectPlaceholder(col)"
            [value]="toStr(row()[col.field])"
            (valueChange)="row()[col.field] = $event"
            [options]="col.options"
            [required]="col.required || false"
          />
        } @else if (col.type === 'boolean') {
          <app-kp-select
            [label]="col.header"
            [name]="col.field"
            placeholder="Выберите"
            [value]="toStr(row()[col.field])"
            (valueChange)="row()[col.field] = $event === 'true'"
            [options]="booleanSelectOptions"
            [required]="col.required || false"
          />
        } @else if (col.type === 'date') {
          <app-kp-datepicker
            [label]="col.header"
            [name]="col.field"
            [value]="formatDateValue(row()[col.field])"
            (valueChange)="row()[col.field] = $event"
            [required]="col.required || false"
          />
        }
      }
    </div>
  `,
})
export class ModuleDynamicFormComponent {
  readonly columns = input.required<ColumnDef[]>();
  readonly row = input.required<Record<string, unknown>>();
  readonly refOptions = input.required<Record<ColumnRef, KpSelectOption[]>>();
  readonly refOptionsReady = input(false);

  readonly booleanSelectOptions: KpSelectOption[] = [
    { label: 'Да', value: 'true' },
    { label: 'Нет', value: 'false' },
  ];

  toStr(value: unknown): string {
    return String(value ?? '');
  }

  toNum(value: unknown): number | null {
    if (value == null || value === '') return null;
    return Number(value);
  }

  formatDateValue(value: unknown): string {
    if (!value) return '';
    if (typeof value === 'string') return value.slice(0, 10);
    if (value instanceof Date) {
      const y = value.getFullYear();
      const m = String(value.getMonth() + 1).padStart(2, '0');
      const d = String(value.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return String(value);
  }

  refPlaceholder(col: ColumnDef): string {
    if (!col.ref) return 'Выберите...';
    if (!this.refOptionsReady()) return 'Загрузка справочника…';
    const opts = this.refOptions()[col.ref];
    if (!opts?.length) return 'Нет записей в справочнике';
    return `Выберите ${col.header.toLowerCase()}`;
  }

  textPlaceholder(col: ColumnDef): string {
    return `Введите ${col.header.toLowerCase()}`;
  }

  numberPlaceholder(_col: ColumnDef): string {
    return `0`;
  }

  selectPlaceholder(col: ColumnDef): string {
    return `Выберите ${col.header.toLowerCase()}`;
  }
}
