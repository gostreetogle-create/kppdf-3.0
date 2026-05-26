import { Component, input, model, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { InputTextModule } from 'primeng/inputtext';

@Component({
  selector: 'kp-input',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, InputTextModule],
  template: `
    <div class="kp-input">
      @if (label(); as lbl) {
        <label class="kp-input__label" [attr.for]="name()">
          {{ lbl }}
          @if (required()) { <span class="kp-input__required">*</span> }
        </label>
      }
      <input
        [id]="name()"
        pInputText
        [type]="type()"
        [ngModel]="value()"
        (ngModelChange)="valueChange.emit($event)"
        [placeholder]="placeholder()"
        [readonly]="readonly()"
        [disabled]="disabled()"
        [attr.required]="required() ? '' : null"
        [class.kp-input--has-error]="!!error()"
        class="kp-input__control w-full"
        [size]="size()"
      />
      @if (error()) {
        <span class="kp-input__error">{{ error() }}</span>
      }
    </div>
  `,
  styles: [`
    .kp-input {
      display: flex;
      flex-direction: column;
      gap: var(--kp-space-1, 0.25rem);
    }
    .kp-input__label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--kp-text, #1e293b);
    }
    .kp-input__required {
      color: var(--p-red-500, #ef4444);
      margin-left: 0.125rem;
    }
    .kp-input__control.kp-input--has-error {
      border-color: var(--p-red-400, #f87171) !important;
    }
    .kp-input__error {
      font-size: 0.75rem;
      color: var(--p-red-500, #ef4444);
      margin-top: 0.125rem;
    }
  `],
})
export class KpInputComponent {
  readonly label = input<string>('');
  readonly name = input<string>('');
  readonly value = model<string>('');
  readonly type = input<'text' | 'number' | 'email' | 'tel' | 'url'>('text');
  readonly placeholder = input<string>('');
  readonly required = input(false);
  readonly readonly = input(false);
  readonly disabled = input(false);
  readonly error = input<string>('');
  readonly size = input<'small' | 'large'>('small');
}
