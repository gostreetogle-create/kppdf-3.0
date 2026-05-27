import { Component, input, model, computed, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Select } from 'primeng/select';

export interface KpSelectOption {
  label: string;
  value: string | number | boolean;
}

@Component({
  selector: 'app-kp-select',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, Select],
  template: `
    <div class="kp-select">
      @if (label(); as lbl) {
        <label class="kp-select__label" [attr.for]="name()">
          {{ lbl }}
          @if (required()) { <span class="kp-select__required">*</span> }
        </label>
      }
      <p-select
        [inputId]="name()"
        [options]="options()"
        [(ngModel)]="value"
        [placeholder]="placeholder()"
        [disabled]="disabled() || loading()"
        [showClear]="!required()"
        [loading]="loading()"
        appendTo="body"
        [attr.aria-label]="inputAriaLabel() || null"
        optionLabel="label"
        optionValue="value"
        size="small"
        [styleClass]="controlClass()"
      />
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
  readonly value = model<string | number | boolean | null>(null);
  readonly options = input<KpSelectOption[]>([]);
  readonly placeholder = input<string>('Выберите...');
  readonly required = input(false);
  readonly disabled = input(false);
  readonly loading = input(false);
  readonly error = input<string>('');
  readonly ariaLabel = input<string>('');

  readonly inputAriaLabel = computed(() => this.ariaLabel() || this.label() || '');

  readonly controlClass = computed(() => {
    const classes = ['kp-select__control', 'w-full'];
    if (this.error()) {
      classes.push('kp-select__control--error');
    }
    return classes.join(' ');
  });
}
