import { Component, input, model, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';

export interface KpSelectOption {
  label: string;
  value: string | number | boolean;
}

@Component({
  selector: 'app-kp-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  template: `
    <div class="kp-select">
      @if (label(); as lbl) {
        <label class="kp-select__label" [attr.for]="name()">
          {{ lbl }}
          @if (required()) { <span class="kp-select__required">*</span> }
        </label>
      }
      <select
        [id]="name()"
        class="kp-select__control"
        [class.kp-select__control--error]="!!error()"
        [ngModel]="value()"
        (ngModelChange)="value.set($event)"
        [disabled]="disabled() || loading()"
        [attr.required]="required() ? '' : null"
      >
        @if (placeholder()) {
          <option value="" disabled [selected]="!value()">{{ placeholder() }}</option>
        }
        @for (opt of options(); track opt.value) {
          <option [value]="opt.value">{{ opt.label }}</option>
        }
      </select>
      @if (error()) {
        <span class="kp-select__error">{{ error() }}</span>
      }
    </div>
  `,
  styleUrl: './kp-select.component.scss',
})
export class KpSelectComponent {
  readonly label = input<string>('');
  readonly name = input<string>('');
  readonly value = model<string | number | boolean>('');
  readonly options = input<KpSelectOption[]>([]);
  readonly placeholder = input<string>('');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly error = input<string>('');
}
