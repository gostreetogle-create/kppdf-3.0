import { Component, input, model, ChangeDetectionStrategy, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePickerModule } from 'primeng/datepicker';

@Component({
  selector: 'app-kp-datepicker',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DatePickerModule],
  template: `
    <div class="kp-datepicker">
      @if (label(); as lbl) {
        <label class="kp-datepicker__label" [attr.for]="name()">
          {{ lbl }}
          @if (required()) { <span class="kp-datepicker__required">*</span> }
        </label>
      }
      <p-datepicker
        [inputId]="name()"
        [ngModel]="dateValue()"
        (ngModelChange)="onDateChange($event)"
        [disabled]="disabled()"
        [readonlyInput]="readonly()"
        dateFormat="dd.mm.yy"
        [showIcon]="true"
        iconDisplay="input"
        class="kp-datepicker__control w-full"
        size="small"
      />
      @if (error()) {
        <span class="kp-datepicker__error">{{ error() }}</span>
      }
    </div>
  `,
  styleUrl: './kp-datepicker.component.scss',
})
export class KpDatepickerComponent {
  readonly label = input<string>('');
  readonly name = input<string>('');
  /** ISO date string (YYYY-MM-DD) or empty */
  readonly value = model<string>('');
  readonly required = input(false);
  readonly readonly = input(false);
  readonly disabled = input(false);
  readonly error = input<string>('');

  readonly dateValue = computed(() => {
    const v = this.value();
    if (!v) return null;
    const d = new Date(v);
    return Number.isNaN(d.getTime()) ? null : d;
  });

  onDateChange(date: Date | null): void {
    if (!date) {
      this.value.set('');
      return;
    }
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    this.value.set(`${y}-${m}-${d}`);
  }
}
